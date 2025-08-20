import { NextRequest, NextResponse } from 'next/server'
import {
  createPDFChunks,
  getOptimalChunkSize,
  PDFChunk
} from '@/lib/pdf-chunk-processor'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const totalPages = parseInt(searchParams.get('pages') || '100')
  const fileSize = parseInt(searchParams.get('size') || `${20 * 1024 * 1024}`) // 20MB default
  
  // Test chunk creation
  const optimalChunkSize = getOptimalChunkSize(totalPages, fileSize)
  const chunks = createPDFChunks(totalPages, optimalChunkSize)
  
  // Calculate processing estimates
  const estimatedTimePerChunk = 15 // seconds
  const maxConcurrency = 3
  const totalChunks = chunks.length
  const batches = Math.ceil(totalChunks / maxConcurrency)
  const estimatedTotalTime = batches * estimatedTimePerChunk
  
  return NextResponse.json({
    test: 'Parallel Processing Configuration',
    input: {
      totalPages,
      fileSizeMB: (fileSize / 1024 / 1024).toFixed(2),
      fileSize
    },
    configuration: {
      optimalChunkSize,
      totalChunks,
      maxConcurrency,
      batches
    },
    chunks: chunks.map(chunk => ({
      index: chunk.chunkIndex + 1,
      pages: `${chunk.startPage}-${chunk.endPage}`,
      pageCount: chunk.endPage - chunk.startPage + 1
    })),
    estimates: {
      timePerChunk: `${estimatedTimePerChunk}s`,
      totalTime: `${estimatedTotalTime}s (${(estimatedTotalTime / 60).toFixed(1)} minutes)`,
      parallelSpeedup: `${(totalChunks * estimatedTimePerChunk / estimatedTotalTime).toFixed(1)}x faster than sequential`
    },
    advantages: [
      'Reduced memory usage by processing smaller chunks',
      'Better error recovery - can retry individual chunks',
      'Real-time progress tracking',
      'Optimal for documents > 20 pages or > 10MB'
    ]
  })
}

export async function POST(request: NextRequest) {
  try {
    const { documentId, userId } = await request.json()
    
    if (!documentId || !userId) {
      return NextResponse.json(
        { error: 'Document ID and User ID are required' },
        { status: 400 }
      )
    }
    
    // Simulate parallel processing steps
    const steps = [
      { step: 1, name: 'Initialize', duration: 500 },
      { step: 2, name: 'Download PDF', duration: 1000 },
      { step: 3, name: 'Upload to Gemini', duration: 1500 },
      { step: 4, name: 'Create chunks', duration: 200 },
      { step: 5, name: 'Process chunk 1', duration: 2000 },
      { step: 6, name: 'Process chunk 2', duration: 2000 },
      { step: 7, name: 'Process chunk 3', duration: 2000 },
      { step: 8, name: 'Merge results', duration: 500 },
      { step: 9, name: 'Save to database', duration: 1000 }
    ]
    
    // Simulate progress updates
    let currentStep = 0
    const results: any[] = []
    
    for (const step of steps) {
      currentStep++
      const progress = Math.round((currentStep / steps.length) * 100)
      
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, step.duration))
      
      results.push({
        step: step.step,
        name: step.name,
        completed: true,
        duration: `${step.duration}ms`,
        progress: `${progress}%`
      })
      
      console.log(`Test: ${step.name} completed (${progress}%)`)
    }
    
    return NextResponse.json({
      success: true,
      message: 'Parallel processing test completed',
      results,
      totalDuration: steps.reduce((sum, s) => sum + s.duration, 0),
      summary: {
        totalSteps: steps.length,
        completedSteps: results.length,
        status: 'SUCCESS'
      }
    })
    
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Test failed', details: error.message },
      { status: 500 }
    )
  }
}