import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { geminiCombinedModel, uploadFileToGemini } from '@/lib/gemini/client'
import { KNOWLEDGE_TREE_PROMPT } from '@/lib/gemini/prompts'
import { parseGeminiResponse, validateResponseStructure } from '@/lib/gemini/utils'
import { analyzeLogger, geminiLogger, supabaseLogger } from '@/lib/logger'
import Logger from '@/lib/logger'

// Increase timeout for the API route to handle large PDF processing
export const maxDuration = 300 // 300 seconds (5 minutes) timeout

interface KnowledgeTreeResponse {
  nodes: any[]
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const timer = analyzeLogger.startTimer()
  const correlationId = request.headers.get('x-correlation-id') || Logger.generateCorrelationId()
  
  analyzeLogger.info('📋 Document analysis API started', {
    correlationId,
    metadata: {
      timestamp: new Date().toISOString(),
      headers: Object.fromEntries(request.headers.entries()),
      processSteps: [
        '1. PDF Download from Storage',
        '2. Upload to Gemini File API',
        '3. Knowledge Tree Generation',
        '4. Save Knowledge Nodes to DB'
      ]
    }
  })
  
  try {
    const { id } = await params
    analyzeLogger.info('🔄 Step 0/5: Initializing document processing', {
      correlationId,
      documentId: id,
      metadata: {
        step: 'initialization',
        progress: 0
      }
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

      // Get file from storage with retry logic for timeout issues
      let fileData: Blob | null = null
      let downloadError: any = null
      let retries = 3
      const maxRetries = 3
      
      analyzeLogger.info('📥 Step 1/5: Starting PDF download from storage', {
        correlationId,
        documentId: id,
        metadata: {
          step: 'pdf_download',
          progress: 20,
          filePath: document.file_path,
          fileSize: document.file_size,
          fileSizeMB: `${(document.file_size / (1024 * 1024)).toFixed(2)} MB`,
          maxRetries,
          estimatedTime: document.file_size > 10 * 1024 * 1024 ? 'May take longer for large file' : 'Should be quick'
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

      analyzeLogger.info('✅ Step 1/5 Complete: PDF downloaded successfully', {
        correlationId,
        documentId: id,
        metadata: {
          step: 'pdf_download',
          status: 'completed',
          progress: 20,
          fileSize: fileData.size,
          fileSizeMB: `${(fileData.size / (1024 * 1024)).toFixed(2)} MB`,
          downloadTime: `${((Date.now() - startTime) / 1000).toFixed(2)}s`
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
      analyzeLogger.info('📤 Step 2/5: Uploading PDF to Gemini File API', {
        correlationId,
        documentId: id,
        metadata: {
          step: 'gemini_upload',
          progress: 40,
          fileSize: fileData.size,
          fileSizeMB: `${(fileData.size / (1024 * 1024)).toFixed(2)} MB`,
          expectedDuration: 'Depends on file size and network speed'
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
      
      analyzeLogger.info('✅ Step 2/5 Complete: File uploaded to Gemini', {
        correlationId,
        documentId: id,
        duration: uploadDuration,
        metadata: {
          step: 'gemini_upload',
          status: 'completed',
          progress: 40,
          fileUri: uploadedFile.uri,
          fileName: uploadedFile.name,
          mimeType: uploadedFile.mimeType,
          uploadSpeed: `${(fileData.size / 1024 / 1024 / (uploadDuration / 1000)).toFixed(2)} MB/s`,
          totalElapsed: `${((Date.now() - startTime) / 1000).toFixed(2)}s`
        }
      })

      // Log memory usage before Gemini call
      analyzeLogger.logMemoryUsage('before_gemini_analysis')

      // Analyze with Gemini using prompt for Knowledge Tree
      geminiLogger.info('🤖 Step 3/4: Generating Knowledge Tree', {
        correlationId,
        documentId: id,
        metadata: {
          step: 'knowledge_tree_generation',
          progress: 60,
          model: 'gemini-2.5-flash',
          promptLength: KNOWLEDGE_TREE_PROMPT.length,
          promptTokensEstimate: Math.ceil(KNOWLEDGE_TREE_PROMPT.length / 4),
          pdfSize: fileData.size,
          pdfPages: document.page_count || 'Unknown',
          expectedProcessingTime: 'This may take 45-60 seconds'
        }
      })
      
      let response = ''
      let geminiDuration = 0
      let geminiError: any = null
      
      // Single attempt - no automatic retries for 429 errors
      const geminiTimer = geminiLogger.startTimer()
      
      try {
        geminiLogger.info(`🔄 Calling Combined Gemini API`, {
          correlationId,
          documentId: id,
          metadata: {
            model: 'gemini-2.5-flash',
            fileUri: uploadedFile.uri
          }
        })
        
        const result = await geminiCombinedModel.generateContent({
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
        
        // Validate the response structure
        if (response) {
          const parsedResponse = parseGeminiResponse<KnowledgeTreeResponse>(
            response,
            { correlationId, documentId: id, responseType: 'combined' }
          )
          validateResponseStructure(
            parsedResponse,
            ['nodes'],
            { correlationId, documentId: id, responseType: 'knowledge_tree' }
          )
          if (!Array.isArray(parsedResponse.nodes)) {
            throw new Error('Invalid response structure: nodes is not an array')
          }
        }
      } catch (error: any) {
        geminiDuration = geminiTimer()
        geminiError = error
        
        // Special handling for 429 errors - return user-friendly error
        if (error.status === 429) {
          geminiLogger.warn('🚨 Rate limit hit (429) - User action required', {
            correlationId,
            documentId: id,
            metadata: {
              errorStatus: 429,
              errorMessage: 'API quota exceeded'
            }
          })
          
          // Update document status to indicate rate limit error
          await supabase
            .from('documents')
            .update({ 
              processing_status: 'rate_limited',
              processing_error: 'API 할당량이 초과되었습니다. 잠시 후 다시 시도해주세요.',
              updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('user_id', FIXED_USER_ID)
          
          return NextResponse.json(
            { 
              error: 'API_QUOTA_EXCEEDED',
              message: 'API 할당량이 초과되었습니다. 잠시 후 다시 시도해주세요.',
              retryable: true,
              documentId: id
            },
            { status: 429 }
          )
        }
        
        // Special handling for 503 errors (Service Unavailable / Model Overloaded)
        if (error.status === 503) {
          geminiLogger.warn('🚨 Model overloaded (503) - Temporary server issue', {
            correlationId,
            documentId: id,
            metadata: {
              errorStatus: 503,
              errorMessage: 'Model is overloaded'
            }
          })
          
          // Update document status to indicate temporary error
          await supabase
            .from('documents')
            .update({ 
              processing_status: 'model_overloaded',
              processing_error: 'AI 모델이 일시적으로 과부하 상태입니다. 1-2분 후 다시 시도해주세요.',
              updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('user_id', FIXED_USER_ID)
          
          return NextResponse.json(
            { 
              error: 'MODEL_OVERLOADED',
              message: 'AI 모델이 일시적으로 과부하 상태입니다. 1-2분 후 다시 시도해주세요.',
              retryable: true,
              documentId: id,
              suggestedRetryDelay: 60000 // 60 seconds
            },
            { status: 503 }
          )
        }
        
        geminiLogger.error('⚠️ Gemini API error', {
          correlationId,
          documentId: id,
          error,
          metadata: {
            errorCode: error.code || 'UNKNOWN',
            errorStatus: error.status || 'UNKNOWN',
            errorDetails: error.details || error.message
          }
        })
      }
      
      if (!response) {
        geminiLogger.error('Empty response from Gemini API', {
          correlationId,
          documentId: id,
          metadata: {
            lastError: geminiError
          }
        })
        throw new Error(`Empty response from AI: ${geminiError?.message || 'Unknown error'}`)
      }
      
      geminiLogger.info('✅ Step 3/5 Complete: Combined response received', {
        correlationId,
        documentId: id,
        duration: geminiDuration,
        metadata: {
          step: 'combined_generation',
          status: 'completed',
          progress: 60,
          responseLength: response.length,
          responseTokensEstimate: Math.ceil(response.length / 4),
          responsePreview: response.substring(0, 200),
          processingSpeed: `${(fileData.size / 1024 / 1024 / (geminiDuration / 1000)).toFixed(2)} MB/s`,
          totalElapsed: `${((Date.now() - startTime) / 1000).toFixed(2)}s`
        }
      })
      
      // Parse the combined response
      const combinedData = parseGeminiResponse<KnowledgeTreeResponse>(
        response,
        { correlationId, documentId: id, responseType: 'combined' }
      )
      
      // Validate the final structure
      validateResponseStructure(
        combinedData,
        ['nodes'],
        { correlationId, documentId: id, responseType: 'knowledge_tree' }
      )
      
      geminiLogger.info('📊 Knowledge tree data structure analysis', {
        correlationId,
        documentId: id,
        metadata: {
          totalNodes: combinedData.nodes?.length || 0,
          nodeLevels: [...new Set(combinedData.nodes?.map((n: any) => n.level) || [])],
          levelDistribution: combinedData.nodes?.reduce((acc: any, n: any) => {
            acc[`level_${n.level}`] = (acc[`level_${n.level}`] || 0) + 1
            return acc
          }, {}),
          nodeNames: combinedData.nodes?.slice(0, 5).map((n: any) => n.name) || [],
          averageDescriptionLength: combinedData.nodes?.reduce((sum: number, n: any) => sum + (n.description?.length || 0), 0) / (combinedData.nodes?.length || 1)
        }
      })

      // Save flat knowledge nodes to database with batch operations
      const saveFlatNodes = async (nodes: any[]) => {
        supabaseLogger.info('🔄 Starting knowledge nodes batch save operation', {
          correlationId,
          documentId: id,
          metadata: {
            nodeCount: nodes?.length || 0,
            operation: 'batch_insert',
            estimatedDatabaseWrites: (nodes?.length || 0) * 2,
            phase: 'preparation'
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

        // Delete existing knowledge nodes for this document to avoid duplicates
        supabaseLogger.info('🗑️ Deleting existing knowledge nodes for document', {
          correlationId,
          documentId: id,
          metadata: {
            operation: 'DELETE',
            table: 'knowledge_nodes'
          }
        })
        
        const deleteTimer = supabaseLogger.startTimer()
        const { error: deleteError } = await supabase
          .from('knowledge_nodes')
          .delete()
          .eq('document_id', id)
          .eq('user_id', FIXED_USER_ID)
        
        const deleteDuration = deleteTimer()
        
        if (deleteError) {
          supabaseLogger.error('Failed to delete existing knowledge nodes', {
            correlationId,
            documentId: id,
            error: deleteError,
            duration: deleteDuration,
            metadata: {
              errorCode: deleteError.code,
              errorDetails: deleteError.details
            }
          })
          throw new Error(`Failed to delete existing knowledge nodes: ${deleteError.message}`)
        }
        
        supabaseLogger.info('✅ Successfully deleted existing knowledge nodes', {
          correlationId,
          documentId: id,
          duration: deleteDuration
        })

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
        
        supabaseLogger.info('📦 Performing batch insert of knowledge nodes', {
          correlationId,
          documentId: id,
          metadata: {
            batchSize: nodesData.length,
            dataSize: `${(JSON.stringify(nodesData).length / 1024).toFixed(2)} KB`,
            operation: 'INSERT',
            table: 'knowledge_nodes'
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
        
        supabaseLogger.info('✅ Batch insert of knowledge nodes successful', {
          correlationId,
          documentId: id,
          duration: batchDuration,
          metadata: {
            insertedCount: savedNodes?.length || 0,
            insertSpeed: `${((nodesData.length / (batchDuration / 1000))).toFixed(2)} nodes/sec`,
            averageTimePerNode: `${(batchDuration / nodesData.length).toFixed(2)} ms`,
            phase: 'nodes_inserted'
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
          supabaseLogger.info('🔗 Batch updating parent-child relationships', {
            correlationId,
            documentId: id,
            metadata: {
              updateCount: parentUpdates.length,
              uniqueParents: [...new Set(parentUpdates.map(u => u.parent_id))].length,
              operation: 'UPDATE parent_id',
              phase: 'relationship_mapping'
            }
          })
          
          const updateTimer = supabaseLogger.startTimer()
          
          // Use upsert for batch update - much faster than individual updates
          const { error: updateError } = await supabase
            .from('knowledge_nodes')
            .upsert(
              parentUpdates.map(update => ({
                id: update.id,
                parent_id: update.parent_id,
                // Include required fields to avoid null overwrites
                document_id: id,
                user_id: FIXED_USER_ID,
                subject_id: document.subject_id
              })),
              { 
                onConflict: 'id',
                ignoreDuplicates: false 
              }
            )
          
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
            supabaseLogger.info('✅ Batch update of parent relationships successful', {
              correlationId,
              documentId: id,
              duration: updateDuration,
              metadata: {
                updatedCount: parentUpdates.length,
                updateSpeed: `${((parentUpdates.length / (updateDuration / 1000))).toFixed(2)} updates/sec`,
                averageTimePerUpdate: `${(updateDuration / parentUpdates.length).toFixed(2)} ms`,
                phase: 'relationships_established',
                treeDepth: Math.max(...nodes.map((n: any) => n.level || 0)) + 1
              }
            })
          }
        }
        
        return { idMapping, savedNodes }
      }

      // Ensure combinedData.nodes exists and is an array
      if (!combinedData.nodes || !Array.isArray(combinedData.nodes)) {
        analyzeLogger.error('Invalid knowledge tree structure', {
          correlationId,
          documentId: id,
          metadata: {
            receivedStructure: typeof combinedData,
            hasNodes: !!combinedData.nodes,
            nodesType: combinedData.nodes ? typeof combinedData.nodes : 'undefined'
          }
        })
        throw new Error('Invalid knowledge tree structure: nodes array is missing or invalid')
      }
      
      analyzeLogger.info('💾 Step 4/5: Saving knowledge nodes to database', {
        correlationId,
        documentId: id,
        metadata: {
          step: 'save_nodes',
          progress: 80,
          totalNodes: combinedData.nodes.length,
          expectedOperations: combinedData.nodes.length * 2 // Insert + parent update
        }
      })
      
      const nodesTimer = analyzeLogger.startTimer()
      const result = await saveFlatNodes(combinedData.nodes)
      const nodeIdMapping = result.idMapping || {}
      const nodesDuration = nodesTimer()
      
      analyzeLogger.info('✅ Step 4/4 Complete: Knowledge nodes saved', {
        correlationId,
        documentId: id,
        duration: nodesDuration,
        metadata: {
          step: 'save_nodes',
          status: 'completed',
          progress: 100,
          mappedNodes: Object.keys(nodeIdMapping).length,
          totalNodes: combinedData.nodes.length,
          saveSpeed: `${(combinedData.nodes.length / (nodesDuration / 1000)).toFixed(2)} nodes/sec`,
          totalElapsed: `${((Date.now() - startTime) / 1000).toFixed(2)}s`
        }
      })
      
      // Update document status
      supabaseLogger.info('Updating document status to completed', {
        correlationId,
        documentId: id,
        metadata: {
          nodeCount: combinedData.nodes.length
        }
      })
      
      const completionTimer = supabaseLogger.startTimer()
      const { data: completedDoc, error: completeError } = await supabase
        .from('documents')
        .update({ 
          status: 'completed',
          quiz_generation_status: {
            generated: false,
            count: 0,
            assessment_count: 0,
            practice_count: 0,
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
        
        analyzeLogger.info('O/X assessment quiz ready. Practice quiz and study guide will be created after assessment completion.', {
          correlationId,
          documentId: id,
          metadata: {
            nodeCount: combinedData.nodes.length
          }
        })
      }

      // Log final memory usage
      analyzeLogger.logMemoryUsage('after_analysis_complete')
      
      const totalDuration = timer()
      
      // Performance Summary
      const performanceSummary = {
        totalDuration: totalDuration,
        steps: {
          pdfDownload: 'Check logs for timing',
          geminiUpload: uploadDuration || 0,
          combinedGeneration: geminiDuration || 0,
          saveNodes: nodesDuration || 0,
          saveQuiz: 'Check logs for timing',
          total: totalDuration
        },
        metrics: {
          fileSize: document.file_size,
          fileSizeMB: `${(document.file_size / (1024 * 1024)).toFixed(2)} MB`,
          nodeCount: combinedData.nodes.length,
          processingSpeed: `${(document.file_size / 1024 / 1024 / (totalDuration / 1000)).toFixed(2)} MB/s`,
          nodesPerSecond: `${(combinedData.nodes.length / (totalDuration / 1000)).toFixed(2)} nodes/s`
        }
      }
      
      analyzeLogger.info('🎉 Document analysis completed successfully', {
        correlationId,
        documentId: id,
        duration: totalDuration,
        metadata: {
          fileName: document.title,
          summary: {
            totalSteps: 5,
            completedSteps: 5,
            status: 'SUCCESS'
          },
          performance: performanceSummary,
          results: {
            knowledgeNodes: combinedData.nodes.length
          }
        }
      })
      
      analyzeLogger.logApiResponse('/api/documents/[id]/analyze', 200, totalDuration, {
        correlationId,
        documentId: id
      })
      
      return NextResponse.json({ success: true })
    } catch (error: any) {
      const errorDuration = timer()
      
      analyzeLogger.error('❌ Document analysis failed', {
        correlationId,
        documentId: id,
        error,
        duration: errorDuration,
        metadata: {
          errorType: error.constructor.name,
          errorMessage: error.message,
          errorStack: error.stack,
          documentId: id,
          failedAtStep: 'Check logs for last successful step',
          documentInfo: {
            title: document?.title,
            fileSize: document?.file_size,
            filePath: document?.file_path
          },
          systemState: {
            memoryUsage: process.memoryUsage ? {
              heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
              heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`
            } : 'N/A'
          }
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