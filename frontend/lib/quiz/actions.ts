import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { geminiQuizModel } from '@/lib/gemini/client'
import { EXTENDED_QUIZ_GENERATION_PROMPT } from '@/lib/gemini/prompts'
import { parseGeminiResponse } from '@/lib/gemini/utils'

type DifficultyLevel = 'very_easy' | 'easy' | 'normal' | 'hard' | 'very_hard'

interface QuizGenerationParams {
  documentIds: string[]
  userId?: string
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

export async function generatePracticeQuiz(params: QuizGenerationParams) {
  try {
    const { documentIds, userId, difficulty, questionCount, questionTypes, customTitle, userAssessmentData } = params
    
    const supabase = createServiceClient()
    
    let effectiveUserId = userId
    if (!effectiveUserId) {
      const supabaseAuth = await createClient()
      const { data: auth } = await supabaseAuth.auth.getUser()
      effectiveUserId = auth.user?.id || ''
    }

    if (!effectiveUserId) {
      throw new Error('Unauthorized: No effective user ID found.')
    }

    // Get documents
    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .in('id', documentIds)
      .eq('user_id', effectiveUserId)

    if (error) {
      console.error('[generatePracticeQuiz] Error fetching documents:', error)
      throw new Error('Failed to fetch documents.')
    }

    if (!documents || documents.length === 0) {
      console.error('[generatePracticeQuiz] Documents not found for user.', { documentIds, effectiveUserId })
      // Return a specific result instead of throwing a generic error
      return { success: false, error: 'Documents not found', questionsGenerated: 0 }
    }

    // ... (The rest of the logic from batch-generate route)
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
    
    const enabledTypes = []
    if (questionTypes.multipleChoice) enabledTypes.push('객관식 (multiple_choice)')
    if (questionTypes.shortAnswer) enabledTypes.push('단답형 (short_answer)')
    if (questionTypes.trueFalse) enabledTypes.push('O/X (true_false)')

    const allQuizItems = []
    
    for (const document of documents) {
      const { data: fileData } = await supabase.storage
        .from('pdf-documents')
        .download(document.file_path)

      if (!fileData) {
        console.error(`Failed to download file for document ${document.id}`)
        continue
      }

      const base64Data = await fileData.arrayBuffer().then((buffer) =>
        Buffer.from(buffer).toString('base64')
      )

      const documentNodes = allNodes?.filter(node => node.document_id === document.id) || []

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
- 이해도가 낮은 개념 (집중 필요): 
${weakNodesForDoc.map((node, idx) => {
  const assessment = userAssessmentData.assessmentResults.find(r => r.nodeId === node.id)
  return `  ${idx + 1}. ${node.name} (이해도: ${assessment?.understandingLevel || 0}%)`
}).join('\n')}
- 이해도가 높은 개념 (간단히 다루기):
${strongNodesForDoc.slice(0, 5).map((node, idx) => `  ${idx + 1}. ${node.name}`).join('\n')}
**중요 요구사항**:
1. 이해도가 낮은 개념에 대해 전체 문제의 70% 이상을 할당하세요.
2. 각 약한 개념에 대해 최소 2-3개의 문제를 생성하세요.
`
        }
      }

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
2. 모든 문제는 PDF 내용에 직접 근거해야 합니다.
3. **각 문제마다 관련된 개념 노드를 반드시 지정하세요 (node_id와 node_name 필드).**
${documentNodes.length > 0 ? `
**이 문서의 개념 노드들 (문제와 연결해야 함)**:
${documentNodes.map((node) => `- ID: ${node.id}
  이름: ${node.name}
  설명: ${node.description}
  레벨: ${node.level}`).join('\n\n')}
` : ''}
`
      const result = await geminiQuizModel.generateContent([
        { inlineData: { mimeType: 'application/pdf', data: base64Data } },
        { text: prompt },
      ])

      const response = result.response.text()
      
      if (!response) {
        console.error(`Empty response from Gemini API for document ${document.id}`)
        continue
      }
      
      const quizData = parseGeminiResponse<any>(
        response,
        { documentId: document.id, responseType: 'quiz_generation' }
      )
      
      if (quizData.questions && Array.isArray(quizData.questions)) {
        const { data: existingSets } = await supabase
          .from('quiz_sets')
          .select('id, created_at')
          .eq('document_id', document.id)
          .order('created_at', { ascending: true })

        const nextSeq = (existingSets?.length || 0) + 1
        const seqName = nextSeq === 1 ? '1차시_Exercise' : `${nextSeq}차시`

        const { data: quizSet, error: quizSetError } = await supabase
          .from('quiz_sets')
          .insert({
            document_id: document.id,
            name: seqName,
            description: userAssessmentData ? '평가 기반 맞춤형 연습 문제' : '자동 생성된 연습 문제 세트',
            question_count: quizData.questions.length,
            generation_method: 'auto',
            difficulty_distribution: {
              easy: quizData.questions.filter((q: any) => q.difficulty === 'easy').length,
              medium: quizData.questions.filter((q: any) => q.difficulty === 'medium').length,
              hard: quizData.questions.filter((q: any) => q.difficulty === 'hard').length
            },
            status: 'active'
          })
          .select()
          .single()
        
        if (quizSetError || !quizSet) {
          console.error(`Failed to create quiz_set for document ${document.id}:`, quizSetError)
          continue
        }
        
        const quizItems = await Promise.all(
          quizData.questions.map(async (question: any) => {
            let questionType = 'multiple_choice'
            if (question.type === 'true_false') questionType = 'true_false'
            else if (question.type === 'short_answer') questionType = 'short_answer'
            
            let correctAnswer = question.correct_answer || ''
            if (questionType === 'true_false') {
              if (question.correct_answer_bool !== undefined) {
                correctAnswer = question.correct_answer_bool ? '참' : '거짓'
              }
            }

            let nodeId = question.node_id || null
            if (!nodeId && question.node_name && documentNodes.length > 0) {
              const matchedNode = documentNodes.find(node => 
                node.name.toLowerCase().includes(question.node_name.toLowerCase())
              )
              if (matchedNode) nodeId = matchedNode.id
            }

            const { data, error } = await supabase
              .from('quiz_items')
              .insert({
                quiz_set_id: quizSet.id,
                document_id: document.id,
                node_id: nodeId,
                question: question.question,
                question_type: questionType,
                options: question.options || [],
                correct_answer: correctAnswer,
                explanation: question.explanation,
                difficulty: question.difficulty || 'medium',
                is_assessment: false,
              })
              .select()
              .single()

            if (error) {
              console.error(`Failed to save question:`, error)
              return null
            }
            return data
          })
        )
        
        const savedItems = quizItems.filter(item => item !== null)
        allQuizItems.push(...savedItems)
      }
    }

    await supabase
      .from('documents')
      .update({
        quiz_generation_status: { 
          generated: true, 
          count: allQuizItems.length,
          last_attempt: new Date().toISOString()
        }
      })
      .in('id', documentIds)

    return { 
      success: true,
      questionsGenerated: allQuizItems.length,
      documents: documents.length 
    }
  } catch (error: any) {
    console.error('Batch quiz generation error:', error)
    return { success: false, error: error.message, questionsGenerated: 0 }
  }
}