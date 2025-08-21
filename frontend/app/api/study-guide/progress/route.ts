import { NextRequest, NextResponse } from 'next/server'
import { getProgress, updateProgress } from '@/lib/progress-store'

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
  
  const progress = getProgress(userId, documentId)
  
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
    
    updateProgress(userId, documentId, progress)
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update progress', details: error.message },
      { status: 500 }
    )
  }
}