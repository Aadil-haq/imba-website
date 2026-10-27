import { NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth'

export async function POST(request: Request) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) return NextResponse.json({ error: 'No Stripe key' }, { status: 400 })

  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(stripeKey)

  // Find IMBACOMMISHCODE
  const list = await stripe.promotionCodes.list({ code: 'IMBACOMMISHCODE', limit: 5 })
  const existing = list.data[0]
  if (!existing) return NextResponse.json({ error: 'IMBACOMMISHCODE not found' }, { status: 404 })

  const info: Record<string, unknown> = {
    id: existing.id,
    code: existing.code,
    active: existing.active,
    max_redemptions: existing.max_redemptions,
    times_redeemed: existing.times_redeemed,
  }

  // If max_redemptions is set, deactivate and recreate without it
  if (existing.max_redemptions !== null && existing.max_redemptions !== undefined) {
    await stripe.promotionCodes.update(existing.id, { active: false })
    const couponId = ((existing as any).coupon as any)?.id ?? (existing as any).coupon
    const newPromo = await stripe.promotionCodes.create({
      promotion: { type: 'coupon', coupon: couponId },
      code: 'IMBACOMMISHCODE',
    })
    info.action = 'recreated_unlimited'
    info.new_id = newPromo.id
    info.new_max_redemptions = newPromo.max_redemptions
  } else {
    info.action = 'already_unlimited'
  }

  return NextResponse.json({ ok: true, ...info })
}
