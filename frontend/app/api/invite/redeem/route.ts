import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const service = createServiceClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const code = (body?.code || '').toString().trim().toUpperCase()
    if (!code || code.length !== 8) {
      return NextResponse.json({ error: 'INVALID_FORMAT' }, { status: 400 })
    }

    // Eligibility: 서버는 1회만 허용(초대 사용 로그 유니크 제약)으로 제한. 별도 온보딩 존재 여부는 제한하지 않음.

    // Validate code
    const { data, error } = await (service as any)
      .from('invite_codes')
      .select('code,active,expires_at,max_uses,use_count,inviter_user_id')
      .eq('code', code)
      .maybeSingle()
    if (error) return NextResponse.json({ error: 'INTERNAL' }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    if (!data.active) return NextResponse.json({ error: 'INACTIVE' }, { status: 400 })
    if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'EXPIRED' }, { status: 400 })
    }
    if ((data.use_count ?? 0) >= (data.max_uses ?? 1)) {
      return NextResponse.json({ error: 'LIMIT_REACHED' }, { status: 400 })
    }

    // Ensure user hasn't redeemed before
    const { data: prior } = await (service as any)
      .from('invite_redemptions')
      .select('id')
      .eq('invited_user_id', user.id)
      .maybeSingle()
    if (prior) return NextResponse.json({ error: 'ALREADY_USED' }, { status: 409 })

    // Perform redemption and grant 1 month pro
    // Use Postgrest sequential ops (best-effort). In production consider RPC transaction.
    const { error: insErr } = await (service as any)
      .from('invite_redemptions')
      .insert({ code, invited_user_id: user.id })
    if (insErr) return NextResponse.json({ error: 'REDEMPTION_FAILED' }, { status: 500 })

    const { error: updErr } = await (service as any)
      .from('invite_codes')
      .update({ use_count: (data.use_count ?? 0) + 1 })
      .eq('code', code)
    if (updErr) return NextResponse.json({ error: 'UPDATE_FAILED' }, { status: 500 })

    // Upsert subscriptions row (referral)
    const nowIso = new Date().toISOString()
    const until = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const { error: subErr } = await (service as any)
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        provider: 'referral',
        product_id: 'referral_pro_1m',
        status: 'active',
        current_period_start: nowIso,
        current_period_end: until,
        cancel_at_period_end: true,
      })
    if (subErr) return NextResponse.json({ error: 'SUBSCRIPTION_FAILED' }, { status: 500 })

    return NextResponse.json({ success: true, pro_until: until })
  } catch (e: any) {
    return NextResponse.json({ error: 'INTERNAL', details: e?.message }, { status: 500 })
  }
}


