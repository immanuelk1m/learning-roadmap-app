import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { geminiExtendedQuizModel } from '@/lib/gemini/client'
import { EXTENDED_QUIZ_GENERATION_PROMPT } from '@/lib/gemini/prompts'
import { ExtendedQuizResponse, ExtendedQuizQuestion } from '@/lib/gemini/schemas'
import { parseGeminiResponse, validateResponseStructure } from '@/lib/gemini/utils'
import { quizLogger, geminiLogger, supabaseLogger } from '@/lib/logger'
import Logger from '@/lib/logger'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const timer = quizLogger.startTimer()
  const correlationId = request.headers.get('x-correlation-id') || Logger.generateCorrelationId()
  
  quizLogger.info('Quiz regeneration API started', {
    correlationId,
    metadata: {
      timestamp: new Date().toISOString(),
      headers: Object.fromEntries(request.headers.entries())
    }
  })
  
  try {
    const { id } = await params
    quizLogger.info('Processing quiz regeneration', {
      correlationId,
      documentId: id
    })
    
    const supabase = await createClient()
    
    // Use fixed user ID
    const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

    // Get document info
    console.log('Fetching document from database...')
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('user_id', FIXED_USER_ID)
      .single()

    if (docError || !document) {
      console.error('Document not found:', docError)
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check if document is completed
    if (document.status !== 'completed') {
      return NextResponse.json({ error: 'Document must be completed before regenerating quiz' }, { status: 400 })
    }

    // Get existing knowledge nodes
    console.log('Fetching knowledge nodes...')
    const { data: knowledgeNodes, error: nodesError } = await supabase
      .from('knowledge_nodes')
      .select('*')
      .eq('document_id', id)
      .order('position', { ascending: true })

    if (nodesError || !knowledgeNodes || knowledgeNodes.length === 0) {
      console.error('No knowledge nodes found:', nodesError)
      return NextResponse.json({ error: 'No knowledge nodes found for this document' }, { status: 404 })
    }

    console.log(`Found ${knowledgeNodes.length} knowledge nodes`)

    // Delete existing quiz questions for this document
    console.log('Deleting existing quiz questions...')
    const { error: deleteError } = await supabase
      .from('quiz_items')
      .delete()
      .eq('document_id', id)
      .eq('is_assessment', true)

    if (deleteError) {
      console.error('Error deleting existing quiz questions:', deleteError)
    }

    // Download the PDF file
    console.log('Downloading PDF file...')
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('pdf-documents')
      .download(document.file_path)

    if (downloadError || !fileData) {
      console.error('Error downloading file:', downloadError)
      return NextResponse.json({ error: 'Failed to download PDF file' }, { status: 500 })
    }

    // Convert to base64
    console.log('Converting PDF to base64...')
    const base64Data = await fileData.arrayBuffer().then((buffer) =>
      Buffer.from(buffer).toString('base64')
    )

    // Generate diverse quiz questions using Gemini
    console.log('Generating diverse quiz questions with Gemini...')
    try {
      const quizResult = await geminiExtendedQuizModel.generateContent({
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
                text: `${EXTENDED_QUIZ_GENERATION_PROMPT}

## 문서 제목
${document.title}

## 지식 노드 정보
다음 지식 노드들에 대해 다양한 유형의 평가 문제를 총 ${Math.min(knowledgeNodes.length * 2, 20)}개 생성하세요:
${knowledgeNodes.map((node, index) => `
${index + 1}. ${node.name} (node_id: "${node.id}")
   - 설명: ${node.description}
   - 난이도 레벨: ${node.level}
   - 선수지식: ${node.prerequisites?.join(', ') || '없음'}
`).join('\n')}

## 필수 요구사항
1. 총 ${Math.min(knowledgeNodes.length * 2, 20)}개의 문제를 생성하세요 (각 노드당 1-2개)
2. 각 문제의 node_id 필드에는 위에 제공된 node_id 값을 그대로 사용하세요
3. 문제 유형을 다양하게 사용하세요:
   - multiple_choice: 30-40%
   - true_false: 20-30%
   - short_answer: 15-20%
   - fill_in_blank: 10-15%
   - matching: 10-15%
4. 난이도 분포: easy(30%), medium(50%), hard(20%)
5. JSON 형식을 정확히 따르세요`,
              },
            ],
          },
        ],
      })

      const quizResponse = quizResult.text || ''
      quizLogger.info('Quiz generation response received', {
        correlationId,
        documentId: id,
        metadata: {
          responseLength: quizResponse.length,
          responsePreview: quizResponse.substring(0, 200)
        }
      })

      if (quizResponse) {
        const quizData = parseGeminiResponse<ExtendedQuizResponse>(
          quizResponse,
          { correlationId, documentId: id, responseType: 'extended_quiz_regeneration' }
        )
        
        validateResponseStructure(
          quizData,
          ['questions'],
          { correlationId, documentId: id, responseType: 'extended_quiz_regeneration' }
        )
        quizLogger.info(`Generated ${quizData.questions?.length || 0} diverse questions`, {
          correlationId,
          documentId: id,
          metadata: {
            totalQuestions: quizData.questions?.length || 0,
            questionTypes: quizData.questions?.map(q => q.type),
            sampleQuestions: quizData.questions?.slice(0, 2)
          }
        })

        // Create node ID mapping - now we use actual node IDs
        const nodeIdMap: Record<string, string> = {}
        knowledgeNodes.forEach((node) => {
          nodeIdMap[node.id] = node.id  // Direct mapping since we're using actual IDs
          nodeIdMap[node.name] = node.id  // Also map by name as fallback
        })

        // Save quiz questions to database
        let savedCount = 0
        if (quizData.questions && Array.isArray(quizData.questions)) {
          for (const question of quizData.questions) {
            // Try to find the actual node ID
            let actualNodeId = question.node_id ? nodeIdMap[question.node_id] : null
            
            // If not found, try by name
            if (!actualNodeId && question.node_id) {
              const nodeByName = knowledgeNodes.find(n => n.name === question.node_id)
              if (nodeByName) {
                actualNodeId = nodeByName.id
              }
            }
            
            // If still no node_id, use first node as fallback
            if (!actualNodeId && knowledgeNodes.length > 0) {
              actualNodeId = knowledgeNodes[0].id
            }
            
            if (actualNodeId) {
              // Prepare base quiz item
              const quizItem: any = {
                document_id: id,
                node_id: actualNodeId,
                question: question.question,
                question_type: question.type,
                explanation: question.explanation || null,
                source_quote: question.source_quote || null,
                difficulty: question.difficulty || 'medium',
                is_assessment: true,
              }
              
              // Add type-specific fields
              switch (question.type) {
                case 'multiple_choice':
                  quizItem.options = question.options || []
                  quizItem.correct_answer = question.correct_answer || ''
                  break
                  
                case 'true_false':
                  quizItem.options = ['참', '거짓']
                  // ExtendedQuizSchema uses correct_answer_bool for true_false questions
                  quizItem.correct_answer = (question as any).correct_answer_bool ? '참' : '거짓'
                  break
                  
                case 'short_answer':
                  quizItem.correct_answer = question.acceptable_answers?.[0] || ''
                  quizItem.acceptable_answers = question.acceptable_answers || []
                  quizItem.hint = question.hint || null
                  break
                  
                case 'fill_in_blank':
                  quizItem.template = question.template || ''
                  quizItem.blanks = question.blanks || []
                  quizItem.correct_answer = question.blanks?.[0]?.answer || ''
                  break
                  
                case 'matching':
                  quizItem.left_items = question.left_items || []
                  quizItem.right_items = question.right_items || []
                  quizItem.correct_pairs = question.correct_pairs || []
                  quizItem.correct_answer = 'matching'
                  break
              }

              const { data: insertedQuiz, error: quizError } = await supabase
                .from('quiz_items')
                .insert(quizItem)
                .select()
                .single()

              if (quizError) {
                quizLogger.error(`Failed to save quiz for node ${question.node_id}`, {
                  correlationId,
                  documentId: id,
                  error: quizError,
                  metadata: {
                    nodeId: actualNodeId,
                    questionType: question.type,
                    errorCode: quizError.code,
                    errorDetails: quizError.details,
                    errorMessage: quizError.message,
                    errorHint: quizError.hint,
                    quizItem: quizItem,
                    failedInsert: {
                      document_id: quizItem.document_id,
                      node_id: quizItem.node_id,
                      question_type: quizItem.question_type,
                      options: quizItem.options,
                      difficulty: quizItem.difficulty
                    }
                  }
                })
              } else {
                quizLogger.info('Quiz item saved successfully', {
                  correlationId,
                  documentId: id,
                  metadata: {
                    quizItemId: insertedQuiz?.id,
                    nodeId: actualNodeId,
                    questionType: question.type,
                    question: question.question.substring(0, 100) + '...'
                  }
                })
                savedCount++
              }
            } else {
              quizLogger.warn('Could not find node mapping for quiz item', {
                correlationId,
                documentId: id,
                metadata: {
                  questionNodeId: question.node_id,
                  questionType: question.type,
                  availableNodes: knowledgeNodes.map(n => ({ id: n.id, name: n.name })),
                  quizQuestion: question.question
                }
              })
            }
          }
        }

        console.log(`Successfully saved ${savedCount} quiz questions`)
        
        // Update document quiz generation status
        const { error: updateError } = await supabase
          .from('documents')
          .update({
            quiz_generation_status: {
              generated: savedCount > 0,
              count: savedCount,
              last_attempt: new Date().toISOString()
            }
          })
          .eq('id', id)
          
        if (updateError) {
          quizLogger.error('Failed to update document quiz generation status', {
            correlationId,
            documentId: id,
            error: updateError
          })
        }
        
        // Verify actual saved count in database
        const { data: verifyQuizItems, error: verifyError } = await supabase
          .from('quiz_items')
          .select('id')
          .eq('document_id', id)
          .eq('is_assessment', true)
        
        const actualSavedCount = verifyQuizItems?.length || 0
        
        quizLogger.info('Quiz regeneration completed', {
          correlationId,
          documentId: id,
          metadata: {
            generatedCount: quizData.questions?.length || 0,
            reportedSavedCount: savedCount,
            actualSavedCount,
            discrepancy: savedCount !== actualSavedCount
          }
        })
        
        if (actualSavedCount === 0 && quizData.questions?.length > 0) {
          quizLogger.error('CRITICAL: Database verification shows no quiz items saved', {
            correlationId,
            documentId: id,
            metadata: {
              attemptedItems: quizData.questions.length,
              reportedSaved: savedCount,
              actualSaved: actualSavedCount
            }
          })
          
          return NextResponse.json({ 
            success: false, 
            message: 'Failed to save quiz questions to database',
            error: 'No quiz items were saved despite generation attempts'
          }, { status: 500 })
        }
        
        return NextResponse.json({ 
          success: true, 
          message: `Generated and saved ${actualSavedCount} diverse quiz questions`,
          count: actualSavedCount
        })
      } else {
        throw new Error('Empty response from Gemini')
      }
    } catch (error: any) {
      geminiLogger.error('Error generating quiz questions from Gemini', {
        correlationId,
        documentId: id,
        error: error,
        metadata: {
          errorMessage: error.message,
          errorStack: error.stack,
          errorDetails: error.details,
        }
      });

      if (error.message && error.message.includes('429')) {
        return NextResponse.json(
          { error: 'API 요청 사용량을 초과하여 퀴즈를 생성할 수 없습니다. 잠시 후 다시 시도해주세요.' },
          { status: 429 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to generate quiz questions', details: error.message },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}