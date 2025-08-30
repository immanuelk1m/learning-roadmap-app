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
    const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

    // 1. Get document information
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', FIXED_USER_ID)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // 2. Get weak nodes (understanding_level < 70) for this document
    const { data: weakNodes, error: nodesError } = await supabase
      .from('knowledge_nodes')
      .select('*')
      .eq('document_id', documentId)
      .lt('understanding_level', 70)
      .order('understanding_level', { ascending: true })
      .limit(5) // Maximum 5 nodes to focus on (reduced to prevent long responses)

    if (nodesError) {
      console.error('Error fetching nodes:', nodesError)
      return NextResponse.json({ error: 'Failed to fetch knowledge nodes' }, { status: 500 })
    }

    if (!weakNodes || weakNodes.length === 0) {
      // If no weak nodes, get random nodes
      const { data: randomNodes } = await supabase
        .from('knowledge_nodes')
        .select('*')
        .eq('document_id', documentId)
        .limit(10)
      
      if (!randomNodes || randomNodes.length === 0) {
        return NextResponse.json({ 
          error: 'No knowledge nodes found for this document. Please analyze the document first.' 
        }, { status: 400 })
      }
      
      weakNodes.push(...randomNodes)
    }

    // 3. Create a new quiz set
    const { data: quizSet, error: quizSetError } = await supabase
      .from('quiz_sets')
      .insert({
        document_id: documentId,
        name: `AI 맞춤 문제집 - ${new Date().toLocaleDateString('ko-KR')}`,
        description: `Understanding level 기반 자동 생성 (약점 노드 ${weakNodes.length}개 집중)`,
        generation_method: 'smart',
        node_focus: weakNodes.map(node => ({
          id: node.id,
          name: node.name,
          understanding_level: node.understanding_level,
          weight: node.understanding_level < 30 ? 3 : node.understanding_level < 50 ? 2 : 1
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
   - 현재 이해도: ${node.understanding_level}%
   - 가중치: ${node.understanding_level < 30 ? '높음(3)' : node.understanding_level < 50 ? '중간(2)' : '낮음(1)'}`).join('\n')}

## 문제 생성 지침

1. **문제 수**: 정확히 10문제 생성 (더 많이 생성하지 마세요)
   - 이해도가 가장 낮은 노드들에 집중
   - 각 노드당 최대 2문제

2. **난이도 분배**:
   - easy: 3문제
   - medium: 5문제
   - hard: 2문제

3. **문제 유형**: 
   - multiple_choice: 4문제
   - true_false: 2문제
   - short_answer: 2문제 (짧은 답변만)
   - fill_in_blank: 2문제

4. **중요 제약사항**:
   - 각 문제와 답변은 간결하게 작성
   - source_quote는 50자 이내로 제한
   - explanation은 100자 이내로 제한
   - 각 문제마다 관련 node_id 포함

5. **모든 내용은 한국어로 간결하게 작성하세요.**
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

        // 7. Save node relationships in quiz_item_nodes
        if (question.node_id && quizItem) {
          const { error: nodeRelError } = await supabase
            .from('quiz_item_nodes')
            .insert({
              quiz_item_id: quizItem.id,
              node_id: question.node_id,
              is_primary: true,
              relevance_score: 100
            })
          
          if (nodeRelError) {
            console.error('Error creating node relationship:', nodeRelError)
          }
        }

        // 8. Link quiz item to quiz set
        if (quizItem) {
          const { error: linkError } = await supabase
            .from('quiz_set_items')
            .insert({
              quiz_set_id: quizSet.id,
              quiz_item_id: quizItem.id,
              order_position: index
            })
          
          if (linkError) {
            console.error('Error linking quiz item to set:', linkError)
          }
        }

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

    // 10. Create a new quiz session
    const { data: session, error: sessionError } = await supabase
      .from('quiz_sessions')
      .insert({
        user_id: FIXED_USER_ID,
        document_id: documentId,
        quiz_set_id: quizSet.id,
        quiz_type: 'practice',
        status: 'in_progress',
        total_questions: quizItems.length,
        user_answers: {},
        question_results: {},
        show_results: false
      })
      .select()
      .single()

    if (sessionError) {
      console.error('Error creating session:', sessionError)
    }

    return NextResponse.json({ 
      success: true,
      quizSet: {
        id: quizSet.id,
        name: quizSet.name,
        questionCount: quizItems.length
      },
      session: session,
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