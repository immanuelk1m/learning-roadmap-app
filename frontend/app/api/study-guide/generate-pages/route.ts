import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { uploadFileToGemini } from '@/lib/gemini/client'
import { StudyGuidePageResponse } from '@/lib/gemini/schemas'
import {
  createPDFChunks,
  processChunksInParallel,
  mergeChunkResults,
  getOptimalChunkSize,
  ChunkProcessingProgress
} from '@/lib/pdf-chunk-processor'
import { updateProgress, clearProgress } from '../progress/route'

export async function POST(request: NextRequest) {
  try {
    const { documentId, userId } = await request.json()

    if (!documentId || !userId) {
      return NextResponse.json(
        { error: 'Document ID and User ID are required' },
        { status: 400 }
      )
    }

    // Initialize progress tracking
    updateProgress(userId, documentId, {
      totalChunks: 0,
      completedChunks: 0,
      currentChunk: 0,
      progress: 0,
      status: 'starting',
      stage: 'initializing',
      message: '해설집 생성을 시작합니다...',
      errors: []
    })

    const supabase = await createClient()

    // Get document info
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    // Get knowledge nodes for the document
    const { data: knowledgeNodes, error: nodesError } = await supabase
      .from('knowledge_nodes')
      .select('*')
      .eq('document_id', documentId)
      .order('level')

    if (nodesError || !knowledgeNodes || knowledgeNodes.length === 0) {
      return NextResponse.json(
        { error: 'No knowledge nodes found for this document' },
        { status: 404 }
      )
    }

    // Get user's knowledge status (using knowledge_nodes table now)
    const { data: userNodes, error: statusError } = await supabase
      .from('knowledge_nodes')
      .select('*')
      .eq('user_id', userId)
      .eq('document_id', documentId)

    if (statusError) {
      return NextResponse.json(
        { error: 'Failed to fetch user knowledge status' },
        { status: 500 }
      )
    }

    // Check assessment completion
    const totalNodes = knowledgeNodes.length
    const assessedNodes = userNodes?.filter(n => n.understanding_level !== null).length || 0

    if (assessedNodes === 0) {
      return NextResponse.json({
        error: 'Knowledge assessment not started',
        message: 'Please complete the knowledge assessment first',
        requiresAssessment: true
      }, { status: 400 })
    }

    if (assessedNodes < totalNodes) {
      return NextResponse.json({
        error: 'Knowledge assessment incomplete',
        message: `Please assess all ${totalNodes} concepts. Currently assessed: ${assessedNodes}`,
        requiresAssessment: true,
        progress: { assessed: assessedNodes, total: totalNodes }
      }, { status: 400 })
    }

    // Get O/X quiz attempts for detailed feedback
    const { data: quizAttempts } = await supabase
      .from('quiz_attempts')
      .select(`
        *,
        quiz_items!inner(
          id,
          question,
          correct_answer,
          explanation,
          node_id,
          page_reference
        )
      `)
      .eq('user_id', userId)
      .in('quiz_item_id', 
        await supabase
          .from('quiz_items')
          .select('id')
          .eq('document_id', documentId)
          .eq('is_assessment', true)
          .then(res => res.data?.map(item => item.id) || [])
      )

    // Categorize concepts based on 50 threshold
    const knownConcepts = userNodes?.filter(node => node.understanding_level >= 50) || []
    const unknownConcepts = userNodes?.filter(node => node.understanding_level < 50) || []

    // Get original document content for context
    const { data: fileData } = await supabase.storage
      .from('pdf-documents')
      .download(document.file_path)

    if (!fileData) {
      return NextResponse.json(
        { error: 'Failed to download PDF file' },
        { status: 500 }
      )
    }

    console.log(`PDF file downloaded, size: ${(fileData.size / 1024 / 1024).toFixed(2)} MB, pages: ${document.page_count || 'unknown'}`)
    
    // Update progress
    updateProgress(userId, documentId, {
      totalChunks: 0,
      completedChunks: 0,
      currentChunk: 0,
      progress: 10,
      status: 'processing',
      stage: 'uploading',
      message: 'PDF 파일을 AI 서버에 업로드 중...',
      errors: []
    })
    
    // Upload file to Gemini File API for efficient processing
    console.log('Uploading PDF to Gemini File API...')
    let uploadedFile
    try {
      uploadedFile = await uploadFileToGemini(fileData, 'application/pdf')
      console.log('File uploaded to Gemini:', uploadedFile.uri)
    } catch (uploadError: any) {
      console.error('Failed to upload file to Gemini:', uploadError)
      updateProgress(userId, documentId, {
        totalChunks: 0,
        completedChunks: 0,
        currentChunk: 0,
        progress: 0,
        status: 'error',
        stage: 'upload_failed',
        message: 'AI 서버 업로드 실패',
        errors: [uploadError.message]
      })
      return NextResponse.json(
        { error: 'Failed to upload file to Gemini', details: uploadError.message },
        { status: 500 }
      )
    }

    // Prepare context for page-by-page analysis
    const incorrectQuizzes = quizAttempts?.filter(attempt => !attempt.is_correct) || []
    const correctQuizzes = quizAttempts?.filter(attempt => attempt.is_correct) || []
    
    const oxQuizContext = incorrectQuizzes.length > 0 ? `
## O/X 평가 결과 분석

**총 ${quizAttempts?.length || 0}문제 중 ${correctQuizzes.length}개 정답, ${incorrectQuizzes.length}개 오답**

### 오답 문제 상세 (페이지별 해설에 반영 필요)
${incorrectQuizzes.map(attempt => {
  const nodeInfo = knowledgeNodes.find(n => n.id === attempt.quiz_items?.node_id)
  return `
**문제**: ${attempt.quiz_items?.question}
- 관련 개념: ${nodeInfo?.name || '알 수 없음'}
- 페이지 참조: ${attempt.quiz_items?.page_reference ? `${attempt.quiz_items.page_reference}페이지` : '페이지 정보 없음'}
- 사용자 답: ${attempt.user_answer}
- 정답: ${attempt.quiz_items?.correct_answer}
- 해설: ${attempt.quiz_items?.explanation || ''}
`
}).join('\n')}

**중요**: 각 페이지 해설 시, 해당 페이지와 관련된 오답 문제가 있다면 특별히 강조하고 상세히 설명하세요.
` : ''

    // Generate page-by-page study guide using Gemini
    const studyGuideContext = `
## 학습자 프로필 분석

**문서:** ${document.title}
**전체 페이지 수:** ${document.page_count || '알 수 없음'}

**이미 알고 있는 개념 (${knownConcepts.length}개):**
${knownConcepts.map(c => `- ${c.name}: ${c.description}`).join('\n')}

**학습이 필요한 개념 (${unknownConcepts.length}개):**
${unknownConcepts.map(c => `- ${c.name}: ${c.description}
  필요한 선수 지식: ${c.prerequisites?.length > 0 ? c.prerequisites.join(', ') : '없음'}`).join('\n\n')}

## 페이지별 해설 작성 지침

1. PDF의 각 페이지를 개별적으로 분석
2. 각 페이지마다 맞춤형 해설 작성
3. 학습자가 모르는 개념이 나오는 페이지는 더 상세하게 설명
4. 학습자가 아는 개념이 나오는 페이지는 응용과 심화 위주로 설명
5. 페이지별로 난이도를 평가하고 학습 목표를 명시

${oxQuizContext}`

    // Determine optimal processing strategy
    const totalPages = document.page_count || 100 // fallback if page count unknown
    const fileSize = fileData.size
    const shouldUseParallel = totalPages > 20 || fileSize > 10 * 1024 * 1024 // > 20 pages or > 10MB
    
    console.log(`Processing strategy: ${shouldUseParallel ? 'PARALLEL' : 'SINGLE'} (${totalPages} pages, ${(fileSize / 1024 / 1024).toFixed(2)} MB)`)
    
    let studyGuideData: StudyGuidePageResponse
    
    if (shouldUseParallel) {
      // Use parallel processing for large documents
      const chunkSize = getOptimalChunkSize(totalPages, fileSize)
      const chunks = createPDFChunks(totalPages, chunkSize)
      
      console.log(`Created ${chunks.length} chunks of ${chunkSize} pages each`)
      
      // Update progress with chunk info
      updateProgress(userId, documentId, {
        totalChunks: chunks.length,
        completedChunks: 0,
        currentChunk: 0,
        progress: 20,
        status: 'processing',
        stage: 'preparing_chunks',
        message: `${chunks.length}개 청크로 나누어 병렬 처리 시작...`,
        errors: []
      })
      
      // Process chunks in parallel with progress tracking
      const progressTracker = (progress: ChunkProcessingProgress) => {
        console.log(`Progress: ${progress.completedChunks}/${progress.totalChunks} chunks (${progress.progress}%)`)
        if (progress.errors.length > 0) {
          console.warn('Processing errors:', progress.errors)
        }
        
        // Update progress in store for real-time tracking
        updateProgress(userId, documentId, {
          ...progress,
          stage: 'processing_chunks',
          message: `청크 ${progress.completedChunks}/${progress.totalChunks} 처리 중...`
        })
      }
      
      const chunkResults = await processChunksInParallel(
        uploadedFile.uri,
        uploadedFile.mimeType || 'application/pdf',
        chunks,
        studyGuideContext,
        documentId,
        3, // max concurrency
        progressTracker
      )
      
      // Merge results from all chunks
      studyGuideData = mergeChunkResults(chunkResults, document.title, totalPages)
      
      // Log processing statistics
      const successfulChunks = chunkResults.filter(r => r.result !== null).length
      const failedChunks = chunkResults.filter(r => r.result === null).length
      const totalProcessingTime = chunkResults.reduce((sum, r) => sum + r.processingTime, 0)
      const averageTime = totalProcessingTime / chunkResults.length
      
      console.log(`Parallel processing complete: ${successfulChunks}/${chunks.length} chunks successful`)
      if (failedChunks > 0) {
        console.warn(`Warning: ${failedChunks} chunks failed to process`)
      }
      console.log(`Total processing time: ${totalProcessingTime}ms, Average: ${averageTime.toFixed(0)}ms per chunk`)
      console.log(`Generated pages: ${studyGuideData.pages?.length || 0}`)
      
      // Check if we have at least some pages to save
      if (studyGuideData.pages?.length === 0) {
        updateProgress(userId, documentId, {
          totalChunks: 0,
          completedChunks: 0,
          currentChunk: 0,
          progress: 0,
          status: 'error',
          stage: 'no_pages_generated',
          message: '페이지 생성에 실패했습니다. 다시 시도해주세요.',
          errors: ['No pages were successfully generated']
        })
        
        return NextResponse.json(
          { error: 'Failed to generate any pages. Please try again.' },
          { status: 500 }
        )
      }
      
    } else {
      // Use single processing for smaller documents (existing logic)
      const { geminiStudyGuidePageModel } = await import('@/lib/gemini/client')
      const { STUDY_GUIDE_PAGE_PROMPT } = await import('@/lib/gemini/prompts')
      const { parseGeminiResponse, validateResponseStructure } = await import('@/lib/gemini/utils')
      
      const prompt = `${STUDY_GUIDE_PAGE_PROMPT}\n${studyGuideContext}`
      
      const result = await geminiStudyGuidePageModel.generateContent({
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
      
      studyGuideData = parseGeminiResponse<StudyGuidePageResponse>(
        response,
        { documentId, responseType: 'study_guide_pages' }
      )
      
      validateResponseStructure(
        studyGuideData,
        ['document_title', 'total_pages', 'pages', 'overall_summary'],
        { documentId, responseType: 'study_guide_pages' }
      )
      
      console.log(`Single processing complete, generated ${studyGuideData.pages?.length || 0} pages`)
    }
    
    // Update progress for saving phase
    updateProgress(userId, documentId, {
      totalChunks: 0,
      completedChunks: 0,
      currentChunk: 0,
      progress: 90,
      status: 'processing',
      stage: 'saving',
      message: '데이터베이스에 해설집 저장 중...',
      errors: []
    })
    
    // Start transaction to save study guide and pages
    const { data: studyGuide, error: guideError } = await supabase
      .from('study_guides')
      .upsert({
        user_id: userId,
        document_id: documentId,
        document_title: studyGuideData.document_title,
        total_pages: studyGuideData.total_pages,
        overall_summary: studyGuideData.overall_summary,
        generation_method: 'pages',
        known_concepts: knownConcepts.map(c => c.id),
        unknown_concepts: unknownConcepts.map(c => c.id),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (guideError) {
      console.error('Error saving study guide:', guideError)
      return NextResponse.json(
        { error: 'Failed to save study guide' },
        { status: 500 }
      )
    }

    // Delete existing pages if any
    await supabase
      .from('study_guide_pages')
      .delete()
      .eq('study_guide_id', studyGuide.id)

    // Save individual pages
    const pagesToInsert = studyGuideData.pages.map(page => ({
      study_guide_id: studyGuide.id,
      page_number: page.page_number,
      page_title: page.page_title,
      page_content: page.page_content,
      key_concepts: page.key_concepts,
      difficulty_level: page.difficulty_level,
      prerequisites: page.prerequisites,
      learning_objectives: page.learning_objectives,
      original_content: page.original_content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    const { error: pagesError } = await supabase
      .from('study_guide_pages')
      .insert(pagesToInsert)

    if (pagesError) {
      console.error('Error saving study guide pages:', pagesError)
      updateProgress(userId, documentId, {
        totalChunks: 0,
        completedChunks: 0,
        currentChunk: 0,
        progress: 90,
        status: 'error',
        stage: 'save_failed',
        message: '데이터베이스 저장 실패',
        errors: [pagesError.message]
      })
      return NextResponse.json(
        { error: 'Failed to save study guide pages' },
        { status: 500 }
      )
    }

    // Complete and clear progress
    updateProgress(userId, documentId, {
      totalChunks: 0,
      completedChunks: 0,
      currentChunk: 0,
      progress: 100,
      status: 'completed',
      stage: 'completed',
      message: '해설집 생성이 완료되었습니다!',
      errors: []
    })
    
    // Clear progress after a short delay to allow UI to show completion
    setTimeout(() => {
      clearProgress(userId, documentId)
    }, 3000)

    return NextResponse.json({
      success: true,
      studyGuide: {
        ...studyGuide,
        pages: studyGuideData.pages,
        learning_path: studyGuideData.learning_path
      }
    })

  } catch (error: any) {
    console.error('Study guide page generation error:', error)
    
    // Check if it's a retryable error
    const isRetryable = error.status === 503 || 
                       error.status === 429 || 
                       error.message?.includes('overloaded') ||
                       error.message?.includes('quota')
    
    const errorMessage = isRetryable 
      ? 'AI 서버가 일시적으로 과부하 상태입니다. 잠시 후 다시 시도해주세요.'
      : '해설집 생성 중 오류가 발생했습니다'
    
    // Update progress with error
    updateProgress(userId, documentId, {
      totalChunks: 0,
      completedChunks: 0,
      currentChunk: 0,
      progress: 0,
      status: 'error',
      stage: 'failed',
      message: errorMessage,
      errors: [error.message]
    })
    
    // Clear progress after error
    setTimeout(() => {
      clearProgress(userId, documentId)
    }, 5000)
    
    if (isRetryable) {
      return NextResponse.json(
        { 
          error: 'SERVICE_TEMPORARILY_UNAVAILABLE',
          message: errorMessage,
          retryable: true,
          suggestedRetryDelay: 30000 // 30 seconds
        },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to generate study guide pages', details: error.message },
      { status: 500 }
    )
  }
}