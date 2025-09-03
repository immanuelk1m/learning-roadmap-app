import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { KNOWLEDGE_TREE_PROMPT } from '@/lib/gemini/prompts'
import { analyzeLogger, geminiLogger, supabaseLogger } from '@/lib/logger'
import Logger from '@/lib/logger'
import '@/lib/ai/env'
import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { z } from 'zod'

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
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
      .eq('user_id', user.id)
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
          fileSize: document.file_size ? `${(document.file_size / (1024 * 1024)).toFixed(2)} MB` : 'Unknown',
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
          fileSizeMB: document.file_size ? `${(document.file_size / (1024 * 1024)).toFixed(2)} MB` : 'Unknown',
          maxRetries,
          estimatedTime: document.file_size && document.file_size > 10 * 1024 * 1024 ? 'May take longer for large file' : 'Should be quick'
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

      // Log memory usage before AI call
      analyzeLogger.logMemoryUsage('before_ai_analysis')

      // Analyze with Vercel AI SDK using prompt for Knowledge Tree (non-streaming)
      geminiLogger.info('🤖 Step 2/4: Generating Knowledge Tree', {
        correlationId,
        documentId: id,
        metadata: {
          step: 'knowledge_tree_generation',
          progress: 40,
          model: 'ai-sdk:google:gemini-2.5-flash',
          promptLength: KNOWLEDGE_TREE_PROMPT.length,
          promptTokensEstimate: Math.ceil(KNOWLEDGE_TREE_PROMPT.length / 4),
          pdfSize: fileData.size,
          pdfPages: document.page_count || 'Unknown',
          expectedProcessingTime: 'This may take 45-60 seconds'
        }
      })
      
      const aiTimer = geminiLogger.startTimer()
      let combinedData: KnowledgeTreeResponse
      try {
        // Strict output schema for knowledge tree
        const nodeSchema = z.object({
          id: z.string(),
          parent_id: z.string().nullable(),
          name: z.string(),
          description: z.string().nullable().optional(),
          level: z.number().int().min(1),
          prerequisites: z.array(z.string()).optional().default([]),
        })

        const schema = z.object({
          nodes: z.array(nodeSchema).min(1),
        })

        const model = google('gemini-2.5-flash')
        const pdfBuffer = Buffer.from(await fileData.arrayBuffer())
        const result = await generateObject({
          model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: KNOWLEDGE_TREE_PROMPT },
                { type: 'file', data: pdfBuffer, mediaType: 'application/pdf' },
              ],
            },
          ],
          schema,
        })

        combinedData = result.object as KnowledgeTreeResponse
      } catch (error: any) {
        const duration = aiTimer()
        geminiLogger.error('⚠️ AI SDK generation error', {
          correlationId,
          documentId: id,
          duration,
          error,
          metadata: { errorMessage: error?.message }
        })
        throw error
      }

      const aiDuration = aiTimer()

      geminiLogger.info('✅ Step 2/4 Complete: Knowledge tree generated', {
        correlationId,
        documentId: id,
        duration: aiDuration,
        metadata: {
          step: 'knowledge_tree_generation',
          status: 'completed',
          progress: 60,
          nodeCount: combinedData.nodes.length,
          totalElapsed: `${((Date.now() - startTime) / 1000).toFixed(2)}s`
        }
      })
      
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
          .eq('user_id', user.id)
        
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
        
        // Deduplicate nodes by name to avoid constraint violations
        // If duplicate names exist, append a number suffix
        const nameCount: Record<string, number> = {}
        const deduplicatedNodes = nodes.map((node, i) => {
          let nodeName = node.name || 'Untitled Node'
          
          // Track how many times we've seen this name
          if (nameCount[nodeName]) {
            nameCount[nodeName]++
            nodeName = `${nodeName} (${nameCount[nodeName]})`
          } else {
            nameCount[nodeName] = 1
          }
          
          return {
            ...node,
            originalName: node.name,
            name: nodeName,
            originalIndex: i
          }
        })
        
        // Sort nodes by level to ensure parent nodes are inserted first
        const sortedNodes = [...deduplicatedNodes].sort((a, b) => {
          const levelA = a.level || 0
          const levelB = b.level || 0
          if (levelA !== levelB) return levelA - levelB
          return a.originalIndex - b.originalIndex
        })
        
        supabaseLogger.info('🔄 Sorting nodes by level for proper hierarchy', {
          correlationId,
          documentId: id,
          metadata: {
            totalNodes: sortedNodes.length,
            levelDistribution: sortedNodes.reduce((acc, node) => {
              const level = node.level || 0
              acc[level] = (acc[level] || 0) + 1
              return acc
            }, {} as Record<number, number>)
          }
        })
        
        // Process and insert nodes level by level
        const insertedNodes: any[] = []
        const levelGroups = sortedNodes.reduce((acc, node) => {
          const level = node.level || 0
          if (!acc[level]) acc[level] = []
          acc[level].push(node)
          return acc
        }, {} as Record<number, any[]>)
        
        const levels = Object.keys(levelGroups).map(Number).sort((a, b) => a - b)
        
        for (const level of levels) {
          const levelNodes = levelGroups[level]
          
          supabaseLogger.info(`📊 Processing level ${level} nodes`, {
            correlationId,
            documentId: id,
            metadata: {
              level,
              nodeCount: levelNodes.length,
              nodeNames: levelNodes.map((n: any) => n.name)
            }
          })
          
          // Prepare nodes data for current level
          const nodesData = levelNodes.map((node: any) => {
            // Find parent_id from idMapping for level 2+ nodes
            let actualParentId = null
            if (level > 1 && node.parent_id) {
              if (idMapping[node.parent_id]) {
                actualParentId = idMapping[node.parent_id]
                supabaseLogger.info(`🔗 Mapping parent for node: ${node.name}`, {
                  correlationId,
                  documentId: id,
                  metadata: {
                    nodeName: node.name,
                    tempParentId: node.parent_id,
                    actualParentId,
                    level
                  }
                })
              } else {
                supabaseLogger.warn(`⚠️ Parent ID not found in mapping for node: ${node.name}`, {
                  correlationId,
                  documentId: id,
                  metadata: {
                    nodeName: node.name,
                    tempParentId: node.parent_id,
                    level,
                    availableIds: Object.keys(idMapping)
                  }
                })
              }
            } else if (level === 1 && node.parent_id !== null) {
              supabaseLogger.warn(`⚠️ Level 1 node has non-null parent_id: ${node.name}`, {
                correlationId,
                documentId: id,
                metadata: {
                  nodeName: node.name,
                  parentId: node.parent_id,
                  level
                }
              })
            }
            
            return {
              document_id: id,
              user_id: user.id,
              subject_id: document.subject_id,
              parent_id: actualParentId,
              name: node.name,
              description: node.description || '',
              level: node.level || 0,
              position: node.originalIndex,
              prerequisites: node.prerequisites || [],
            }
          })
          
          supabaseLogger.info(`📦 Inserting level ${level} nodes`, {
            correlationId,
            documentId: id,
            metadata: {
              level,
              batchSize: nodesData.length,
              dataSize: `${(JSON.stringify(nodesData).length / 1024).toFixed(2)} KB`,
              operation: 'INSERT',
              table: 'knowledge_nodes'
            }
          })
          
          // Insert nodes for current level
          const batchTimer = supabaseLogger.startTimer()
          const { data: savedNodes, error: batchError } = await supabase
            .from('knowledge_nodes')
            .insert(nodesData)
            .select()
          
          const batchDuration = batchTimer()
          
          if (batchError) {
            supabaseLogger.error(`Failed to insert level ${level} nodes`, {
              correlationId,
              documentId: id,
              error: batchError,
              duration: batchDuration,
              metadata: {
                level,
                errorCode: batchError.code,
                errorDetails: batchError.details,
                attemptedCount: nodesData.length
              }
            })
            throw new Error(`Failed to insert level ${level} knowledge nodes: ${batchError.message}`)
          }
          
          supabaseLogger.info(`✅ Level ${level} nodes inserted successfully`, {
            correlationId,
            documentId: id,
            duration: batchDuration,
            metadata: {
              level,
              insertedCount: savedNodes?.length || 0,
              insertSpeed: `${((nodesData.length / (batchDuration / 1000))).toFixed(2)} nodes/sec`,
              averageTimePerNode: `${(batchDuration / nodesData.length).toFixed(2)} ms`
            }
          })
          
          // Build ID mapping for current level nodes
          if (savedNodes) {
            savedNodes.forEach((savedNode, i) => {
              const originalNode = levelNodes[i]
              if (originalNode?.id && savedNode.id) {
                idMapping[originalNode.id] = savedNode.id
                supabaseLogger.info(`📌 ID mapped: ${originalNode.id} -> ${savedNode.id}`, {
                  correlationId,
                  documentId: id,
                  metadata: {
                    nodeName: savedNode.name,
                    level: savedNode.level,
                    parentId: savedNode.parent_id
                  }
                })
              }
            })
            insertedNodes.push(...savedNodes)
          }
        }
        
        // Log final hierarchy structure
        supabaseLogger.info('🌳 Final knowledge tree structure', {
          correlationId,
          documentId: id,
          metadata: {
            totalNodes: insertedNodes.length,
            treeDepth: Math.max(...nodes.map((n: any) => n.level || 0)),
            nodesWithParents: insertedNodes.filter(n => n.parent_id).length,
            orphanNodes: insertedNodes.filter(n => !n.parent_id && n.level > 1).length
          }
        })
        
        return { idMapping, savedNodes: insertedNodes }
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
          geminiUpload: 0,
          combinedGeneration: aiDuration || 0,
          saveNodes: nodesDuration || 0,
          saveQuiz: 'Check logs for timing',
          total: totalDuration
        },
        metrics: {
          fileSize: document.file_size,
          fileSizeMB: document.file_size ? `${(document.file_size / (1024 * 1024)).toFixed(2)} MB` : 'Unknown',
          nodeCount: combinedData.nodes.length,
          processingSpeed: document.file_size ? `${(document.file_size / 1024 / 1024 / (totalDuration / 1000)).toFixed(2)} MB/s` : 'N/A',
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
