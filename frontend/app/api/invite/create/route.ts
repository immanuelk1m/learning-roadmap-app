import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Count existing codes for this user
    const { count } = await (supabase as any)
      .from('invite_codes')
      .select('code', { count: 'exact', head: true })
      .eq('inviter_user_id', user.id)

    if ((count ?? 0) >= 5) {
      return NextResponse.json({ error: 'LIMIT_REACHED', limitReached: true, currentCount: count ?? 5 }, { status: 409 })
    }

    // Generate unique 8-char code using DB function
    const { data: gen, error: genErr } = await (supabase as any)
      .rpc('generate_unique_invite_code', { len: 8 })
    if (genErr || !gen) {
      return NextResponse.json({ error: 'FAILED_TO_GENERATE' }, { status: 500 })
    }

    const code: string = Array.isArray(gen) ? gen[0] : gen

    const { data, error } = await (supabase as any)
      .from('invite_codes')
      .insert({ code, inviter_user_id: user.id })
      .select('code,created_at')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'FAILED_TO_CREATE' }, { status: 500 })
    }

    return NextResponse.json({ code: data.code })
  } catch (e: any) {
    return NextResponse.json({ error: 'INTERNAL', details: e?.message }, { status: 500 })
  }
}


