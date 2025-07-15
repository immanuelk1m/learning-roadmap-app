import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { geminiQuizModel } from '@/lib/gemini/client'
import { QUIZ_GENERATION_PROMPT } from '@/lib/gemini/prompts'
import { QuizResponse } from '@/lib/gemini/schemas'

export async function POST(request: NextRequest) {
  try {
    const { documentId, nodeIds } = await request.json()
    
    const supabase = await createClient()
    
    // Use fixed user ID
    const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

    // Get document
    const { data: document } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', FIXED_USER_ID)
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
      .eq('user_id', FIXED_USER_ID)
      .in('node_id', nodeIds)
      .in('status', ['unknown', 'unclear'])

    const weakNodes = nodes?.filter(node => 
      userStatus?.some(status => status.node_id === node.id)
    ) || []

    // Get file content from storage
    const { data: fileData } = await supabase.storage
      .from('pdf-documents')
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

## 학습자 분석 정보

**대상 문서**: ${document.title}

**학습자가 특히 어려워하는 개념들 (${weakNodes.length}개):**
${weakNodes.map((node, index) => `
${index + 1}. **${node.name}**
   - 설명: ${node.description}
   - 선수 지식: ${node.prerequisites?.length > 0 ? node.prerequisites.join(', ') : '없음'}
   - 난이도 수준: ${node.level === 0 ? '기초' : node.level === 1 ? '중급' : '고급'}`).join('\n')}

## 문제 생성 지침

1. **집중 영역**: 위에 나열된 어려워하는 개념들을 중점적으로 다루세요
2. **난이도 배분**: 
   - 해당 개념의 기초 이해를 확인하는 쉬운 문제 (1-2개)
   - 개념 적용 능력을 평가하는 중간 난이도 문제 (2-3개)
   - 심화 이해를 요구하는 어려운 문제 (1-2개)
3. **PDF 근거**: 모든 문제는 반드시 PDF 내용에 직접적으로 근거해야 합니다
4. **학습 효과**: 문제를 통해 개념을 더 잘 이해할 수 있도록 구성하세요

**중요**: 모든 문제, 선택지, 해설은 한국어로 작성하고, 학습자의 이해를 돕는 친절한 설명을 포함하세요.
`

    const result = await geminiQuizModel.generateContent({
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
              text: prompt,
            },
          ],
        },
      ],
    })

    const response = result.text || ''
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