import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { geminiKnowledgeTreeModel } from '@/lib/gemini/client'
import { KNOWLEDGE_TREE_PROMPT } from '@/lib/gemini/prompts'
import { KnowledgeTreeResponse, KnowledgeNode } from '@/lib/gemini/schemas'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('\n=== Document Analysis API Started ===')
  console.log(`Timestamp: ${new Date().toISOString()}`)
  
  try {
    const { id } = await params
    console.log(`Document ID: ${id}`)
    
    const supabase = await createClient()
    
    // Use fixed user ID
    const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

    // Get document info
    console.log('Fetching document from database...')
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('user_id', FIXED_USER_ID)
      .single()

    if (docError) {
      console.error('Database error:', docError)
      return NextResponse.json({ error: 'Document not found', details: docError }, { status: 404 })
    }
    
    if (!document) {
      console.error('Document not found in database')
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Update status to processing
    console.log('Updating document status to processing...')
    const { error: updateError } = await supabase
      .from('documents')
      .update({ status: 'processing' })
      .eq('id', id)
    
    if (updateError) {
      console.error('Failed to update status:', updateError)
    }

    try {
      // Debug: Log document info
      console.log('Document info:', {
        id: document.id,
        title: document.title,
        file_path: document.file_path,
        status: document.status
      })

      // Check if file exists in storage
      const { data: fileList, error: listError } = await supabase.storage
        .from('pdf-documents')
        .list(document.file_path.split('/').slice(0, -1).join('/'))

      if (listError) {
        console.error('Storage list error:', listError)
      } else {
        console.log('Files in directory:', fileList?.map(f => f.name))
      }

      // Get file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('pdf-documents')
        .download(document.file_path)

      if (downloadError) {
        console.error('Storage download error:', downloadError)
        console.error('Full error details:', JSON.stringify(downloadError, null, 2))
        throw new Error(`Failed to download file: ${downloadError.message}`)
      }

      if (!fileData) {
        throw new Error('Failed to download file: No data received')
      }

      console.log('File downloaded successfully, size:', fileData.size)

      // Convert to base64 for Gemini
      console.log('Converting PDF to base64...')
      const base64Data = await fileData.arrayBuffer().then((buffer) =>
        Buffer.from(buffer).toString('base64')
      )
      console.log(`Base64 data size: ${base64Data.length} characters`)

      // Analyze with Gemini using structured output
      console.log('Sending to Gemini API for analysis...')
      console.log(`Using model: gemini-2.5-flash`)
      const startTime = Date.now()
      
      const result = await geminiKnowledgeTreeModel.generateContent({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: base64Data,
                },
              },
              {
                text: KNOWLEDGE_TREE_PROMPT,
              },
            ],
          },
        ],
      })

      const endTime = Date.now()
      console.log(`Gemini API response time: ${endTime - startTime}ms`)
      
      const response = result.text || ''
      console.log('Gemini response received:')
      console.log(`Response length: ${response.length} characters`)
      console.log('First 500 characters:', response.substring(0, 500))
      
      if (!response) {
        console.error('Empty response from Gemini API')
        throw new Error('Empty response from AI')
      }
      
      let knowledgeTree: KnowledgeTreeResponse
      try {
        console.log('Parsing JSON response...')
        knowledgeTree = JSON.parse(response)
        console.log('Successfully parsed knowledge tree')
        console.log(`Number of root nodes: ${knowledgeTree.nodes?.length || 0}`)
      } catch (parseError: any) {
        console.error('JSON parse error:', parseError)
        console.error('Raw response that failed to parse:', response)
        throw new Error(`Invalid response format from AI: ${parseError.message}`)
      }

      // Save flat knowledge nodes to database
      const saveFlatNodes = async (nodes: any[]) => {
        console.log(`Saving ${nodes?.length || 0} nodes in flat structure`)
        
        if (!nodes || !Array.isArray(nodes)) {
          console.warn('Invalid nodes array:', nodes)
          return
        }

        // Create a mapping of temporary IDs to actual database IDs
        const idMapping: Record<string, string> = {}
        
        // First pass: Save all nodes and build ID mapping
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i]
          
          // Validate node structure
          if (!node || typeof node !== 'object') {
            console.warn('Invalid node at index', i, ':', node)
            continue
          }
          
          // Prepare node data
          const nodeData = {
            document_id: id,
            parent_id: null, // Will be updated in second pass
            name: node.name || 'Untitled Node',
            description: node.description || '',
            level: node.level || 0,
            position: i,
            prerequisites: node.prerequisites || [],
          }
          
          console.log(`Saving node: "${nodeData.name}" (level ${nodeData.level})`)
          
          try {
            const { data: savedNode, error: insertError } = await supabase
              .from('knowledge_nodes')
              .insert(nodeData)
              .select()
              .single()
            
            if (insertError) {
              console.error(`Failed to insert node "${nodeData.name}":`, insertError)
              continue
            }

            console.log(`Successfully saved node with ID: ${savedNode.id}`)
            
            // Map temporary ID to actual database ID
            if (node.id && savedNode.id) {
              idMapping[node.id] = savedNode.id
            }
          } catch (nodeError: any) {
            console.error(`Error saving node "${nodeData.name}":`, nodeError.message)
          }
        }
        
        // Second pass: Update parent_id references
        console.log('Updating parent-child relationships...')
        for (const node of nodes) {
          if (node.parent_id && node.id && idMapping[node.id]) {
            const actualNodeId = idMapping[node.id]
            const actualParentId = idMapping[node.parent_id]
            
            if (actualParentId) {
              const { error: updateError } = await supabase
                .from('knowledge_nodes')
                .update({ parent_id: actualParentId })
                .eq('id', actualNodeId)
              
              if (updateError) {
                console.error(`Failed to update parent_id for node ${actualNodeId}:`, updateError)
              } else {
                console.log(`Updated parent_id for node ${actualNodeId} to ${actualParentId}`)
              }
            }
          }
        }
      }

      // Ensure knowledgeTree.nodes exists and is an array
      if (!knowledgeTree.nodes || !Array.isArray(knowledgeTree.nodes)) {
        console.error('Invalid knowledge tree structure:', knowledgeTree)
        throw new Error('Invalid knowledge tree structure: nodes array is missing or invalid')
      }
      
      console.log('Saving knowledge nodes to database...')
      await saveFlatNodes(knowledgeTree.nodes)
      console.log('Knowledge nodes saved successfully')

      // Update document status
      console.log('Updating document status to completed...')
      const { error: completeError } = await supabase
        .from('documents')
        .update({ status: 'completed' })
        .eq('id', id)
      
      if (completeError) {
        console.error('Failed to update status to completed:', completeError)
      }

      console.log('=== Document Analysis Completed Successfully ===')
      return NextResponse.json({ success: true })
    } catch (error: any) {
      console.error('=== Analysis Failed ===')
      console.error('Error type:', error.constructor.name)
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
      
      // Update status to failed
      console.log('Updating document status to failed...')
      const { error: failError } = await supabase
        .from('documents')
        .update({ status: 'failed' })
        .eq('id', id)
      
      if (failError) {
        console.error('Failed to update status to failed:', failError)
      }

      return NextResponse.json(
        { error: 'Analysis failed', details: error.message },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('=== API Error (Outer catch) ===')
    console.error('Error type:', error.constructor.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}