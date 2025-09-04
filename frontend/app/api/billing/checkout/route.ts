import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Polar } from '@polar-sh/sdk'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const productId = process.env.POLAR_PRO_PRODUCT_ID || ''
    const accessToken = process.env.POLAR_ACCESS_TOKEN || ''
    if (!productId || !accessToken) {
      console.error('Polar env check', {
        hasProductId: !!productId,
        hasAccessToken: !!accessToken,
      })
      return NextResponse.json({
        error: 'Polar not configured',
        missing: {
          POLAR_PRO_PRODUCT_ID: !productId,
          POLAR_ACCESS_TOKEN: !accessToken,
        }
      }, { status: 500 })
    }

    const successUrl = process.env.POLAR_SUCCESS_URL || `${request.nextUrl.origin}/upgrade/success`

    // Default to sandbox unless explicitly set to production
    const server = process.env.POLAR_SERVER === 'production' ? 'production' : 'sandbox'

    const polar = new Polar({ accessToken, server } as any)
    const checkout = await polar.checkouts.create({
      products: [productId],
      successUrl,
      // 외부 식별자로 Supabase 사용자 ID 연결 → 추후 Webhook에서 역매핑
      externalCustomerId: user.id,
    } as any)

    return NextResponse.json({ url: checkout.url })
  } catch (error: any) {
    console.error('Checkout create error:', error)
    return NextResponse.json({ error: 'Failed to create checkout', details: error.message }, { status: 500 })
  }
}
