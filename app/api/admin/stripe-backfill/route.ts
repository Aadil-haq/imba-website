import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminAuth } from '@/lib/auth'

// POST — look up every paid registration's Stripe session and backfill amount + discountCode
export async function POST(request: Request) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey || stripeKey === 'sk_test_placeholder') {
    return NextResponse.json({ error: 'No Stripe key configured' }, { status: 400 })
  }

  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(stripeKey)

  // Get all paid registrations that have a Stripe session ID
  const regs = await prisma.registration.findMany({
    where: {
      paymentStatus: 'paid',
      stripeSession: { not: null },
    },
    select: { id: true, stripeSession: true, amount: true, discountCode: true },
  })

  const results: string[] = []
  let updated = 0

  for (const reg of regs) {
    try {
      const session = await stripe.checkout.sessions.retrieve(reg.stripeSession!, {
        expand: ['total_details.breakdown.discounts'],
      })

      const actualAmount = session.amount_total ?? reg.amount

      // Extract discount code
      let discountCode: string | null = reg.discountCode
      try {
        const discounts = (session as any).total_details?.breakdown?.discounts ?? []
        const promoCode = discounts[0]?.discount?.promotion_code
        if (typeof promoCode === 'string') {
          const pc = await stripe.promotionCodes.retrieve(promoCode)
          discountCode = pc.code ?? null
        } else if (promoCode?.code) {
          discountCode = promoCode.code
        }
      } catch { /* non-fatal */ }

      const needsUpdate = actualAmount !== reg.amount || discountCode !== reg.discountCode
      if (needsUpdate) {
        await prisma.registration.update({
          where: { id: reg.id },
          data: {
            amount: actualAmount,
            ...(discountCode ? { discountCode } : {}),
          },
        })
        results.push(`✓ Updated ${reg.id}: $${(actualAmount / 100).toFixed(2)}${discountCode ? ` [${discountCode}]` : ''}`)
        updated++
      }
    } catch (e: any) {
      results.push(`✗ ${reg.id}: ${e.message}`)
    }
  }

  return NextResponse.json({ ok: true, total: regs.length, updated, results })
}
