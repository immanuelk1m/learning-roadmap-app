import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { geminiExtendedQuizModel } from '@/lib/gemini/client'
import { EXTENDED_QUIZ_GENERATION_PROMPT } from '@/lib/gemini/prompts'
import { ExtendedQuizResponse } from '@/lib/gemini/schemas'
import { parseGeminiResponse, validateResponseStructure } from '@/lib/gemini/utils'

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

    // Get user's knowledge status
    const { data: userStatus } = await supabase
      .from('user_knowledge_status')
      .select('*')
      .eq('user_id', FIXED_USER_ID)
      .in('node_id', nodeIds)

    // Categorize nodes based on understanding level
    const weakNodes = nodes?.filter(node => {
      const status = userStatus?.find(s => s.node_id === node.id)
      return !status || status.understanding_level < 50
    }) || []

    const strongNodes = nodes?.filter(node => {
      const status = userStatus?.find(s => s.node_id === node.id)
      return status && status.understanding_level >= 50
    }) || []

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

    // Generate extended quiz with Gemini
    const prompt = `
${EXTENDED_QUIZ_GENERATION_PROMPT}

## 학습자 분석 정보

**대상 문서**: ${document.title}

**학습자가 어려워하는 개념들 (${weakNodes.length}개):**
${weakNodes.map((node, index) => `
${index + 1}. **${node.name}** (ID: ${node.id})
   - 설명: ${node.description}
   - 선수 지식: ${node.prerequisites?.length > 0 ? node.prerequisites.join(', ') : '없음'}
   - 난이도 수준: ${node.level === 0 ? '기초' : node.level === 1 ? '중급' : '고급'}`).join('\n')}

**학습자가 이미 알고 있는 개념들 (${strongNodes.length}개):**
${strongNodes.map((node, index) => `
${index + 1}. **${node.name}**
   - 설명: ${node.description}`).join('\n')}

## 문제 생성 지침

1. **집중 영역**: 어려워하는 개념들을 중점적으로 다루되, 알고 있는 개념과 연결하여 설명
2. **문제 유형 분배**: 
   - 쉬운 문제: 참/거짓, 빈칸 채우기 위주
   - 중간 문제: 객관식, 단답형 위주
   - 어려운 문제: 단답형, 짝짓기 위주
3. **node_id 포함**: 각 문제에 관련된 지식 노드 ID 반드시 포함
4. **PDF 근거**: 모든 문제는 반드시 PDF 내용에 직접적으로 근거
5. **다양성**: 8개 문제에 최소 4가지 이상의 문제 유형 포함

**중요**: 모든 내용은 한국어로 작성하고, 학습자의 현재 수준을 고려한 맞춤형 문제를 생성하세요.
`

    const result = await geminiExtendedQuizModel.generateContent({
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
    
    if (!response) {
      throw new Error('Empty response from Gemini API')
    }
    
    console.log('Gemini response preview:', response.substring(0, 500))
    
    const quizData = parseGeminiResponse<ExtendedQuizResponse>(
      response,
      { documentId, responseType: 'extended_quiz_generation' }
    )
    
    validateResponseStructure(
      quizData,
      ['questions'],
      { documentId, responseType: 'extended_quiz_generation' }
    )
    
    console.log('Quiz data question types:', quizData.questions?.map((q: any) => ({
      type: q.type,
      question: q.question.substring(0, 50) + '...'
    })))

    // Process and save quiz items based on question type
    const quizItems = await Promise.all(
      quizData.questions.map(async (question: any) => {
        // Prepare base quiz item data
        const baseData = {
          document_id: documentId,
          node_id: question.node_id || null,
          question: question.question,
          explanation: question.explanation,
          source_quote: question.source_quote,
          difficulty: question.difficulty,
          question_type: question.type,
        }

        // Add type-specific fields
        let additionalData: any = {}
        
        switch (question.type) {
          case 'multiple_choice':
            additionalData = {
              options: question.options,
              correct_answer: question.correct_answer,
            }
            break
          case 'true_false':
            additionalData = {
              correct_answer: question.correct_answer_bool ? 'O' : 'X',
            }
            break
          case 'short_answer':
            additionalData = {
              acceptable_answers: question.acceptable_answers,
              hint: question.hint,
            }
            break
          case 'fill_in_blank':
            additionalData = {
              template: question.template,
              blanks: question.blanks,
            }
            break
          case 'matching':
            additionalData = {
              left_items: question.left_items,
              right_items: question.right_items,
              correct_pairs: question.correct_pairs,
            }
            break
        }

        const { data } = await supabase
          .from('quiz_items')
          .insert({
            ...baseData,
            ...additionalData,
            is_assessment: false,
          })
          .select()
          .single()

        return data
      })
    )

    return NextResponse.json({ questions: quizItems })
  } catch (error: any) {
    console.error('Extended quiz generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate extended quiz', details: error.message },
      { status: 500 }
    )
  }
}