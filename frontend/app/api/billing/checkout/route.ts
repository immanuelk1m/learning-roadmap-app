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
    // 최신 SDK에서는 custom checkout 엔드포인트 사용
    const checkout = await (polar as any).checkouts.custom.create({
      productId,
      successUrl,
      // 사용자 매핑을 메타데이터로 전달 → 웹훅에서 역매핑 가능
      customerMetadata: { externalCustomerId: user.id },
    })

    return NextResponse.json({ url: checkout.url })
  } catch (error: any) {
    console.error('Checkout create error:', error)
    return NextResponse.json({ error: 'Failed to create checkout', details: error.message }, { status: 500 })
  }
}
