import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { geminiKnowledgeTreeModel, geminiOXQuizModel, uploadFileToGemini } from '@/lib/gemini/client'
import { KNOWLEDGE_TREE_PROMPT, OX_QUIZ_GENERATION_PROMPT, EXTENDED_QUIZ_GENERATION_PROMPT } from '@/lib/gemini/prompts'
import { KnowledgeTreeResponse, KnowledgeNode, OXQuizResponse } from '@/lib/gemini/schemas'
import { parseGeminiResponse, validateResponseStructure } from '@/lib/gemini/utils'
import { analyzeLogger, geminiLogger, supabaseLogger } from '@/lib/logger'
import Logger from '@/lib/logger'

// Increase timeout for the API route to handle large PDF processing
export const maxDuration = 300 // 300 seconds (5 minutes) timeout

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const timer = analyzeLogger.startTimer()
  const correlationId = request.headers.get('x-correlation-id') || Logger.generateCorrelationId()
  
  analyzeLogger.info('Document analysis API started', {
    correlationId,
    metadata: {
      timestamp: new Date().toISOString(),
      headers: Object.fromEntries(request.headers.entries())
    }
  })
  
  try {
    const { id } = await params
    analyzeLogger.info('Processing document', {
      correlationId,
      documentId: id
    })
    
    const supabase = await createClient()
    
    // Use fixed user ID
    const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

    // Get document info
    supabaseLogger.info('Fetching document from database', {
      correlationId,
      documentId: id,
      metadata: {
        table: 'documents',
        operation: 'select'
      }
    })
    
    const dbTimer = supabaseLogger.startTimer()
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('user_id', FIXED_USER_ID)
      .single()
    
    const dbDuration = dbTimer()
    
    if (docError) {
      supabaseLogger.error('Database error fetching document', {
        correlationId,
        documentId: id,
        error: docError,
        duration: dbDuration,
        metadata: {
          errorCode: docError.code,
          errorDetails: docError.details,
          errorHint: docError.hint
        }
      })
      return NextResponse.json({ error: 'Document not found', details: docError }, { status: 404 })
    }
    
    if (!document) {
      analyzeLogger.error('Document not found in database', {
        correlationId,
        documentId: id,
        duration: dbDuration
      })
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }
    
    supabaseLogger.info('Document fetched successfully', {
      correlationId,
      documentId: id,
      duration: dbDuration,
      metadata: {
        documentStatus: document.status,
        fileSize: document.file_size,
        filePath: document.file_path
      }
    })

    // Update status to processing
    supabaseLogger.info('Updating document status', {
      correlationId,
      documentId: id,
      metadata: {
        newStatus: 'processing',
        previousStatus: document.status
      }
    })
    
    const statusTimer = supabaseLogger.startTimer()
    const { data: updatedDoc, error: updateError } = await supabase
      .from('documents')
      .update({ status: 'processing' })
      .eq('id', id)
      .select()
      .single()
    
    const statusDuration = statusTimer()
    
    if (updateError) {
      supabaseLogger.error('Failed to update document status', {
        correlationId,
        documentId: id,
        error: updateError,
        duration: statusDuration,
        metadata: {
          errorCode: updateError.code,
          errorDetails: updateError.details
        }
      })
    } else {
      supabaseLogger.info('Document status updated', {
        correlationId,
        documentId: id,
        duration: statusDuration,
        metadata: {
          updatedDocument: updatedDoc
        }
      })
    }

    try {
      // Log memory usage before processing
      analyzeLogger.logMemoryUsage('before_pdf_processing')
      
      // Debug: Log document info
      analyzeLogger.debug('Document details', {
        correlationId,
        documentId: id,
        metadata: {
          title: document.title,
          filePath: document.file_path,
          fileSize: `${(document.file_size / (1024 * 1024)).toFixed(2)} MB`,
          status: document.status
        }
      })

      // Check if file exists in storage
      const storageListTimer = supabaseLogger.startTimer()
      const storageDir = document.file_path.split('/').slice(0, -1).join('/')
      
      supabaseLogger.info('Checking storage for file existence', {
        correlationId,
        documentId: id,
        metadata: {
          bucket: 'pdf-documents',
          directory: storageDir,
          fileName: document.file_path.split('/').pop()
        }
      })
      
      const { data: fileList, error: listError } = await supabase.storage
        .from('pdf-documents')
        .list(storageDir)

      const listDuration = storageListTimer()
      
      if (listError) {
        supabaseLogger.error('Storage list error', {
          correlationId,
          documentId: id,
          error: listError,
          duration: listDuration,
          metadata: {
            bucket: 'pdf-documents',
            directory: storageDir
          }
        })
      } else {
        supabaseLogger.info('Storage directory listing successful', {
          correlationId,
          documentId: id,
          duration: listDuration,
          metadata: {
            filesFound: fileList?.length || 0,
            fileNames: fileList?.map(f => f.name) || []
          }
        })
      }

      // Get file from storage with retry logic for timeout issues
      let fileData: Blob | null = null
      let downloadError: any = null
      let retries = 3
      const maxRetries = 3
      
      analyzeLogger.info('Starting PDF download from storage', {
        correlationId,
        documentId: id,
        metadata: {
          filePath: document.file_path,
          fileSize: document.file_size,
          maxRetries
        }
      })
      
      while (retries > 0 && !fileData) {
        const attemptNum = maxRetries - retries + 1
        const downloadTimer = supabaseLogger.startTimer()
        
        try {
          supabaseLogger.info('Attempting PDF download', {
            correlationId,
            documentId: id,
            metadata: {
              attempt: attemptNum,
              retriesLeft: retries - 1
            }
          })
          
          const downloadResult = await supabase.storage
            .from('pdf-documents')
            .download(document.file_path)
          
          const downloadDuration = downloadTimer()
          
          fileData = downloadResult.data
          downloadError = downloadResult.error
          
          if (!downloadError && fileData) {
            supabaseLogger.info('PDF download successful', {
              correlationId,
              documentId: id,
              duration: downloadDuration,
              metadata: {
                attempt: attemptNum,
                downloadedSize: fileData.size,
                downloadSpeed: `${((fileData.size / 1024 / 1024) / (downloadDuration / 1000)).toFixed(2)} MB/s`
              }
            })
          } else if (downloadError) {
            supabaseLogger.warn('PDF download attempt failed', {
              correlationId,
              documentId: id,
              duration: downloadDuration,
              error: downloadError,
              metadata: {
                attempt: attemptNum,
                errorCode: downloadError.code,
                willRetry: retries > 1
              }
            })
          }
          
          if (downloadError) {
            if (retries > 1 && downloadError.message?.includes('timeout')) {
              const retryDelay = 2000 * (maxRetries - retries + 1) // Exponential backoff
              supabaseLogger.info('Retrying download after timeout', {
                correlationId,
                documentId: id,
                metadata: {
                  retryDelay,
                  nextAttempt: attemptNum + 1
                }
              })
              await new Promise(resolve => setTimeout(resolve, retryDelay))
              retries--
              continue
            }
            break
          }
        } catch (error: any) {
          downloadError = error
          supabaseLogger.error('Download attempt error', {
            correlationId,
            documentId: id,
            error,
            metadata: {
              attempt: attemptNum,
              errorType: error.name,
              errorMessage: error.message,
              willRetry: retries > 1
            }
          })
          
          if (retries > 1) {
            const retryDelay = 2000 * (maxRetries - retries + 1)
            await new Promise(resolve => setTimeout(resolve, retryDelay))
            retries--
            continue
          }
          break
        }
      }

      if (downloadError) {
        analyzeLogger.error('Failed to download PDF after all retries', {
          correlationId,
          documentId: id,
          error: downloadError,
          metadata: {
            totalAttempts: maxRetries,
            filePath: document.file_path,
            errorDetails: JSON.stringify(downloadError, null, 2)
          }
        })
        const errorMessage = downloadError?.message || downloadError?.toString() || 'Unknown download error'
        throw new Error(`Failed to download file: ${errorMessage}`)
      }

      if (!fileData) {
        analyzeLogger.error('No file data received from storage', {
          correlationId,
          documentId: id,
          metadata: {
            filePath: document.file_path
          }
        })
        throw new Error('Failed to download file: No data received')
      }

      analyzeLogger.info('PDF downloaded successfully', {
        correlationId,
        documentId: id,
        metadata: {
          fileSize: fileData.size,
          fileSizeMB: `${(fileData.size / (1024 * 1024)).toFixed(2)} MB`
        }
      })
      
      // For large files, check if we should use a different approach
      if (fileData.size > 10 * 1024 * 1024) { // 10MB
        analyzeLogger.warn('Large file detected', {
          correlationId,
          documentId: id,
          metadata: {
            fileSize: fileData.size,
            fileSizeMB: `${(fileData.size / (1024 * 1024)).toFixed(2)} MB`,
            threshold: '10 MB'
          }
        })
      }

      // Upload file to Gemini File API instead of base64 conversion
      analyzeLogger.info('Uploading PDF to Gemini File API', {
        correlationId,
        documentId: id,
        metadata: {
          fileSize: fileData.size,
          fileSizeMB: `${(fileData.size / (1024 * 1024)).toFixed(2)} MB`
        }
      })
      
      const uploadTimer = analyzeLogger.startTimer()
      let uploadedFile
      try {
        uploadedFile = await uploadFileToGemini(fileData, 'application/pdf')
      } catch (uploadError: any) {
        analyzeLogger.error('Failed to upload file to Gemini', {
          correlationId,
          documentId: id,
          error: uploadError,
          metadata: {
            errorMessage: uploadError.message
          }
        })
        throw new Error(`Failed to upload file to Gemini: ${uploadError.message}`)
      }
      const uploadDuration = uploadTimer()
      
      analyzeLogger.info('File uploaded to Gemini successfully', {
        correlationId,
        documentId: id,
        duration: uploadDuration,
        metadata: {
          fileUri: uploadedFile.uri,
          fileName: uploadedFile.name,
          mimeType: uploadedFile.mimeType,
          uploadSpeed: `${(fileData.size / 1024 / 1024 / (uploadDuration / 1000)).toFixed(2)} MB/s`
        }
      })

      // Log memory usage before Gemini call
      analyzeLogger.logMemoryUsage('before_gemini_analysis')

      // Analyze with Gemini using structured output with retry logic
      geminiLogger.info('Sending PDF to Gemini for knowledge tree extraction', {
        correlationId,
        documentId: id,
        metadata: {
          model: 'gemini-2.5-flash',
          promptLength: KNOWLEDGE_TREE_PROMPT.length,
          pdfSize: fileData.size
        }
      })
      
      let response = ''
      let geminiDuration = 0
      let geminiRetries = 3
      let geminiError: any = null
      
      while (geminiRetries > 0 && !response) {
        const geminiTimer = geminiLogger.startTimer()
        try {
          const result = await geminiKnowledgeTreeModel.generateContent({
            contents: [
              {
                parts: [
                  {
                    fileData: {
                      fileUri: uploadedFile.uri,
                      mimeType: uploadedFile.mimeType || 'application/pdf',
                    },
                  },
                  {
                    text: KNOWLEDGE_TREE_PROMPT,
                  },
                ],
              },
            ],
          })
          
          geminiDuration = geminiTimer()
          response = result.text || ''
          
          // With structured output, the response should always be valid JSON
          if (response) {
            try {
              const parsedResponse = parseGeminiResponse<KnowledgeTreeResponse>(
                response,
                { correlationId, documentId: id, responseType: 'knowledge_tree' }
              )
              // Validate the structure
              validateResponseStructure(
                parsedResponse,
                ['nodes'],
                { correlationId, documentId: id, responseType: 'knowledge_tree' }
              )
              if (Array.isArray(parsedResponse.nodes)) {
                // Valid response structure
                break
              } else {
                throw new Error('Invalid response structure: nodes is not an array')
              }
            } catch (parseError) {
              geminiLogger.warn('Invalid response from Gemini, retrying', {
                correlationId,
                documentId: id,
                metadata: {
                  attempt: 4 - geminiRetries,
                  responseLength: response.length,
                  parseError: (parseError as Error).message
                }
              })
              response = ''
              geminiError = parseError
            }
          }
        } catch (error: any) {
          geminiDuration = geminiTimer()
          geminiError = error
          geminiLogger.error('Gemini API error', {
            correlationId,
            documentId: id,
            error,
            metadata: {
              attempt: 4 - geminiRetries,
              willRetry: geminiRetries > 1
            }
          })
        }
        
        geminiRetries--
        if (geminiRetries > 0 && !response) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
      
      if (!response) {
        geminiLogger.error('Empty response from Gemini API after all retries', {
          correlationId,
          documentId: id,
          metadata: {
            lastError: geminiError,
            totalRetries: 3
          }
        })
        throw new Error(`Empty response from AI: ${geminiError?.message || 'Unknown error'}`)
      }
      
      geminiLogger.info('Gemini response received', {
        correlationId,
        documentId: id,
        duration: geminiDuration,
        metadata: {
          responseLength: response.length,
          responsePreview: response.substring(0, 200),
          processingSpeed: `${(fileData.size / 1024 / 1024 / (geminiDuration / 1000)).toFixed(2)} MB/s`
        }
      })
      
      // Parse the final response
      const knowledgeTree = parseGeminiResponse<KnowledgeTreeResponse>(
        response,
        { correlationId, documentId: id, responseType: 'knowledge_tree' }
      )
      
      // Validate the final structure
      validateResponseStructure(
        knowledgeTree,
        ['nodes'],
        { correlationId, documentId: id, responseType: 'knowledge_tree' }
      )
      
      geminiLogger.info('Successfully parsed knowledge tree', {
        correlationId,
        documentId: id,
        metadata: {
          totalNodes: knowledgeTree.nodes?.length || 0,
          nodeLevels: [...new Set(knowledgeTree.nodes?.map(n => n.level) || [])],
          nodeNames: knowledgeTree.nodes?.slice(0, 5).map(n => n.name) || []
        }
      })

      // Save flat knowledge nodes to database with batch operations
      const saveFlatNodes = async (nodes: any[]) => {
        supabaseLogger.info('Starting knowledge nodes batch save operation', {
          correlationId,
          documentId: id,
          metadata: {
            nodeCount: nodes?.length || 0,
            operation: 'batch_insert'
          }
        })
        
        if (!nodes || !Array.isArray(nodes)) {
          supabaseLogger.warn('Invalid nodes array provided', {
            correlationId,
            documentId: id,
            metadata: {
              nodesType: typeof nodes,
              nodesValue: nodes
            }
          })
          return {}
        }

        // Create a mapping of temporary IDs to actual database IDs
        const idMapping: Record<string, string> = {}
        
        // Prepare all nodes data for batch insert
        const nodesData = nodes.map((node, i) => ({
          document_id: id,
          user_id: FIXED_USER_ID, // Add user_id field
          subject_id: document.subject_id, // Add subject_id from document
          parent_id: null, // Will be updated in second pass
          name: node.name || 'Untitled Node',
          description: node.description || '',
          level: node.level || 0,
          position: i,
          prerequisites: node.prerequisites || [],
        }))
        
        supabaseLogger.info('Performing batch insert of knowledge nodes', {
          correlationId,
          documentId: id,
          metadata: {
            batchSize: nodesData.length
          }
        })
        
        // Batch insert all nodes at once
        const batchTimer = supabaseLogger.startTimer()
        const { data: savedNodes, error: batchError } = await supabase
          .from('knowledge_nodes')
          .insert(nodesData)
          .select()
        
        const batchDuration = batchTimer()
        
        if (batchError) {
          supabaseLogger.error('Batch insert of knowledge nodes failed', {
            correlationId,
            documentId: id,
            error: batchError,
            duration: batchDuration,
            metadata: {
              errorCode: batchError.code,
              errorDetails: batchError.details,
              attemptedCount: nodesData.length
            }
          })
          throw new Error(`Failed to batch insert knowledge nodes: ${batchError.message}`)
        }
        
        supabaseLogger.info('Batch insert of knowledge nodes successful', {
          correlationId,
          documentId: id,
          duration: batchDuration,
          metadata: {
            insertedCount: savedNodes?.length || 0,
            insertSpeed: `${((nodesData.length / (batchDuration / 1000))).toFixed(2)} nodes/sec`
          }
        })
        
        // Build ID mapping
        if (savedNodes) {
          savedNodes.forEach((savedNode, i) => {
            if (nodes[i]?.id && savedNode.id) {
              idMapping[nodes[i].id] = savedNode.id
            }
          })
        }
        
        // Second pass: Batch update parent_id references
        const parentUpdates = []
        for (const node of nodes) {
          if (node.parent_id && node.id && idMapping[node.id]) {
            const actualNodeId = idMapping[node.id]
            const actualParentId = idMapping[node.parent_id]
            
            if (actualParentId) {
              parentUpdates.push({
                id: actualNodeId,
                parent_id: actualParentId
              })
            }
          }
        }
        
        if (parentUpdates.length > 0) {
          supabaseLogger.info('Batch updating parent-child relationships', {
            correlationId,
            documentId: id,
            metadata: {
              updateCount: parentUpdates.length
            }
          })
          
          const updateTimer = supabaseLogger.startTimer()
          
          // Batch update parent_id for each node
          let updateError = null
          for (const update of parentUpdates) {
            const { error } = await supabase
              .from('knowledge_nodes')
              .update({ parent_id: update.parent_id })
              .eq('id', update.id)
            
            if (error) {
              updateError = error
              break
            }
          }
          
          const updateDuration = updateTimer()
          
          if (updateError) {
            supabaseLogger.error('Batch update of parent relationships failed', {
              correlationId,
              documentId: id,
              error: updateError,
              duration: updateDuration,
              metadata: {
                errorCode: updateError.code,
                errorDetails: updateError.details,
                attemptedCount: parentUpdates.length
              }
            })
          } else {
            supabaseLogger.info('Batch update of parent relationships successful', {
              correlationId,
              documentId: id,
              duration: updateDuration,
              metadata: {
                updatedCount: parentUpdates.length,
                updateSpeed: `${((parentUpdates.length / (updateDuration / 1000))).toFixed(2)} updates/sec`
              }
            })
          }
        }
        
        return idMapping
      }

      // Ensure knowledgeTree.nodes exists and is an array
      if (!knowledgeTree.nodes || !Array.isArray(knowledgeTree.nodes)) {
        analyzeLogger.error('Invalid knowledge tree structure', {
          correlationId,
          documentId: id,
          metadata: {
            receivedStructure: typeof knowledgeTree,
            hasNodes: !!knowledgeTree.nodes,
            nodesType: knowledgeTree.nodes ? typeof knowledgeTree.nodes : 'undefined'
          }
        })
        throw new Error('Invalid knowledge tree structure: nodes array is missing or invalid')
      }
      
      analyzeLogger.info('Saving knowledge nodes to database', {
        correlationId,
        documentId: id,
        metadata: {
          totalNodes: knowledgeTree.nodes.length
        }
      })
      
      const nodesTimer = analyzeLogger.startTimer()
      const nodeIdMapping = await saveFlatNodes(knowledgeTree.nodes)
      const nodesDuration = nodesTimer()
      
      analyzeLogger.info('Knowledge nodes saved successfully', {
        correlationId,
        documentId: id,
        duration: nodesDuration,
        metadata: {
          mappedNodes: Object.keys(nodeIdMapping).length,
          totalNodes: knowledgeTree.nodes.length
        }
      })
      
      // Get the saved nodes from database with their actual IDs
      const { data: savedNodes, error: fetchNodesError } = await supabase
        .from('knowledge_nodes')
        .select('*')
        .eq('document_id', id)
        .order('position', { ascending: true })
      
      if (fetchNodesError || !savedNodes || savedNodes.length === 0) {
        analyzeLogger.error('Failed to fetch saved nodes for quiz generation', {
          correlationId,
          documentId: id,
          error: fetchNodesError,
          metadata: {
            savedNodesCount: savedNodes?.length || 0
          }
        })
        throw new Error('Failed to fetch saved nodes for quiz generation')
      }
      
      analyzeLogger.info('Fetched saved nodes for quiz generation', {
        correlationId,
        documentId: id,
        metadata: {
          savedNodesCount: savedNodes.length,
          sampleNodes: savedNodes.slice(0, 3).map(n => ({ id: n.id, name: n.name }))
        }
      })
      
      // Generate O/X quiz questions for knowledge assessment
      geminiLogger.info('Starting O/X quiz generation', {
        correlationId,
        documentId: id,
        metadata: {
          nodeCount: savedNodes.length,
          promptLength: OX_QUIZ_GENERATION_PROMPT.length
        }
      })
      
      // Log memory before quiz generation
      analyzeLogger.logMemoryUsage('before_quiz_generation')
      
      try {
        const quizTimer = geminiLogger.startTimer()
        
        // Pass actual database nodes to Gemini
        const nodesForQuiz = savedNodes.map(node => ({
          id: node.id,  // Use actual database ID
          name: node.name,
          description: node.description,
          level: node.level,
          prerequisites: node.prerequisites || []
        }))
        
        let quizResponse = ''
        let quizDuration = 0
        let quizRetries = 3
        let quizGeminiError: any = null
        
        while (quizRetries > 0 && !quizResponse) {
          const attemptTimer = geminiLogger.startTimer()
          try {
            const quizResult = await geminiOXQuizModel.generateContent({
              contents: [
                {
                  parts: [
                    {
                      fileData: {
                        fileUri: uploadedFile.uri,
                        mimeType: uploadedFile.mimeType || 'application/pdf',
                      },
                    },
                    {
                      text: `${OX_QUIZ_GENERATION_PROMPT}\n\n다음 지식 노드들에 대해 O/X 문제를 생성하세요:\n${JSON.stringify(nodesForQuiz, null, 2)}`,
                    },
                  ],
                },
              ],
            })
            
            const attemptDuration = attemptTimer()
            quizDuration += attemptDuration
            quizResponse = quizResult.text || ''
            
            // With structured output, the response should always be valid JSON
            if (quizResponse) {
              try {
                const parsedQuizResponse = parseGeminiResponse<OXQuizResponse>(
                  quizResponse,
                  { correlationId, documentId: id, responseType: 'ox_quiz' }
                )
                // Validate the structure
                validateResponseStructure(
                  parsedQuizResponse,
                  ['quiz_items'],
                  { correlationId, documentId: id, responseType: 'ox_quiz' }
                )
                if (Array.isArray(parsedQuizResponse.quiz_items)) {
                  // Valid response structure
                  break
                } else {
                  throw new Error('Invalid quiz response structure: quiz_items is not an array')
                }
              } catch (parseError) {
                geminiLogger.warn('Invalid quiz response from Gemini, retrying', {
                  correlationId,
                  documentId: id,
                  metadata: {
                    attempt: 4 - quizRetries,
                    responseLength: quizResponse.length,
                    parseError: (parseError as Error).message
                  }
                })
                quizResponse = ''
                quizGeminiError = parseError
              }
            }
          } catch (error: any) {
            const attemptDuration = attemptTimer()
            quizDuration += attemptDuration
            quizGeminiError = error
            geminiLogger.error('Gemini quiz generation API error', {
              correlationId,
              documentId: id,
              error,
              metadata: {
                attempt: 4 - quizRetries,
                willRetry: quizRetries > 1
              }
            })
          }
          
          quizRetries--
          if (quizRetries > 0 && !quizResponse) {
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
        }
        
        geminiLogger.info('Quiz generation response received', {
          correlationId,
          documentId: id,
          duration: quizDuration,
          metadata: {
            responseLength: quizResponse.length,
            responsePreview: quizResponse.substring(0, 200)
          }
        })
        
        let savedCount = 0
        let failedCount = 0
        
        if (quizResponse) {
          try {
            const quizData = parseGeminiResponse<OXQuizResponse>(
              quizResponse,
              { correlationId, documentId: id, responseType: 'ox_quiz' }
            )
            
            geminiLogger.info('Quiz response parsed successfully', {
              correlationId,
              documentId: id,
              metadata: {
                quizItemCount: quizData.quiz_items?.length || 0,
                nodeIds: quizData.quiz_items?.map((item: any) => item.node_id) || [],
                availableMappings: Object.keys(nodeIdMapping),
                mappingEntries: Object.entries(nodeIdMapping).slice(0, 5)
              }
            })
            
            // Save quiz questions to database with batch operations
            if (quizData.quiz_items && Array.isArray(quizData.quiz_items)) {
              const saveTimer = supabaseLogger.startTimer()
              
              // Prepare all valid quiz items for batch insert
              const quizItemsToInsert = []
              const skippedItems = []
              
              for (const item of quizData.quiz_items) {
                // Since we passed actual database IDs to Gemini, the node_id should be valid
                const nodeId = item.node_id
                
                // Verify the node exists in our saved nodes
                const nodeExists = savedNodes.find(n => n.id === nodeId)
                
                if (nodeExists) {
                  quizItemsToInsert.push({
                    document_id: id,
                    user_id: FIXED_USER_ID, // Add user_id field
                    subject_id: document.subject_id, // Add subject_id from document
                    node_id: nodeId,
                    question: item.question,
                    question_type: 'true_false' as const,
                    options: ['O', 'X'], // Pass array directly to Supabase client for JSONB
                    correct_answer: item.correct_answer,
                    explanation: item.explanation,
                    difficulty: 'easy' as const, // Use valid difficulty value
                    is_assessment: true,
                  })
                } else {
                  skippedItems.push({
                    nodeId: item.node_id,
                    question: item.question
                  })
                  failedCount++
                }
              }
              
              // Batch insert all valid quiz items at once
              if (quizItemsToInsert.length > 0) {
                supabaseLogger.info('Performing batch insert of quiz items', {
                  correlationId,
                  documentId: id,
                  metadata: {
                    batchSize: quizItemsToInsert.length,
                    skippedCount: skippedItems.length
                  }
                })
                
                const { data: insertedQuizItems, error: batchQuizError } = await supabase
                  .from('quiz_items')
                  .insert(quizItemsToInsert)
                  .select()
                
                if (batchQuizError) {
                  supabaseLogger.error('Batch insert of quiz items failed', {
                    correlationId,
                    documentId: id,
                    error: batchQuizError,
                    metadata: {
                      errorCode: batchQuizError.code,
                      errorDetails: batchQuizError.details,
                      errorMessage: batchQuizError.message,
                      attemptedCount: quizItemsToInsert.length
                    }
                  })
                  failedCount += quizItemsToInsert.length
                } else {
                  savedCount = insertedQuizItems?.length || 0
                  supabaseLogger.info('Batch insert of quiz items successful', {
                    correlationId,
                    documentId: id,
                    metadata: {
                      insertedCount: savedCount,
                      sampleQuizIds: insertedQuizItems?.slice(0, 3).map(q => q.id)
                    }
                  })
                }
              }
              
              if (skippedItems.length > 0) {
                supabaseLogger.warn('Some quiz items were skipped due to invalid node references', {
                  correlationId,
                  documentId: id,
                  metadata: {
                    skippedCount: skippedItems.length,
                    skippedItems: skippedItems.slice(0, 3)
                  }
                })
              }
              
              const saveDuration = saveTimer()
              supabaseLogger.info('Quiz items batch save operation completed', {
                correlationId,
                documentId: id,
                duration: saveDuration,
                metadata: {
                  totalItems: quizData.quiz_items.length,
                  savedCount,
                  failedCount,
                  successRate: `${((savedCount / quizData.quiz_items.length) * 100).toFixed(2)}%`,
                  insertSpeed: savedCount > 0 ? `${((savedCount / (saveDuration / 1000))).toFixed(2)} items/sec` : 'N/A'
                }
              })
              
              // If no quiz items were saved, this is a critical error
              if (savedCount === 0 && quizData.quiz_items.length > 0) {
                analyzeLogger.error('CRITICAL: No quiz items were saved', {
                  correlationId,
                  documentId: id,
                  metadata: {
                    attemptedItems: quizData.quiz_items.length,
                    nodeIdMapping: Object.entries(nodeIdMapping).slice(0, 5),
                    sampleQuizItems: quizData.quiz_items.slice(0, 3)
                  }
                })
              }
              
              // Verify actual saved count in database
              const { data: savedQuizItems, error: countError } = await supabase
                .from('quiz_items')
                .select('id')
                .eq('document_id', id)
                .eq('is_assessment', true)
              
              const actualSavedCount = savedQuizItems?.length || 0
              
              supabaseLogger.info('Quiz items verification', {
                correlationId,
                documentId: id,
                metadata: {
                  reportedSavedCount: savedCount,
                  actualSavedCount,
                  discrepancy: savedCount !== actualSavedCount
                }
              })
              
              if (actualSavedCount === 0 && quizData.quiz_items.length > 0) {
                analyzeLogger.error('CRITICAL: Database verification shows no quiz items saved', {
                  correlationId,
                  documentId: id,
                  metadata: {
                    attemptedItems: quizData.quiz_items.length,
                    reportedSaved: savedCount,
                    actualSaved: actualSavedCount
                  }
                })
              }
            }
          } catch (quizParseError: any) {
            geminiLogger.error('Failed to parse quiz response', {
              correlationId,
              documentId: id,
              error: quizParseError,
              metadata: {
                errorType: quizParseError.name,
                errorMessage: quizParseError.message,
                responseLength: quizResponse.length,
                responseStart: quizResponse.substring(0, 200)
              }
            })
            // Continue without failing the entire process
          }
        }
      } catch (quizError: any) {
        geminiLogger.error('Failed to generate O/X quiz questions', {
          correlationId,
          documentId: id,
          error: quizError,
          metadata: {
            errorType: quizError.name,
            errorMessage: quizError.message,
            nodeCount: knowledgeTree.nodes.length
          }
        })
        // Continue without failing the entire process
      }

      // Validate that quiz generation was successful
      const { data: savedQuizItems } = await supabase
        .from('quiz_items')
        .select('id')
        .eq('document_id', id)
        .eq('is_assessment', true)
      
      const quizValidationSuccess = savedQuizItems && savedQuizItems.length > 0
      
      if (!quizValidationSuccess) {
        analyzeLogger.error('Document completed but no O/X quiz items were saved', {
          correlationId,
          documentId: id,
          metadata: {
            nodeCount: knowledgeTree.nodes.length,
            expectedQuizCount: knowledgeTree.nodes.length,
            actualQuizCount: savedQuizItems?.length || 0
          }
        })
      }

      // Extended quiz generation will be done on-demand by the user
      // This allows users to control when to generate practice questions
      const extendedQuizCount = 0

      // Get total quiz count after all generation
      const { data: totalQuizItems } = await supabase
        .from('quiz_items')
        .select('id, is_assessment')
        .eq('document_id', id)
      
      const assessmentCount = totalQuizItems?.filter(q => q.is_assessment).length || 0
      const practiceCount = totalQuizItems?.filter(q => !q.is_assessment).length || 0
      
      // Update document status
      supabaseLogger.info('Updating document status to completed', {
        correlationId,
        documentId: id,
        metadata: {
          quizGenerationSuccess: quizValidationSuccess,
          assessmentQuizCount: assessmentCount,
          practiceQuizCount: practiceCount,
          totalQuizCount: totalQuizItems?.length || 0
        }
      })
      
      const completionTimer = supabaseLogger.startTimer()
      const { data: completedDoc, error: completeError } = await supabase
        .from('documents')
        .update({ 
          status: 'completed',
          quiz_generation_status: {
            generated: (totalQuizItems?.length || 0) > 0,
            count: totalQuizItems?.length || 0,
            assessment_count: assessmentCount,
            practice_count: practiceCount,
            last_attempt: new Date().toISOString()
          }
        })
        .eq('id', id)
        .select()
        .single()
      
      const completionDuration = completionTimer()
      
      if (completeError) {
        supabaseLogger.error('Failed to update status to completed', {
          correlationId,
          documentId: id,
          error: completeError,
          duration: completionDuration,
          metadata: {
            errorCode: completeError.code,
            errorDetails: completeError.details
          }
        })
      } else {
        supabaseLogger.info('Document status updated to completed', {
          correlationId,
          documentId: id,
          duration: completionDuration,
          metadata: {
            completedDocument: completedDoc
          }
        })
        
        // Practice quiz will be generated after user completes O/X assessment
        analyzeLogger.info('O/X assessment quiz generated. Practice quiz will be created after assessment completion.', {
          correlationId,
          documentId: id,
          metadata: {
            nodeCount: knowledgeTree.nodes.length,
            assessmentQuizCount: assessmentCount
          }
        })
      }

      // Log final memory usage
      analyzeLogger.logMemoryUsage('after_analysis_complete')
      
      const totalDuration = timer()
      analyzeLogger.info('Document analysis completed successfully', {
        correlationId,
        documentId: id,
        duration: totalDuration,
        metadata: {
          fileName: document.title,
          fileSize: document.file_size,
          nodeCount: knowledgeTree.nodes.length,
          processingSpeed: `${(document.file_size / 1024 / 1024 / (totalDuration / 1000)).toFixed(2)} MB/s`
        }
      })
      
      analyzeLogger.logApiResponse('/api/documents/[id]/analyze', 200, totalDuration, {
        correlationId,
        documentId: id
      })
      
      return NextResponse.json({ success: true })
    } catch (error: any) {
      const errorDuration = timer()
      
      analyzeLogger.error('Document analysis failed', {
        correlationId,
        documentId: id,
        error,
        duration: errorDuration,
        metadata: {
          errorType: error.constructor.name,
          errorMessage: error.message,
          errorStack: error.stack,
          documentId: id
        }
      })
      
      // Update status to failed
      supabaseLogger.info('Updating document status to failed', {
        correlationId,
        documentId: id
      })
      const { data: failedDoc, error: failError } = await supabase
        .from('documents')
        .update({ status: 'failed' })
        .eq('id', id)
        .select()
        .single()
      
      if (failError) {
        supabaseLogger.error('Failed to update status to failed', {
          correlationId,
          documentId: id,
          error: failError,
          metadata: {
            errorCode: failError.code,
            errorDetails: failError.details
          }
        })
      } else {
        supabaseLogger.info('Document status updated to failed', {
          correlationId,
          documentId: id,
          metadata: {
            failedDocument: failedDoc
          }
        })
      }

      analyzeLogger.logApiResponse('/api/documents/[id]/analyze', 500, errorDuration, {
        correlationId,
        documentId: id,
        error: error.message || error.toString()
      })
      
      return NextResponse.json(
        { error: 'Analysis failed', details: error.message || error.toString() },
        { status: 500 }
      )
    }
  } catch (error: any) {
    const duration = Date.now() - startTime
    
    analyzeLogger.error('API error (outer catch)', {
      correlationId,
      error,
      duration,
      metadata: {
        errorType: error.constructor.name,
        errorMessage: error.message,
        errorStack: error.stack
      }
    })
    
    analyzeLogger.logApiResponse('/api/documents/[id]/analyze', 500, duration, {
      correlationId,
      error: error.message
    })
    
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}