import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // pages 값을 요청 바디에서 수신 (선택된 페이지 수 또는 전체 페이지 수)
    let pages = 0
    try {
      const body = await request.json()
      pages = Number(body?.pages || 0)
    } catch {}
    if (!Number.isFinite(pages) || pages <= 0) {
      return NextResponse.json({ error: 'INVALID_PAGES', message: '올바른 페이지 수가 필요합니다.' }, { status: 400 })
    }

    const { data, error } = await (supabase as any)
      .rpc('check_and_increment_pdf_pages', { p_user_id: user.id, p_pages: pages })

    if (error) {
      console.error('check_and_increment_pdf_upload error:', error)
      return NextResponse.json({ error: 'Failed to check usage' }, { status: 500 })
    }

    const result = Array.isArray(data) ? data[0] : data
    if (!result?.allowed) {
      return NextResponse.json({
        error: 'UPLOAD_LIMIT_REACHED',
        message: '이 달의 PDF 업로드 한도를 초과했습니다.',
        current_count: result?.current_count,
        limit_count: result?.limit_count,
      }, { status: 429 })
    }

    return NextResponse.json({ success: true, ...result })
  } catch (e: any) {
    return NextResponse.json({ error: 'Internal error', details: e?.message }, { status: 500 })
  }
}
