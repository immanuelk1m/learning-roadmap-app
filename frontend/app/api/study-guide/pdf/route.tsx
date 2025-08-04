import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import ReactPDF from '@react-pdf/renderer'
import StudyGuidePDF from '@/components/pdf/StudyGuidePDF'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { documentId, userId } = await request.json()

    if (!documentId || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Get study guide from database
    const { data: studyGuide, error: fetchError } = await supabase
      .from('study_guides')
      .select('*')
      .eq('user_id', userId)
      .eq('document_id', documentId)
      .single()

    if (fetchError || !studyGuide) {
      return NextResponse.json(
        { error: 'Study guide not found' },
        { status: 404 }
      )
    }

    // Get document information
    const { data: document } = await supabase
      .from('documents')
      .select('title')
      .eq('id', documentId)
      .single()

    // Get knowledge nodes for the document
    const { data: knowledgeNodes, error: nodesError } = await supabase
      .from('knowledge_nodes')
      .select('*')
      .eq('document_id', documentId)
      .order('level')
      .order('position')

    if (nodesError || !knowledgeNodes) {
      return NextResponse.json(
        { error: 'Knowledge nodes not found' },
        { status: 404 }
      )
    }

    // Get user's knowledge status
    const { data: userStatus } = await supabase
      .from('user_knowledge_status')
      .select('*')
      .eq('user_id', userId)
      .in('node_id', knowledgeNodes.map(n => n.id))

    // Create a map of node statuses for easy lookup
    const statusMap = new Map(userStatus?.map(s => [s.node_id, s]) || [])

    // Generate PDF
    const pdfStream = await ReactPDF.renderToStream(
      <StudyGuidePDF 
        studyGuide={studyGuide}
        documentName={document?.title || 'Study Guide'}
        knowledgeNodes={knowledgeNodes}
        userStatusMap={statusMap}
      />
    )

    // Convert stream to buffer
    const chunks: any[] = []
    for await (const chunk of pdfStream) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)

    // Return PDF as response
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="study-guide-${documentId}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}