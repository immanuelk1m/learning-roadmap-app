import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { geminiExtendedQuizModel } from '@/lib/gemini/client'
import { EXTENDED_QUIZ_GENERATION_PROMPT } from '@/lib/gemini/prompts'
import { ExtendedQuizResponse } from '@/lib/gemini/schemas'
import { parseGeminiResponse, validateResponseStructure } from '@/lib/gemini/utils'

export async function POST(request: NextRequest) {
  try {
    const { documentId } = await request.json()
    
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }
    
    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getUser()
    const userId = auth.user?.id
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 1. Get document information
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // 2. Get weak nodes (understanding_level < 70) for this document and user
    const { data: weakNodes, error: nodesError } = await supabase
      .from('knowledge_nodes')
      .select('*')
      .eq('document_id', documentId)
      .eq('user_id', userId)
      .lt('understanding_level', 70)
      .order('understanding_level', { ascending: true })
      .limit(5) // Maximum 5 nodes to focus on (reduced to prevent long responses)

    if (nodesError) {
      console.error('Error fetching nodes:', nodesError)
      return NextResponse.json({ error: 'Failed to fetch knowledge nodes' }, { status: 500 })
    }

    if (!weakNodes || weakNodes.length === 0) {
      // Fallback strictly based on understanding_level: pick lowest-level nodes for this user
      const { data: lowestNodes } = await supabase
        .from('knowledge_nodes')
        .select('*')
        .eq('document_id', documentId)
        .eq('user_id', userId)
        .order('understanding_level', { ascending: true })
        .limit(10)

      if (!lowestNodes || lowestNodes.length === 0) {
        return NextResponse.json({ 
          error: 'Knowledge assessment not found for this document. Please complete assessment first.' 
        }, { status: 400 })
      }

      weakNodes.push(...lowestNodes)
    }

    // 3. Create a new quiz set with sequence-based name
    const { data: existingSets } = await supabase
      .from('quiz_sets')
      .select('id, created_at')
      .eq('document_id', documentId)
      .order('created_at', { ascending: true })

    const nextSeq = (existingSets?.length || 0) + 1
    const seqName = nextSeq === 1 ? '1차시_Exercise' : `${nextSeq}차시`

    const { data: quizSet, error: quizSetError } = await supabase
      .from('quiz_sets')
      .insert({
        document_id: documentId,
        name: seqName,
        description: `Understanding level 기반 자동 생성 (약점 노드 ${weakNodes.length}개 집중)`,
        generation_method: 'smart',
        node_focus: weakNodes.map(node => ({
          id: node.id,
          name: node.name,
          understanding_level: node.understanding_level,
          weight: (node.understanding_level ?? 0) < 30 ? 3 : (node.understanding_level ?? 0) < 50 ? 2 : 1
        })),
        status: 'active'
      })
      .select()
      .single()

    if (quizSetError || !quizSet) {
      console.error('Error creating quiz set:', quizSetError)
      return NextResponse.json({ error: 'Failed to create quiz set' }, { status: 500 })
    }

    // 4. Get file content from storage
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

    // 5. Generate quiz with Gemini
    const prompt = `
${EXTENDED_QUIZ_GENERATION_PROMPT}

## 학습자 맞춤형 문제 생성

**대상 문서**: ${document.title}

**집중해야 할 약점 노드들 (understanding_level < 70):**
${weakNodes.map((node, index) => `
${index + 1}. **${node.name}** (ID: ${node.id})
   - 설명: ${node.description}
   - 현재 이해도: ${node.understanding_level ?? 0}%
   - 가중치: ${(node.understanding_level ?? 0) < 30 ? '높음(3)' : (node.understanding_level ?? 0) < 50 ? '중간(2)' : '낮음(1)'}`).join('\n')}

## 문제 생성 지침

1. **문제 수**: 최소 10개, 최대 20개 생성
   - 약점 노드가 많을수록 더 많은 문제 생성
   - 이해도가 낮은 노드일수록 더 많은 문제 할당

2. **난이도 분배**:
   - 학습자의 약점 수준에 맞춰 자동 조정
   - 이해도 30% 미만: easy 문제 중심
   - 이해도 30-50%: medium 문제 중심
   - 이해도 50-70%: medium과 hard 혼합

3. **문제 유형 (학습 효과 극대화를 위한 자동 선택)**: 
   - **개념 이해 부족 (이해도 < 30%)**: true_false, fill_in_blank 위주로 기초 개념 확인
   - **부분적 이해 (이해도 30-50%)**: multiple_choice로 개념 구분 능력 향상
   - **응용력 부족 (이해도 50-70%)**: short_answer로 깊이 있는 이해 유도
   - 각 약점 노드의 특성에 맞는 최적의 문제 유형 선택

4. **중요 제약사항**:
   - 모든 텍스트 필드 200자 이내로 제한
   - question: 200자 이내
   - source_quote: 200자 이내
   - explanation: 200자 이내
   - 각 문제마다 관련 node_id 반드시 포함

5. **학습 효과 극대화 원칙**:
   - 단순 암기보다는 이해도 향상에 초점
   - 점진적 난이도 상승으로 학습 동기 유지
   - 오답 시 학습할 수 있는 상세한 설명 제공

6. **모든 내용은 한국어로 작성하세요.**
`

    const result = await geminiExtendedQuizModel.generateContent([
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: base64Data,
        },
      },
      { text: prompt },
    ])

    // Google Generative AI SDK returns a GenerateContentResult
    // Access text via result.response.text()
    const response = (await result.response?.text()) || ''
    
    if (!response) {
      throw new Error('Empty response from Gemini API')
    }
    
    const quizData = parseGeminiResponse<ExtendedQuizResponse>(
      response,
      { documentId, responseType: 'smart_quiz_generation' }
    )
    
    validateResponseStructure(
      quizData,
      ['questions'],
      { documentId, responseType: 'smart_quiz_generation' }
    )

    // 6. Save quiz items with quiz_set_id
    const quizItemPromises = quizData.questions.map(async (question: any, index: number) => {
        // Prepare base quiz item data
        const baseData = {
          document_id: documentId,
          quiz_set_id: quizSet.id, // Link to quiz set
          question: question.question,
          explanation: question.explanation,
          source_quote: question.source_quote,
          difficulty: question.difficulty,
          question_type: question.type,
        }

        // Add type-specific fields and ensure correct_answer is set
        let additionalData: any = {}
        let correctAnswer: string = ''
        
        switch (question.type) {
          case 'multiple_choice':
            correctAnswer = question.correct_answer || ''
            additionalData = {
              options: question.options,
              correct_answer: correctAnswer,
            }
            break
          case 'true_false':
            correctAnswer = question.correct_answer_bool ? 'O' : 'X'
            additionalData = {
              correct_answer: correctAnswer,
            }
            break
          case 'short_answer':
            // For short answer, use the first acceptable answer as correct_answer
            correctAnswer = question.acceptable_answers?.[0] || ''
            additionalData = {
              correct_answer: correctAnswer,
              acceptable_answers: question.acceptable_answers,
              hint: question.hint,
            }
            break
          case 'fill_in_blank':
            // For fill in blank, combine all answers
            correctAnswer = question.blanks?.map((b: any) => b.answer).join(', ') || ''
            additionalData = {
              correct_answer: correctAnswer,
              template: question.template,
              blanks: question.blanks,
            }
            break
          case 'matching':
            // For matching, create a string representation
            correctAnswer = JSON.stringify(question.correct_pairs || [])
            additionalData = {
              correct_answer: correctAnswer,
              left_items: question.left_items,
              right_items: question.right_items,
              correct_pairs: question.correct_pairs,
            }
            break
          default:
            correctAnswer = question.correct_answer || 'N/A'
        }
        
        // Skip if no correct answer could be determined
        if (!correctAnswer) {
          console.warn(`Skipping question with no correct answer: ${question.question}`)
          return null
        }

        const { data: quizItem, error: itemError } = await supabase
          .from('quiz_items')
          .insert({
            ...baseData,
            ...additionalData,
            is_assessment: false,
          })
          .select()
          .single()

        if (itemError) {
          console.error('Error creating quiz item:', itemError)
          throw itemError
        }

        // Steps 7, 8, and 10 are removed as they use non-existent tables.
        return quizItem
      })
    
    // Filter out null values and await all promises
    const quizItemResults = await Promise.all(quizItemPromises)
    const quizItems = quizItemResults.filter(item => item !== null)

    // 9. Update quiz set with question count
    await supabase
      .from('quiz_sets')
      .update({
        question_count: quizItems.length,
        difficulty_distribution: {
          easy: quizItems.filter(q => q?.difficulty === 'easy').length,
          medium: quizItems.filter(q => q?.difficulty === 'medium').length,
          hard: quizItems.filter(q => q?.difficulty === 'hard').length
        }
      })
      .eq('id', quizSet.id)

    // 10. Create a new quiz session (REMOVED)

    return NextResponse.json({
      success: true,
      quizSet: {
        id: quizSet.id,
        name: quizSet.name,
        questionCount: quizItems.length
      },
      session: null, // Return null as sessions are not used
      message: `${quizItems.length}개의 맞춤형 문제가 생성되었습니다!`,
      questions: quizItems.length
    })
  } catch (error: any) {
    console.error('Smart quiz generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate smart quiz', details: error.message },
      { status: 500 }
    )
  }
}
