import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface UpdateSessionRequest {
  userAnswers?: { [key: string]: any }
  questionResults?: { [key: string]: boolean }
  showResults?: boolean
  status?: 'in_progress' | 'completed' | 'abandoned'
  currentQuestionIndex?: number
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

    const { data: session, error } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('id', id)
      .eq('user_id', FIXED_USER_ID)
      .single()

    if (error) {
      console.error('Error fetching quiz session:', error)
      return NextResponse.json(
        { error: 'Session not found', details: error.message },
        { status: 404 }
      )
    }

    return NextResponse.json({ session })
  } catch (error: any) {
    console.error('Get quiz session error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body: UpdateSessionRequest = await request.json()
    const supabase = await createClient()
    const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

    // Build update object
    const updateData: any = {
      last_updated: new Date().toISOString()
    }

    if (body.userAnswers !== undefined) {
      updateData.user_answers = body.userAnswers
    }
    
    if (body.questionResults !== undefined) {
      updateData.question_results = body.questionResults
    }
    
    if (body.showResults !== undefined) {
      updateData.show_results = body.showResults
    }
    
    if (body.status !== undefined) {
      updateData.status = body.status
      
      // Set completion time if completing the session
      if (body.status === 'completed') {
        updateData.time_completed = new Date().toISOString()
      }
    }
    
    if (body.currentQuestionIndex !== undefined) {
      updateData.current_question_index = body.currentQuestionIndex
    }

    const { data: updatedSession, error } = await supabase
      .from('quiz_sessions')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', FIXED_USER_ID)
      .select()
      .single()

    if (error) {
      console.error('Error updating quiz session:', error)
      return NextResponse.json(
        { error: 'Failed to update session', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ session: updatedSession })
  } catch (error: any) {
    console.error('Update quiz session error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'

    // Mark session as abandoned instead of deleting
    const { data: abandonedSession, error } = await supabase
      .from('quiz_sessions')
      .update({
        status: 'abandoned',
        last_updated: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', FIXED_USER_ID)
      .select()
      .single()

    if (error) {
      console.error('Error abandoning quiz session:', error)
      return NextResponse.json(
        { error: 'Failed to abandon session', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Session abandoned successfully',
      session: abandonedSession 
    })
  } catch (error: any) {
    console.error('Abandon quiz session error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}