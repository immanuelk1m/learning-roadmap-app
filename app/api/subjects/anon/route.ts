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
    
    // 익명 사용자로 로그인
    const { data: { user }, error: authError } = await supabase.auth.signInAnonymously()
    
    if (authError || !user) {
      console.error('Anonymous auth error:', authError)
      return NextResponse.json(
        { error: 'Failed to authenticate anonymously' },
        { status: 500 }
      )
    }
    
    // 익명 사용자 ID로 과목 생성
    const { data, error } = await supabase
      .from('subjects')
      .insert({
        name,
        description: description || null,
        color: color || '#3B82F6',
        user_id: user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
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