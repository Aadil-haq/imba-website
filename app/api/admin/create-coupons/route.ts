import { NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth'

export async function POST(request: Request) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) return NextResponse.json({ error: 'No Stripe key' }, { status: 400 })

  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(stripeKey)

  const results: Record<string, unknown> = {}

  // Create a 100% off coupon (reusable)
  const coupon = await stripe.coupons.create({
    percent_off: 100,
    duration: 'once',
    name: 'IMBA 100% Off',
  })
  results.coupon = coupon.id

  // Create the two promo codes
  for (const code of ['IMBACOMMISHCODE', 'IMBAVOLUNTEERCODE']) {
    try {
      const promo = await stripe.promotionCodes.create({
        promotion: { type: 'coupon', coupon: coupon.id },
        code,
      })
      results[code] = promo.id
    } catch (e: any) {
      results[code] = `error: ${e.message}`
    }
  }

  return NextResponse.json({ ok: true, ...results })
}
