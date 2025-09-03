import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    // Get current authenticated user from cookie session
    const supabase = await createClient()
    const { data: auth } = await supabase.auth.getUser()
    const userId = auth.user?.id

    if (!userId) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    // Use service role to read from auth.users (Admin API)
    const svc = createServiceClient()
    const { data, error } = await svc.auth.admin.getUserById(userId)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const u = data.user
    const name =
      (u.user_metadata as any)?.full_name ||
      (u.user_metadata as any)?.name ||
      (u.user_metadata as any)?.nickname ||
      null
    const avatar_url =
      (u.user_metadata as any)?.avatar_url ||
      (u.user_metadata as any)?.picture ||
      (u.user_metadata as any)?.profile_image ||
      null

    return NextResponse.json(
      {
        user: {
          id: u.id,
          email: u.email,
          name,
          avatar_url,
          raw_metadata: u.user_metadata,
        },
      },
      { status: 200 }
    )
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unknown error' }, { status: 500 })
  }
}

