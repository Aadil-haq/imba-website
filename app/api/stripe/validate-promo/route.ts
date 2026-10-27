import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')?.trim().toUpperCase()
  if (!code) return NextResponse.json({ valid: false, error: 'No code provided' })

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) return NextResponse.json({ valid: false, error: 'Stripe not configured' })

  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(stripeKey)

    const list = await stripe.promotionCodes.list({ code, limit: 1 })
    const promo = list.data[0]

    if (!promo || !promo.active) {
      return NextResponse.json({ valid: false, error: 'Invalid or expired code' })
    }

    const coupon = (promo as any).coupon as any
    const percentOff: number = coupon?.percent_off ?? 0
    const amountOff: number = coupon?.amount_off ?? 0

    return NextResponse.json({ valid: true, percentOff, amountOff, code: promo.code })
  } catch {
    return NextResponse.json({ valid: false, error: 'Could not validate code' })
  }
}
