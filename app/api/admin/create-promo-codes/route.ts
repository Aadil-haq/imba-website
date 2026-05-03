import { NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth'

export async function POST(request: Request) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey || stripeKey === 'sk_test_placeholder') {
    return NextResponse.json({ error: 'No Stripe key configured' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const codes: { code: string; percentOff: number }[] = body.codes ?? []

  if (codes.length === 0) return NextResponse.json({ error: 'No codes provided' }, { status: 400 })

  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(stripeKey)

  const results: string[] = []

  for (const { code, percentOff } of codes) {
    try {
      // Create a coupon for this percentage
      const coupon = await (stripe.coupons.create as any)({ percent_off: percentOff, duration: 'once' })

      // Create the promo code using the coupon ID
      const promo = await (stripe.promotionCodes.create as any)({
        coupon: coupon.id,
        code: code.toUpperCase(),
      })

      results.push(`✓ ${promo.code} — ${percentOff}% off (coupon: ${coupon.id})`)
    } catch (e: any) {
      results.push(`✗ ${code}: ${e.message}`)
    }
  }

  return NextResponse.json({ ok: true, results })
}
