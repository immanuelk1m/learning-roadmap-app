import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { name, description, color } = await request.json()
    
    if (!name) {
      return NextResponse.json(
        { error: 'Subject name is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data: userRes } = await supabase.auth.getUser()
    const userId = userRes.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // 먼저 RLS 정책 때문에 실패할 수 있으므로, 직접 삽입 시도
    const { data, error } = await supabase
      .from('subjects')
      .insert({
        name,
        description: description || null,
        color: color || '#3B82F6',
        user_id: userId
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      
      // RLS 에러인 경우 더 명확한 메시지 제공
      if (error.code === '42501') {
        return NextResponse.json(
          { 
            error: 'Permission denied. RLS policy may be blocking the request.',
            suggestion: 'Please disable RLS for the subjects table in Supabase dashboard'
          },
          { status: 403 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to create subject', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      subject: data
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}
