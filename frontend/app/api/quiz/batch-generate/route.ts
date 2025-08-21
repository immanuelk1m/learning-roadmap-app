import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
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
  customTitle?: string
  userAssessmentData?: {
    weakNodeIds: string[]
    strongNodeIds: string[]
    assessmentResults: Array<{
      nodeId: string
      understandingLevel: number
      assessmentMethod: string
    }>
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: BatchGenerateRequest = await request.json()
    const { documentIds, difficulty, questionCount, questionTypes, customTitle, userAssessmentData } = body
    
    const supabase = createServiceClient()
    
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

      // Identify weak and strong nodes for this document if assessment data is provided
      let weakNodesForDoc: any[] = []
      let strongNodesForDoc: any[] = []
      let focusPrompt = ''
      
      if (userAssessmentData) {
        weakNodesForDoc = documentNodes.filter(node => 
          userAssessmentData.weakNodeIds.includes(node.id)
        )
        strongNodesForDoc = documentNodes.filter(node => 
          userAssessmentData.strongNodeIds.includes(node.id)
        )
        
        if (weakNodesForDoc.length > 0) {
          focusPrompt = `
## 평가 결과 기반 맞춤 지시사항

**사용자 평가 결과 분석**:
- 이해도가 낮은 개념 (집중 필요): 
${weakNodesForDoc.map((node, idx) => {
  const assessment = userAssessmentData.assessmentResults.find(r => r.nodeId === node.id)
  return `  ${idx + 1}. ${node.name} (이해도: ${assessment?.understandingLevel || 0}%)`
}).join('\n')}

- 이해도가 높은 개념 (간단히 다루기):
${strongNodesForDoc.slice(0, 5).map((node, idx) => `  ${idx + 1}. ${node.name}`).join('\n')}

**중요 요구사항**:
1. 이해도가 낮은 개념에 대해 전체 문제의 70% 이상을 할당하세요.
2. 이해도가 낮은 개념은 쉬운 난이도부터 시작하여 점진적으로 어려운 문제를 제시하세요.
3. 각 약한 개념에 대해 최소 2-3개의 문제를 생성하세요.
4. 문제에 상세한 해설을 포함하여 학습 효과를 높이세요.
5. 이해도가 높은 개념은 복습 차원에서 소수의 도전적인 문제만 포함하세요.
`
        }
      }

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

${focusPrompt}

**중요**: 
1. 반드시 요청된 문제 유형만 사용하세요.
2. 지정된 난이도 분포를 따라 문제를 구성하세요.
3. 모든 문제는 PDF 내용에 직접 근거해야 합니다.
4. 각 문제의 difficulty 필드를 정확히 설정하세요.
5. **각 문제마다 관련된 지식 노드를 반드시 지정하세요 (node_id와 node_name 필드).**

${documentNodes.length > 0 ? `
**이 문서의 지식 노드들 (문제와 연결해야 함)**:
${documentNodes.map((node) => `- ID: ${node.id}
  이름: ${node.name}
  설명: ${node.description}
  레벨: ${node.level}`).join('\n\n')}

**각 문제에 가장 관련성 높은 노드의 ID와 이름을 node_id, node_name 필드에 포함하세요.**
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
      
      console.log(`[DEBUG] Raw Gemini response for document ${document.id}:`, {
        responseLength: response.length,
        firstChars: response.substring(0, 200) + '...',
        lastChars: '...' + response.substring(response.length - 200)
      })
      
      const quizData = parseGeminiResponse<any>(
        response,
        { documentId: document.id, responseType: 'quiz_generation' }
      )
      
      console.log(`[DEBUG] Parsed quiz data for document ${document.id}:`, {
        hasQuestions: quizData?.questions ? true : false,
        isQuestionsArray: Array.isArray(quizData?.questions),
        questionsCount: quizData?.questions?.length || 0,
        questionsStructure: quizData?.questions?.slice(0, 2) // Show first 2 questions structure
      })
      
      // Save quiz items to database
      if (quizData.questions && Array.isArray(quizData.questions)) {
        console.log(`[DEBUG] Starting to save ${quizData.questions.length} questions for document ${document.id}`)
        
        const quizItems = await Promise.all(
          quizData.questions.map(async (question: any, index: number) => {
            console.log(`[DEBUG] Processing question ${index + 1}/${quizData.questions.length}:`, {
              hasQuestion: !!question.question,
              questionType: question.type || 'unknown',
              hasCorrectAnswer: !!question.correct_answer,
              hasExplanation: !!question.explanation
            })
            
            try {
            // Improved question type mapping
            let questionType = 'multiple_choice'
            if (question.type === 'true_false') questionType = 'true_false'
            else if (question.type === 'short_answer') questionType = 'short_answer'
            else if (question.type === 'fill_in_blank') questionType = 'fill_in_blank'
            else if (question.type === 'matching') questionType = 'matching'
            
            // Standardize true/false answer format
            let correctAnswer = question.correct_answer || ''
            if (questionType === 'true_false') {
              if (question.correct_answer_bool !== undefined) {
                correctAnswer = question.correct_answer_bool ? '참' : '거짓'
              } else if (question.correct_answer === 'true' || question.correct_answer === 'O') {
                correctAnswer = '참'
              } else if (question.correct_answer === 'false' || question.correct_answer === 'X') {
                correctAnswer = '거짓'
              }
            } else if (questionType === 'short_answer' && question.acceptable_answers?.[0]) {
              correctAnswer = question.acceptable_answers[0]
            }

            // Match node if provided by Gemini or find best match
            let nodeId = question.node_id || null
            
            // If Gemini didn't provide a node_id but provided node_name, try to match
            if (!nodeId && question.node_name && documentNodes.length > 0) {
              const matchedNode = documentNodes.find(node => 
                node.name.toLowerCase().includes(question.node_name.toLowerCase()) ||
                question.node_name.toLowerCase().includes(node.name.toLowerCase())
              )
              if (matchedNode) {
                nodeId = matchedNode.id
              }
            }
            
            // If still no node match, try to find best match based on question content
            if (!nodeId && documentNodes.length > 0) {
              const questionLower = question.question.toLowerCase()
              const matchedNode = documentNodes.find(node => {
                const nameLower = node.name.toLowerCase()
                const descLower = (node.description || '').toLowerCase()
                return questionLower.includes(nameLower) || 
                       (descLower && questionLower.includes(descLower.substring(0, 20)))
              })
              if (matchedNode) {
                nodeId = matchedNode.id
                console.log(`[DEBUG] Auto-matched question to node: ${matchedNode.name}`)
              }
            }

              const { data, error } = await supabase
                .from('quiz_items')
                .insert({
                  document_id: document.id,
                  user_id: FIXED_USER_ID, // Add user_id - this was missing!
                  subject_id: document.subject_id, // Also add subject_id for consistency
                  node_id: nodeId, // Add the matched node ID
                  question: question.question,
                  question_type: questionType,
                  options: question.options || [],
                  correct_answer: correctAnswer,
                  acceptable_answers: question.acceptable_answers || null,
                  explanation: question.explanation,
                  source_quote: question.source_quote,
                  difficulty: question.difficulty || 'medium',
                  is_assessment: false, // This is the key fix - explicitly set for quiz practice
                  template: question.template || null,
                  blanks: question.blanks || null,
                  left_items: question.left_items || null,
                  right_items: question.right_items || null,
                  correct_pairs: question.correct_pairs || null,
                  hint: question.hint || null
                })
                .select()
                .single()

              if (error) {
                console.error(`[DEBUG] Failed to save question ${index + 1}:`, {
                  error: error.message,
                  code: error.code,
                  questionData: {
                    question: question.question?.substring(0, 100),
                    questionType,
                    correctAnswer,
                    difficulty: question.difficulty
                  }
                })
                return null
              }

              console.log(`[DEBUG] Successfully saved question ${index + 1}:`, {
                id: data?.id,
                questionType,
                difficulty: question.difficulty,
                nodeId: nodeId || 'no node matched',
                nodeName: question.node_name || 'not provided'
              })

              return data
            } catch (error: any) {
              console.error(`[DEBUG] Exception saving question ${index + 1}:`, {
                error: error.message,
                questionText: question.question?.substring(0, 100)
              })
              return null
            }
          })
        )
        
        const savedItems = quizItems.filter(item => item !== null)
        console.log(`[DEBUG] Quiz saving summary for document ${document.id}:`, {
          totalQuestions: quizData.questions.length,
          savedSuccessfully: savedItems.length,
          failed: quizData.questions.length - savedItems.length,
          savedItemIds: savedItems.map(item => item?.id)
        })
        
        allQuizItems.push(...savedItems)
      } else {
        console.log(`[DEBUG] No valid questions array found for document ${document.id}:`, {
          hasQuizData: !!quizData,
          hasQuestions: !!quizData?.questions,
          questionsType: typeof quizData?.questions,
          isArray: Array.isArray(quizData?.questions),
          rawQuizData: quizData
        })
      }
    }

    console.log(`[DEBUG] Final quiz generation summary:`, {
      totalDocuments: documents.length,
      totalQuizItems: allQuizItems.length,
      documentsProcessed: documents.map(doc => doc.id),
      successfulItems: allQuizItems.filter(item => item?.id).length,
      averageQuestionsPerDoc: documents.length > 0 ? (allQuizItems.length / documents.length).toFixed(2) : 0
    })
    
    console.log(`Generated ${allQuizItems.length} quiz items for ${documents.length} documents`)

    // Update documents to indicate they have quiz data
    const updateData: any = {
      quiz_generation_status: { 
        generated: true, 
        count: allQuizItems.length,
        last_attempt: new Date().toISOString()
      }
    }
    
    // If customTitle is provided, update the document title
    if (customTitle && documentIds.length === 1) {
      updateData.title = customTitle
    }
    
    await supabase
      .from('documents')
      .update(updateData)
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