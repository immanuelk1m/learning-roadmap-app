import { NextRequest, NextResponse } from 'next/server'
import { generatePracticeQuiz } from '@/lib/quiz/actions'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // The core logic is now in generatePracticeQuiz
    const result = await generatePracticeQuiz(body)

    if (!result.success) {
      // If the underlying function returns a specific error, forward it
      return NextResponse.json({ error: result.error || 'Failed to generate quiz' }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true,
      questionsGenerated: result.questionsGenerated,
      documents: result.documents 
    })
  } catch (error: any) {
    console.error('Batch quiz generation API route error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
