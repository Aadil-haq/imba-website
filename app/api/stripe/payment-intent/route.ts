import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey || stripeKey.includes('placeholder')) {
      return NextResponse.json({ error: 'Stripe is not configured.' }, { status: 400 })
    }

    const body = await request.json()
    const { registrationId, amount, email, firstName, lastName, league } = body

    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(stripeKey)

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount ?? 8000,
      currency: 'usd',
      receipt_email: email,
      metadata: {
        registrationId: registrationId || '',
        firstName: firstName || '',
        lastName: lastName || '',
        league: league || '',
      },
      automatic_payment_methods: { enabled: true },
    })

    return NextResponse.json({ clientSecret: paymentIntent.client_secret })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('PaymentIntent error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
