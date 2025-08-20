import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface CreateSessionRequest {
  documentId: string
  quizType?: 'practice' | 'assessment' | 'missed_questions'
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    const userId = searchParams.get('userId')
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const FIXED_USER_ID = userId || '00000000-0000-0000-0000-000000000000'

    // Get most recent session for the document (either in_progress or completed)
    const { data: existingSession, error } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('user_id', FIXED_USER_ID)
      .eq('document_id', documentId)
      .in('status', ['in_progress', 'completed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error fetching quiz session:', error)
      return NextResponse.json(
        { error: 'Failed to fetch session', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ session: existingSession })
  } catch (error: any) {
    console.error('Get quiz session error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateSessionRequest = await request.json()
    const { documentId, quizType = 'practice' } = body

    const supabase = await createClient()
    const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'
    
    // Add detailed logging for debugging
    console.log('Creating quiz session:', { documentId, quizType, userId: FIXED_USER_ID })

    // Check if there's already an active or completed session
    const { data: existingSession } = await supabase
      .from('quiz_sessions')
      .select('id, status')
      .eq('user_id', FIXED_USER_ID)
      .eq('document_id', documentId)
      .in('status', ['in_progress', 'completed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingSession) {
      return NextResponse.json(
        { error: 'Session already exists', sessionId: existingSession.id, status: existingSession.status },
        { status: 409 }
      )
    }

    // Get questions count for the document
    const { data: questions, error: questionsError } = await supabase
      .from('quiz_items')
      .select('id')
      .eq('document_id', documentId)
      .or('is_assessment.eq.false,is_assessment.is.null')

    if (questionsError) {
      console.error('Error fetching questions:', questionsError)
      return NextResponse.json(
        { error: 'Failed to fetch questions', details: questionsError.message },
        { status: 500 }
      )
    }

    const totalQuestions = questions?.length || 0

    // Create new session
    console.log('Attempting to create new session with total questions:', totalQuestions)
    
    const { data: newSession, error: createError } = await supabase
      .from('quiz_sessions')
      .insert({
        user_id: FIXED_USER_ID,
        document_id: documentId,
        quiz_type: quizType,
        status: 'in_progress',
        total_questions: totalQuestions,
        user_answers: {},
        question_results: {},
        show_results: false
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating quiz session:', {
        error: createError,
        code: createError.code,
        message: createError.message,
        details: createError.details,
        hint: createError.hint
      })
      return NextResponse.json(
        { error: 'Failed to create session', details: createError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ session: newSession }, { status: 201 })
  } catch (error: any) {
    console.error('Create quiz session error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}