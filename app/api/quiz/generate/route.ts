import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { geminiStructuredModel } from '@/lib/gemini/client'
import { QUIZ_GENERATION_PROMPT } from '@/lib/gemini/prompts'
import { QuizResponse } from '@/lib/gemini/schemas'

export async function POST(request: NextRequest) {
  try {
    const { documentId, nodeIds } = await request.json()
    
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get document
    const { data: document } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Get nodes info
    const { data: nodes } = await supabase
      .from('knowledge_nodes')
      .select('*')
      .in('id', nodeIds)

    // Get user's weak points
    const { data: userStatus } = await supabase
      .from('user_knowledge_status')
      .select('*')
      .eq('user_id', user.id)
      .in('node_id', nodeIds)
      .in('status', ['unknown', 'unclear'])

    const weakNodes = nodes?.filter(node => 
      userStatus?.some(status => status.node_id === node.id)
    ) || []

    // Get file content from storage
    const { data: fileData } = await supabase.storage
      .from('documents')
      .download(document.file_path)

    if (!fileData) {
      throw new Error('Failed to download file')
    }

    // Convert to base64
    const base64Data = await fileData.arrayBuffer().then((buffer) =>
      Buffer.from(buffer).toString('base64')
    )

    // Generate quiz with Gemini
    const prompt = `
${QUIZ_GENERATION_PROMPT}

사용자가 특히 어려워하는 개념들:
${weakNodes.map(node => `- ${node.name}: ${node.description}`).join('\n')}

이 개념들을 중심으로 문제를 생성하되, PDF 내용에 근거해야 합니다.
`

    const result = await geminiStructuredModel.generateContent([
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: base64Data,
        },
      },
      prompt,
    ])

    const response = result.response.text()
    const quizData: QuizResponse = JSON.parse(response)

    // Save quiz items to database
    const quizItems = await Promise.all(
      quizData.questions.map(async (question) => {
        const targetNode = weakNodes.find(node => 
          question.source_quote.toLowerCase().includes(node.name.toLowerCase())
        )

        const { data } = await supabase
          .from('quiz_items')
          .insert({
            document_id: documentId,
            node_id: targetNode?.id || null,
            question: question.question,
            options: question.options,
            correct_answer: question.correct_answer,
            explanation: question.explanation,
            source_quote: question.source_quote,
            difficulty: question.difficulty,
          })
          .select()
          .single()

        return data
      })
    )

    return NextResponse.json({ questions: quizItems })
  } catch (error: any) {
    console.error('Quiz generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate quiz', details: error.message },
      { status: 500 }
    )
  }
}