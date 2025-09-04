import { createClient } from '@/lib/supabase/server'

export interface SubscriptionRow {
  status: string
  current_period_end: string | null
  cancel_at_period_end: boolean
  canceled_at: string | null
}

export async function hasActivePro(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await (supabase as any)
    .from('subscriptions')
    .select('status,current_period_end,cancel_at_period_end,canceled_at')
    .eq('user_id', user.id)

  if (error || !data) return false

  const now = Date.now()
  const active = (data as SubscriptionRow[]).some((row) => {
    if (row.status !== 'active') return false
    if (row.cancel_at_period_end) return false
    if (row.current_period_end) {
      const until = new Date(row.current_period_end).getTime()
      if (Number.isFinite(until) && until <= now) return false
    }
    return true
  })

  return active
}
