import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

async function addPlayerFromRegistration(reg: {
  firstName: string; lastName: string; teamPref: string | null
  jerseyNumber: string | null; position: string
}) {
  if (!reg.teamPref) return
  const team = await prisma.team.findFirst({
    where: { name: reg.teamPref.trim() },
    orderBy: { createdAt: 'desc' },
  })
  if (!team) { console.error('No team found for teamPref:', reg.teamPref); return }
  const fullName = `${reg.firstName.trim()} ${reg.lastName.trim()}`
  const exists = await prisma.player.findFirst({ where: { name: fullName, teamId: team.id } })
  if (!exists) {
    await prisma.player.create({
      data: {
        name: fullName,
        number: parseInt(reg.jerseyNumber || '0') || 0,
        position: reg.position || 'G',
        isSub: false,
        teamId: team.id,
      },
    })
    console.log('Auto-rostered:', fullName, '->', team.name)
  }
}

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

        // Auto-add player to team roster — isolated so a failure never blocks payment confirmation
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
