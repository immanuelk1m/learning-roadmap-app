import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    // anon 키로는 RLS를 비활성화할 수 없으므로, 
    // 대신 누구나 접근 가능한 정책을 만드는 방법을 시도
    
    return NextResponse.json({ 
      message: 'RLS 비활성화는 서비스 역할 키가 필요합니다. Supabase 대시보드에서 직접 설정해주세요.',
      instructions: [
        '1. Supabase 대시보드로 이동',
        '2. SQL 에디터에서 다음 명령 실행:',
        'ALTER TABLE public.subjects DISABLE ROW LEVEL SECURITY;'
      ]
    })
    
  } catch (error) {
    console.error('RLS disable error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to disable RLS' },
      { status: 500 }
    )
  }
}