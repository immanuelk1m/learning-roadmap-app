import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { geminiOXQuizModel } from '@/lib/gemini/client'
import { OX_QUIZ_GENERATION_PROMPT } from '@/lib/gemini/prompts'
import { OXQuizResponse } from '@/lib/gemini/schemas'
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

    // Generate O/X quiz questions using Gemini
    console.log('Generating O/X quiz questions with Gemini...')
    try {
      const quizResult = await geminiOXQuizModel.generateContent({
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
                text: `${OX_QUIZ_GENERATION_PROMPT}\n\n다음 지식 노드들에 대해 O/X 문제를 생성하세요:\n${JSON.stringify(knowledgeNodes.map((node, index) => ({
                  id: node.id,  // Use actual database ID
                  name: node.name,
                  description: node.description,
                  level: node.level,
                  prerequisites: node.prerequisites,
                  db_id: node.id  // Also include as db_id for clarity
                })), null, 2)}`,
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
        const quizData = parseGeminiResponse<OXQuizResponse>(
          quizResponse,
          { correlationId, documentId: id, responseType: 'ox_quiz_regeneration' }
        )
        
        validateResponseStructure(
          quizData,
          ['quiz_items'],
          { correlationId, documentId: id, responseType: 'ox_quiz_regeneration' }
        )
        quizLogger.info(`Generated ${quizData.quiz_items?.length || 0} O/X questions`, {
          correlationId,
          documentId: id,
          metadata: {
            quizItems: quizData.quiz_items?.length || 0,
            sampleItems: quizData.quiz_items?.slice(0, 2)
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
        if (quizData.quiz_items && Array.isArray(quizData.quiz_items)) {
          for (const item of quizData.quiz_items) {
            // Try to find the actual node ID
            let actualNodeId = nodeIdMap[item.node_id]
            
            // If not found, try by name
            if (!actualNodeId && item.node_id) {
              const nodeByName = knowledgeNodes.find(n => n.name === item.node_id)
              if (nodeByName) {
                actualNodeId = nodeByName.id
              }
            }
            
            if (actualNodeId) {
              const quizItem = {
                document_id: id,
                node_id: actualNodeId,
                question: item.question,
                question_type: 'true_false' as const,
                options: JSON.stringify(['O', 'X']), // JSONB expects JSON string
                correct_answer: item.correct_answer,
                explanation: item.explanation || null,
                difficulty: 1,
                is_assessment: true,
              }

              const { error: quizError } = await supabase
                .from('quiz_items')
                .insert(quizItem)

              if (quizError) {
                quizLogger.error(`Failed to save quiz for node ${item.node_id}`, {
                  correlationId,
                  documentId: id,
                  error: quizError,
                  metadata: {
                    nodeId: actualNodeId,
                    quizItem: item
                  }
                })
              } else {
                savedCount++
              }
            } else {
              quizLogger.warn('Could not find node mapping for quiz item', {
                correlationId,
                documentId: id,
                metadata: {
                  itemNodeId: item.node_id,
                  availableNodes: knowledgeNodes.map(n => ({ id: n.id, name: n.name })),
                  quizQuestion: item.question
                }
              })
            }
          }
        }

        console.log(`Successfully saved ${savedCount} quiz questions`)
        return NextResponse.json({ 
          success: true, 
          message: `Generated and saved ${savedCount} O/X quiz questions`,
          count: savedCount
        })
      } else {
        throw new Error('Empty response from Gemini')
      }
    } catch (error: any) {
      console.error('Error generating quiz questions:', error)
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