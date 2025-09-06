import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    const body = await request.json().catch(() => ({}))
    const code = (body?.code || '').toString().trim().toUpperCase()
    if (!code || code.length !== 8) {
      return NextResponse.json({ valid: false, reason: 'INVALID_FORMAT' }, { status: 400 })
    }

    const { data, error } = await (supabase as any)
      .from('invite_codes')
      .select('code,active,expires_at,max_uses,use_count')
      .eq('code', code)
      .maybeSingle()

    if (error) return NextResponse.json({ valid: false, reason: 'INTERNAL' }, { status: 500 })
    if (!data) return NextResponse.json({ valid: false, reason: 'NOT_FOUND' })

    if (!data.active) return NextResponse.json({ valid: false, reason: 'INACTIVE' })
    if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ valid: false, reason: 'EXPIRED' })
    }
    if ((data.use_count ?? 0) >= (data.max_uses ?? 1)) {
      return NextResponse.json({ valid: false, reason: 'LIMIT_REACHED' })
    }

    return NextResponse.json({ valid: true })
  } catch (e: any) {
    return NextResponse.json({ valid: false, reason: 'INTERNAL', details: e?.message }, { status: 500 })
  }
}


