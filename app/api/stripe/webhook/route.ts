import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

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
        await prisma.registration.update({
          where: { id: registrationId },
          data: {
            paymentStatus: 'paid',
            stripeSession: session.id,
          },
        })
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}
