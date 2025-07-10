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
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get document info
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
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
      // Get file from storage
      const { data: fileData } = await supabase.storage
        .from('documents')
        .download(document.file_path)

      if (!fileData) {
        throw new Error('Failed to download file')
      }

      // Convert to base64 for Gemini
      const base64Data = await fileData.arrayBuffer().then((buffer) =>
        Buffer.from(buffer).toString('base64')
      )

      // Analyze with Gemini
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