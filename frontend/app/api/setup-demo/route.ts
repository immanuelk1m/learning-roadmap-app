import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()
    
    // 데모 사용자 ID (고정)
    const DEMO_USER_ID = '00000000-0000-0000-0000-000000000000'
    
    // 먼저 profiles 테이블에 데모 사용자 생성 (외래 키 제약 조건 무시)
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: DEMO_USER_ID,
        email: 'demo@example.com',
        name: 'Demo User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })
    
    if (profileError) {
      console.log('Profile upsert error (expected):', profileError)
      // 이 오류는 예상되는 것입니다 (auth.users 테이블에 실제 사용자가 없기 때문)
    }
    
    // 테스트용 과목 생성
    const { data: testSubject, error: subjectError } = await supabase
      .from('subjects')
      .insert({
        name: '테스트 과목',
        description: '데모용 테스트 과목입니다',
        color: '#3B82F6',
        user_id: DEMO_USER_ID
      })
      .select()
    
    return NextResponse.json({ 
      success: true,
      message: 'Demo setup completed',
      profileError: profileError?.message,
      subjectError: subjectError?.message,
      testSubject
    })
    
  } catch (error) {
    console.error('Demo setup error:', error)
    return NextResponse.json(
      { success: false, error: 'Demo setup failed', details: error },
      { status: 500 }
    )
  }
}