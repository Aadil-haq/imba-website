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
        const reg = await prisma.registration.update({
          where: { id: registrationId },
          data: { paymentStatus: 'paid', stripeSession: session.id },
        })

        // Auto-add player to team roster if they selected a team
        if (reg.teamPref) {
          const team = await prisma.team.findFirst({
            where: { name: reg.teamPref },
            orderBy: { createdAt: 'desc' },
          })
          if (team) {
            const fullName = `${reg.firstName} ${reg.lastName}`
            const exists = await prisma.player.findFirst({ where: { name: fullName, teamId: team.id } })
            if (!exists) {
              await prisma.player.create({
                data: {
                  name: fullName,
                  number: parseInt(reg.jerseyNumber || '0') || 0,
                  position: reg.position || 'G',
                  teamId: team.id,
                },
              })
            }
          }
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}
