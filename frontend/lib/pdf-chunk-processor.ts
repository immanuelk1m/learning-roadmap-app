import { geminiStudyGuidePageModel } from './gemini/client'
import { StudyGuidePageResponse } from './gemini/schemas'
import { STUDY_GUIDE_PAGE_PROMPT } from './gemini/prompts'
import { parseGeminiResponse, validateResponseStructure } from './gemini/utils'

export interface PDFChunk {
  startPage: number
  endPage: number
  chunkIndex: number
  totalChunks: number
}

export interface ChunkProcessingResult {
  chunk: PDFChunk
  result: StudyGuidePageResponse | null
  error: string | null
  processingTime: number
}

export interface ChunkProcessingProgress {
  totalChunks: number
  completedChunks: number
  currentChunk: number
  progress: number // 0-100
  status: 'processing' | 'completed' | 'error'
  errors: string[]
}

/**
 * Split PDF pages into chunks of specified size
 */
export function createPDFChunks(totalPages: number, chunkSize: number = 20): PDFChunk[] {
  const chunks: PDFChunk[] = []
  const totalChunks = Math.ceil(totalPages / chunkSize)
  
  for (let i = 0; i < totalChunks; i++) {
    const startPage = i * chunkSize + 1
    const endPage = Math.min((i + 1) * chunkSize, totalPages)
    
    chunks.push({
      startPage,
      endPage,
      chunkIndex: i,
      totalChunks
    })
  }
  
  return chunks
}

/**
 * Process a single PDF chunk with Gemini API with retry logic
 */
export async function processPDFChunk(
  fileUri: string,
  mimeType: string,
  chunk: PDFChunk,
  studyGuideContext: string,
  documentId: string,
  maxRetries: number = 3
): Promise<ChunkProcessingResult> {
  const startTime = Date.now()
  let lastError: any = null
  
  // Retry logic for transient errors
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Add delay between retries with exponential backoff
      if (attempt > 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000) // Max 10 seconds
        console.log(`Retrying chunk ${chunk.chunkIndex + 1} after ${delay}ms (attempt ${attempt}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
      
      // Create chunk-specific prompt
      const chunkPrompt = `${STUDY_GUIDE_PAGE_PROMPT}

${studyGuideContext}

**중요: 다음 페이지 범위만 분석하세요:**
- 시작 페이지: ${chunk.startPage}
- 종료 페이지: ${chunk.endPage}
- 청크 ${chunk.chunkIndex + 1}/${chunk.totalChunks}

해당 페이지 범위의 내용만을 분석하여 페이지별 해설을 작성하세요.
다른 페이지의 내용은 포함하지 마세요.`

      console.log(`Processing chunk ${chunk.chunkIndex + 1}/${chunk.totalChunks} (pages ${chunk.startPage}-${chunk.endPage}) - Attempt ${attempt}`)
      
      const result = await geminiStudyGuidePageModel.generateContent({
        contents: [
          {
            parts: [
              {
                fileData: {
                  fileUri,
                  mimeType,
                },
              },
              {
                text: chunkPrompt,
              },
            ],
          },
        ],
      })
      
      const response = (await result.response?.text()) || ''
      
      if (!response) {
        throw new Error('Empty response from Gemini API')
      }
    
      const studyGuideData = parseGeminiResponse<StudyGuidePageResponse>(
        response,
        { documentId, responseType: 'study_guide_pages_chunk' }
      )
      
      validateResponseStructure(
        studyGuideData,
        ['document_title', 'total_pages', 'pages'],
        { documentId, responseType: 'study_guide_pages_chunk' }
      )
      
      // Filter pages to ensure only the requested range is included
      if (studyGuideData.pages) {
        studyGuideData.pages = studyGuideData.pages.filter(
          page => page.page_number >= chunk.startPage && page.page_number <= chunk.endPage
        )
      }
      
      const processingTime = Date.now() - startTime
      console.log(`Chunk ${chunk.chunkIndex + 1} processed successfully in ${processingTime}ms, got ${studyGuideData.pages?.length || 0} pages`)
      
      return {
        chunk,
        result: studyGuideData,
        error: null,
        processingTime
      }
      
    } catch (error: any) {
      lastError = error
      
      // Check if error is retryable (503, 429, or network errors)
      const isRetryable = error.status === 503 || 
                         error.status === 429 || 
                         error.code === 'ECONNRESET' ||
                         error.code === 'ETIMEDOUT' ||
                         error.message?.includes('overloaded') ||
                         error.message?.includes('timeout')
      
      if (!isRetryable || attempt === maxRetries) {
        const processingTime = Date.now() - startTime
        console.error(`Error processing chunk ${chunk.chunkIndex + 1} after ${attempt} attempts:`, error)
        
        return {
          chunk,
          result: null,
          error: `Failed after ${attempt} attempts: ${error.message || 'Unknown error'}`,
          processingTime
        }
      }
      
      console.warn(`Chunk ${chunk.chunkIndex + 1} failed (attempt ${attempt}), will retry: ${error.message}`)
    }
  }
  
  // Should not reach here, but handle just in case
  const processingTime = Date.now() - startTime
  return {
    chunk,
    result: null,
    error: lastError?.message || 'Unknown error after all retries',
    processingTime
  }
}

/**
 * Process multiple PDF chunks in parallel with concurrency control
 */
export async function processChunksInParallel(
  fileUri: string,
  mimeType: string,
  chunks: PDFChunk[],
  studyGuideContext: string,
  documentId: string,
  maxConcurrency: number = 3,
  progressCallback?: (progress: ChunkProcessingProgress) => void
): Promise<ChunkProcessingResult[]> {
  const results: ChunkProcessingResult[] = []
  const errors: string[] = []
  let completedChunks = 0
  
  // Function to update progress
  const updateProgress = (currentChunk: number, status: ChunkProcessingProgress['status']) => {
    if (progressCallback) {
      progressCallback({
        totalChunks: chunks.length,
        completedChunks,
        currentChunk,
        progress: Math.round((completedChunks / chunks.length) * 100),
        status,
        errors
      })
    }
  }
  
  updateProgress(0, 'processing')
  
  // Process chunks with limited concurrency
  const semaphore = new Array(maxConcurrency).fill(null)
  let chunkIndex = 0
  
  const processNext = async (): Promise<void> => {
    if (chunkIndex >= chunks.length) return
    
    const currentIndex = chunkIndex++
    const chunk = chunks[currentIndex]
    
    updateProgress(currentIndex, 'processing')
    
    try {
      // Process chunk with retry logic
      const result = await processPDFChunk(
        fileUri, 
        mimeType, 
        chunk, 
        studyGuideContext, 
        documentId,
        3 // Max retries per chunk
      )
      results[currentIndex] = result
      
      if (result.error) {
        errors.push(`Chunk ${currentIndex + 1}: ${result.error}`)
        console.warn(`Chunk ${currentIndex + 1} failed permanently: ${result.error}`)
      } else {
        console.log(`Chunk ${currentIndex + 1} completed successfully`)
      }
      
      completedChunks++
      updateProgress(currentIndex, completedChunks === chunks.length ? 'completed' : 'processing')
      
    } catch (error: any) {
      // This should rarely happen as processPDFChunk handles its own errors
      const errorMsg = `Chunk ${currentIndex + 1}: Unexpected error: ${error.message || 'Unknown error'}`
      errors.push(errorMsg)
      results[currentIndex] = {
        chunk,
        result: null,
        error: errorMsg,
        processingTime: 0
      }
      completedChunks++
      updateProgress(currentIndex, errors.length > 0 ? 'error' : 'processing')
    }
    
    // Process next chunk
    if (chunkIndex < chunks.length) {
      await processNext()
    }
  }
  
  // Start parallel processing
  const promises = semaphore.map(() => processNext())
  await Promise.all(promises)
  
  const finalStatus = errors.length > 0 ? 'error' : 'completed'
  updateProgress(chunks.length - 1, finalStatus)
  
  console.log(`Parallel processing completed: ${completedChunks}/${chunks.length} chunks processed`)
  console.log(`Errors: ${errors.length}`)
  
  return results
}

/**
 * Merge chunk results into a single study guide response
 */
export function mergeChunkResults(
  chunkResults: ChunkProcessingResult[],
  documentTitle: string,
  totalPages: number
): StudyGuidePageResponse {
  const allPages: any[] = []
  let overallSummary = ''
  const learningPath: string[] = []
  
  // Sort results by chunk index to maintain order
  const sortedResults = chunkResults
    .filter(result => result.result && result.result.pages)
    .sort((a, b) => a.chunk.chunkIndex - b.chunk.chunkIndex)
  
  // Merge pages from all chunks
  for (const result of sortedResults) {
    if (result.result && result.result.pages) {
      allPages.push(...result.result.pages)
      
      // Combine summaries
      if (result.result.overall_summary) {
        overallSummary += (overallSummary ? '\n\n' : '') + 
          `[페이지 ${result.chunk.startPage}-${result.chunk.endPage}] ${result.result.overall_summary}`
      }
      
      // Combine learning paths
      if (result.result.learning_path) {
        learningPath.push(...result.result.learning_path)
      }
    }
  }
  
  // Sort pages by page number
  allPages.sort((a, b) => a.page_number - b.page_number)
  
  // Remove duplicate learning path items
  const uniqueLearningPath = [...new Set(learningPath)]
  
  return {
    document_title: documentTitle,
    total_pages: totalPages,
    pages: allPages,
    overall_summary: overallSummary || `${documentTitle}에 대한 종합적인 페이지별 퀵노트입니다.`,
    learning_path: uniqueLearningPath.length > 0 ? uniqueLearningPath : undefined
  }
}

/**
 * Get optimal chunk size based on document size
 */
export function getOptimalChunkSize(totalPages: number, fileSize: number): number {
  // Base chunk size
  let chunkSize = 20
  
  // Adjust based on total pages
  if (totalPages > 200) {
    chunkSize = 25 // Larger chunks for very large documents
  } else if (totalPages > 100) {
    chunkSize = 20 // Standard chunk size
  } else if (totalPages > 50) {
    chunkSize = 15 // Smaller chunks for medium documents
  } else if (totalPages > 20) {
    chunkSize = 10 // Small chunks for small documents
  } else {
    // For very small documents, process all at once
    chunkSize = totalPages
  }
  
  // Adjust based on file size (in MB)
  const fileSizeMB = fileSize / (1024 * 1024)
  if (fileSizeMB > 50) {
    chunkSize = Math.max(chunkSize - 5, 10) // Reduce chunk size for large files
  } else if (fileSizeMB > 20) {
    chunkSize = chunkSize // Keep standard size
  } else {
    chunkSize = Math.min(chunkSize + 5, 30) // Increase chunk size for small files
  }
  
  // Ensure chunk size doesn't exceed total pages
  chunkSize = Math.min(chunkSize, totalPages)
  
  console.log(`Optimal chunk size calculated: ${chunkSize} pages (Total: ${totalPages} pages, Size: ${fileSizeMB.toFixed(2)} MB)`)
  
  return chunkSize
}
