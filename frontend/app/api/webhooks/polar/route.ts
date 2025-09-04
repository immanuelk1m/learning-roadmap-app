import { Webhooks } from '@polar-sh/nextjs'
import { createServiceClient } from '@/lib/supabase/service'

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET ?? '',
  onPayload: async (payload: any) => {
    const supabase = createServiceClient()
    try {
      const type: string = payload?.type || ''
      const sub = payload?.data || {}

      // user 매핑: external_customer_id 우선, 없으면 customer.external_id, 메타데이터 등 시도
      const userId: string | null =
        sub?.customer?.external_id ||
        sub?.customerExternalId ||
        sub?.metadata?.externalCustomerId ||
        null

      // 저장 필드 매핑 (snakeCase / camelCase 대응)
      const status = sub?.status || null
      const polarSubscriptionId = sub?.id || null
      const productId = sub?.product_id || sub?.product?.id || null
      const currentPeriodStart = sub?.current_period_start || sub?.currentPeriodStart || null
      const currentPeriodEnd = sub?.current_period_end || sub?.currentPeriodEnd || null
      const cancelAtPeriodEnd = (sub?.cancel_at_period_end ?? sub?.cancelAtPeriodEnd ?? false) as boolean
      const canceledAt = sub?.canceled_at || sub?.canceledAt || null
      const startedAt = sub?.started_at || sub?.startedAt || null
      const endsAt = sub?.ends_at || sub?.endsAt || null

      // 관심 이벤트에 대해서만 upsert
      const isSubscriptionEvent = type.startsWith('subscription.')
      if (isSubscriptionEvent && userId && polarSubscriptionId && productId && status) {
        const row = {
          user_id: userId,
          provider: 'polar',
          polar_subscription_id: polarSubscriptionId,
          product_id: productId,
          status,
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd,
          cancel_at_period_end: cancelAtPeriodEnd,
          canceled_at: canceledAt,
          started_at: startedAt,
          ends_at: endsAt,
          updated_at: new Date().toISOString(),
        }

        const { error } = await supabase
          .from('subscriptions')
          .upsert(
            {
              user_id: userId,
              provider: 'polar',
              polar_subscription_id: polarSubscriptionId,
              product_id: productId,
              status: status,
              current_period_start: currentPeriodStart,
              current_period_end: currentPeriodEnd,
              cancel_at_period_end: cancelAtPeriodEnd,
              canceled_at: canceledAt,
              started_at: startedAt,
              ends_at: endsAt,
            },
            { onConflict: 'polar_subscription_id' }
          )

        if (error) {
          console.error('Webhook upsert error:', error)
        }
      } else {
        console.warn('Webhook ignored or insufficient data', { type, hasUserId: !!userId })
      }
    } catch (e) {
      console.error('Webhook handler error:', e)
    }
  }
})
