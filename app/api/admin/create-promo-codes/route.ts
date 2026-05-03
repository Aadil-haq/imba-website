import { NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth'

async function stripePost(path: string, params: Record<string, string>, key: string) {
  const body = new URLSearchParams(params).toString()
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2023-10-16',
    },
    body,
  })
  return res.json()
}

export async function POST(request: Request) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey || stripeKey === 'sk_test_placeholder') {
    return NextResponse.json({ error: 'No Stripe key configured' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const codes: { code: string; percentOff: number }[] = body.codes ?? []

  if (codes.length === 0) return NextResponse.json({ error: 'No codes provided' }, { status: 400 })

  const results: string[] = []

  for (const { code, percentOff } of codes) {
    try {
      // Create coupon
      const coupon = await stripePost('/coupons', {
        percent_off: String(percentOff),
        duration: 'once',
      }, stripeKey)

      if (coupon.error) throw new Error(coupon.error.message)

      // Create promo code
      const promo = await stripePost('/promotion_codes', {
        coupon: coupon.id,
        code: code.toUpperCase(),
      }, stripeKey)

      if (promo.error) throw new Error(promo.error.message)

      results.push(`✓ ${promo.code} — ${percentOff}% off`)
    } catch (e: any) {
      results.push(`✗ ${code}: ${e.message}`)
    }
  }

  return NextResponse.json({ ok: true, results })
}
