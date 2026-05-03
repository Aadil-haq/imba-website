import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { addPlayerFromRegistration } from '@/app/api/admin/registrations/route'

export async function POST(request: Request) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!stripeKey || stripeKey === 'sk_test_placeholder') {
      return NextResponse.json({ received: true })
    }

    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(stripeKey)

    const body = await request.text()
    const sig = request.headers.get('stripe-signature') || ''

    let event
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret || '')
    } catch (err: any) {
      return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any
      const registrationId = session.metadata?.registrationId

      if (registrationId) {
        // Extract promo code if one was used
        let discountCode: string | null = null
        try {
          const discounts = session.total_details?.breakdown?.discounts ?? []
          const promoCode = discounts[0]?.discount?.promotion_code
          if (typeof promoCode === 'string') {
            // promoCode is an ID — fetch the actual code string
            const Stripe2 = (await import('stripe')).default
            const stripe2 = new Stripe2(stripeKey!)
            const pc = await stripe2.promotionCodes.retrieve(promoCode)
            discountCode = pc.code ?? null
          } else if (promoCode?.code) {
            discountCode = promoCode.code
          }
        } catch { /* non-fatal */ }

        const reg = await prisma.registration.update({
          where: { id: registrationId },
          data: {
            paymentStatus: 'paid',
            stripeSession: session.id,
            amount: session.amount_total ?? 8000,
            ...(discountCode ? { discountCode } : {}),
          },
        })

        try {
          await addPlayerFromRegistration(reg)
        } catch (err) {
          console.error('Auto-roster error for registration', registrationId, err)
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}
