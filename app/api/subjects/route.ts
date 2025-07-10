import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { name, description, color } = await request.json()
    
    if (!name) {
      return NextResponse.json(
        { error: 'Subject name is required' },
        { status: 400 }
      )
    }

    // 직접 Supabase 클라이언트 생성
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    // 고정 사용자 ID 사용
    const FIXED_USER_ID = '00000000-0000-0000-0000-000000000000'
    
    // 먼저 RLS 정책 때문에 실패할 수 있으므로, 직접 삽입 시도
    const { data, error } = await supabase
      .from('subjects')
      .insert({
        name,
        description: description || null,
        color: color || '#3B82F6',
        user_id: FIXED_USER_ID
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