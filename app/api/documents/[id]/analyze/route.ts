import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { geminiStructuredModel } from '@/lib/gemini/client'
import { KNOWLEDGE_TREE_PROMPT } from '@/lib/gemini/prompts'
import { KnowledgeTreeResponse, KnowledgeNode } from '@/lib/gemini/schemas'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    // Use fixed user ID
    const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

    // Get document info
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('user_id', FIXED_USER_ID)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Update status to processing
    await supabase
      .from('documents')
      .update({ status: 'processing' })
      .eq('id', id)

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
      const base64Data = await fileData.arrayBuffer().then((buffer) =>
        Buffer.from(buffer).toString('base64')
      )

      // Analyze with Gemini using structured output
      const result = await geminiStructuredModel.generateContent([
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: base64Data,
          },
        },
        KNOWLEDGE_TREE_PROMPT,
      ])

      const response = result.response.text()
      const knowledgeTree: KnowledgeTreeResponse = JSON.parse(response)

      // Save knowledge nodes to database
      const saveNodes = async (
        nodes: KnowledgeNode[],
        parentId: string | null = null
      ) => {
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i]
          const { data: savedNode } = await supabase
            .from('knowledge_nodes')
            .insert({
              document_id: id,
              parent_id: parentId,
              name: node.name,
              description: node.description,
              level: node.level,
              position: i,
              prerequisites: node.prerequisites,
            })
            .select()
            .single()

          if (savedNode && node.children.length > 0) {
            await saveNodes(node.children, savedNode.id)
          }
        }
      }

      await saveNodes(knowledgeTree.nodes)

      // Update document status
      await supabase
        .from('documents')
        .update({ status: 'completed' })
        .eq('id', id)

      return NextResponse.json({ success: true })
    } catch (error: any) {
      console.error('Analysis error:', error)
      
      // Update status to failed
      await supabase
        .from('documents')
        .update({ status: 'failed' })
        .eq('id', id)

      return NextResponse.json(
        { error: 'Analysis failed', details: error.message },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}