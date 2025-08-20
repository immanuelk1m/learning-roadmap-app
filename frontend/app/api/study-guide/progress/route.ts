import { NextRequest, NextResponse } from 'next/server'

// In-memory store for progress tracking
// In production, you might want to use Redis or similar
const progressStore = new Map<string, any>()

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const documentId = searchParams.get('documentId')
  const userId = searchParams.get('userId')
  
  if (!documentId || !userId) {
    return NextResponse.json(
      { error: 'Document ID and User ID are required' },
      { status: 400 }
    )
  }
  
  const key = `${userId}:${documentId}`
  const progress = progressStore.get(key)
  
  return NextResponse.json({
    progress: progress || {
      totalChunks: 0,
      completedChunks: 0,
      currentChunk: 0,
      progress: 0,
      status: 'not_started',
      errors: []
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const { documentId, userId, progress } = await request.json()
    
    if (!documentId || !userId || !progress) {
      return NextResponse.json(
        { error: 'Document ID, User ID, and progress data are required' },
        { status: 400 }
      )
    }
    
    const key = `${userId}:${documentId}`
    progressStore.set(key, {
      ...progress,
      timestamp: new Date().toISOString()
    })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update progress', details: error.message },
      { status: 500 }
    )
  }
}

// Utility function to update progress from the generation API
export function updateProgress(userId: string, documentId: string, progress: any) {
  const key = `${userId}:${documentId}`
  progressStore.set(key, {
    ...progress,
    timestamp: new Date().toISOString()
  })
}

// Utility function to clear progress when generation is complete
export function clearProgress(userId: string, documentId: string) {
  const key = `${userId}:${documentId}`
  progressStore.delete(key)
}