import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { geminiQuizModel } from '@/lib/gemini/client'
import { EXTENDED_QUIZ_GENERATION_PROMPT } from '@/lib/gemini/prompts'
import { parseGeminiResponse, validateResponseStructure } from '@/lib/gemini/utils'

type DifficultyLevel = 'very_easy' | 'easy' | 'normal' | 'hard' | 'very_hard'

interface BatchGenerateRequest {
  documentIds: string[]
  difficulty: DifficultyLevel
  questionCount: number
  questionTypes: {
    multipleChoice: boolean
    shortAnswer: boolean
    trueFalse: boolean
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: BatchGenerateRequest = await request.json()
    const { documentIds, difficulty, questionCount, questionTypes } = body
    
    const supabase = await createClient()
    
    // Use fixed user ID
    const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

    // Get documents
    const { data: documents } = await supabase
      .from('documents')
      .select('*')
      .in('id', documentIds)
      .eq('user_id', FIXED_USER_ID)

    if (!documents || documents.length === 0) {
      return NextResponse.json({ error: 'Documents not found' }, { status: 404 })
    }

    // Get all knowledge nodes for the documents
    const { data: allNodes } = await supabase
      .from('knowledge_nodes')
      .select('*')
      .in('document_id', documentIds)

    // Map difficulty levels to Korean and difficulty distribution
    const difficultySettings = {
      very_easy: {
        label: '매우 쉬움',
        distribution: { easy: 80, medium: 20, hard: 0 }
      },
      easy: {
        label: '조금 쉬움',
        distribution: { easy: 60, medium: 35, hard: 5 }
      },
      normal: {
        label: '보통',
        distribution: { easy: 30, medium: 50, hard: 20 }
      },
      hard: {
        label: '어려움',
        distribution: { easy: 10, medium: 40, hard: 50 }
      },
      very_hard: {
        label: '매우 어려움',
        distribution: { easy: 0, medium: 30, hard: 70 }
      }
    }

    const selectedDifficulty = difficultySettings[difficulty]
    
    // Build question type instructions
    const enabledTypes = []
    if (questionTypes.multipleChoice) enabledTypes.push('객관식 (multiple_choice)')
    if (questionTypes.shortAnswer) enabledTypes.push('단답형 (short_answer)')
    if (questionTypes.trueFalse) enabledTypes.push('O/X (true_false)')

    // Generate quiz for each document
    const allQuizItems = []
    
    for (const document of documents) {
      // Get file content from storage
      const { data: fileData } = await supabase.storage
        .from('pdf-documents')
        .download(document.file_path)

      if (!fileData) {
        console.error(`Failed to download file for document ${document.id}`)
        continue
      }

      // Convert to base64
      const base64Data = await fileData.arrayBuffer().then((buffer) =>
        Buffer.from(buffer).toString('base64')
      )

      // Get nodes for this document
      const documentNodes = allNodes?.filter(node => node.document_id === document.id) || []

      // Generate customized prompt
      const prompt = `
${EXTENDED_QUIZ_GENERATION_PROMPT}

## 특별 지시사항

**문서**: ${document.title}

**요청된 설정**:
- 난이도: ${selectedDifficulty.label}
- 문제 수: ${Math.ceil(questionCount / documents.length)}개
- 허용된 문제 유형: ${enabledTypes.join(', ')}

**난이도 분포**:
- 쉬운 문제 (easy): ${selectedDifficulty.distribution.easy}%
- 중간 문제 (medium): ${selectedDifficulty.distribution.medium}%
- 어려운 문제 (hard): ${selectedDifficulty.distribution.hard}%

**중요**: 
1. 반드시 요청된 문제 유형만 사용하세요.
2. 지정된 난이도 분포를 따라 문제를 구성하세요.
3. 모든 문제는 PDF 내용에 직접 근거해야 합니다.
4. 각 문제의 difficulty 필드를 정확히 설정하세요.

${documentNodes.length > 0 ? `
**이 문서의 주요 개념들**:
${documentNodes.map((node, idx) => `${idx + 1}. ${node.name}: ${node.description}`).join('\n')}
` : ''}
`

      // Generate quiz with Gemini
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
      
      if (!response) {
        console.error(`Empty response from Gemini API for document ${document.id}`)
        continue
      }
      
      const quizData = parseGeminiResponse<any>(
        response,
        { documentId: document.id, responseType: 'quiz_generation' }
      )
      
      // Save quiz items to database
      if (quizData.questions && Array.isArray(quizData.questions)) {
        const quizItems = await Promise.all(
          quizData.questions.map(async (question: any) => {
            // Map question types
            let questionType = 'multiple_choice'
            if (question.type === 'true_false') questionType = 'true_false'
            else if (question.type === 'short_answer') questionType = 'short_answer'
            
            const { data } = await supabase
              .from('quiz_items')
              .insert({
                document_id: document.id,
                question: question.question,
                question_type: questionType,
                options: question.options || [],
                correct_answer: question.correct_answer || 
                  (question.correct_answer_bool !== undefined ? 
                    (question.correct_answer_bool ? 'O' : 'X') : 
                    question.acceptable_answers?.[0] || ''),
                explanation: question.explanation,
                source_quote: question.source_quote,
                difficulty: question.difficulty === 'easy' ? 1 : 
                           question.difficulty === 'medium' ? 2 : 3,
              })
              .select()
              .single()

            return data
          })
        )
        
        allQuizItems.push(...quizItems.filter(item => item !== null))
      }
    }

    // Update documents to indicate they have quiz data
    await supabase
      .from('documents')
      .update({ quiz_data: { generated: true, count: allQuizItems.length } })
      .in('id', documentIds)

    return NextResponse.json({ 
      success: true,
      questionsGenerated: allQuizItems.length,
      documents: documents.length 
    })
  } catch (error: any) {
    console.error('Batch quiz generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate quiz', details: error.message },
      { status: 500 }
    )
  }
}