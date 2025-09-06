import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const service = createServiceClient()
    // Ensure five codes exist (server-side function, bypass RLS)
    await (service as any).rpc('ensure_five_invite_codes', { p_user_id: user.id })

    const { data, error } = await (service as any)
      .from('invite_codes')
      .select('code,use_count,max_uses,active,created_at')
      .eq('inviter_user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: 'FAILED_TO_FETCH' }, { status: 500 })

    const codes = data || []
    const availableSlots = Math.max(5 - codes.length, 0)
    return NextResponse.json({ codes, availableSlots })
  } catch (e: any) {
    return NextResponse.json({ error: 'INTERNAL', details: e?.message }, { status: 500 })
  }
}


