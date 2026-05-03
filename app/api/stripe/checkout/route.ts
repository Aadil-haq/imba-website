import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey || stripeKey === 'sk_test_placeholder' || stripeKey.includes('placeholder')) {
      return NextResponse.json(
        { error: 'Stripe is not configured. Contact the league admin.' },
        { status: 400 }
      )
    }

    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(stripeKey)

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const league = body.league || 'Rec League'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'], // Apple Pay & Google Pay are included automatically in Stripe Checkout
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `IMBA ${league} Registration`,
              description: `${body.firstName} ${body.lastName} · ${body.position}`,
            },
            unit_amount: 8000, // $80.00
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      allow_promotion_codes: true,
      success_url: `${siteUrl}/register/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/register?cancelled=true`,
      customer_email: body.email,
      metadata: {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        league,
        registrationId: body.registrationId || '',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('Stripe checkout error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
