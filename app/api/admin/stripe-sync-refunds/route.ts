import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminAuth } from '@/lib/auth'

// POST — check all paid registrations' Stripe sessions for refunds.
// For any that were refunded in Stripe, marks the registration as 'refunded'
// and removes the player from their team roster.
export async function POST(request: Request) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey || stripeKey === 'sk_test_placeholder') {
    return NextResponse.json({ error: 'No Stripe key configured' }, { status: 400 })
  }

  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(stripeKey)

  // Only check paid registrations that have a Stripe session ID
  const regs = await prisma.registration.findMany({
    where: {
      paymentStatus: 'paid',
      stripeSession: { not: null },
    },
  })

  const results: string[] = []
  let refundedCount = 0

  for (const reg of regs) {
    try {
      // Retrieve the checkout session to get the payment intent
      const session = await stripe.checkout.sessions.retrieve(reg.stripeSession!)

      if (!session.payment_intent) continue

      const piId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent.id

      // Retrieve payment intent with latest charge
      const pi = await stripe.paymentIntents.retrieve(piId, {
        expand: ['latest_charge'],
      })

      const charge = (pi as any).latest_charge
      if (!charge) continue

      const amountRefunded: number = charge.amount_refunded ?? 0
      const fullyRefunded: boolean = charge.refunded === true

      // Count as refunded if at least partially refunded
      if (amountRefunded <= 0) continue

      const fullName = `${reg.firstName.trim()} ${reg.lastName.trim()}`
      results.push(
        `${fullName}: refunded $${(amountRefunded / 100).toFixed(2)}${fullyRefunded ? ' (full)' : ' (partial)'}`
      )

      // Mark registration as refunded
      await prisma.registration.update({
        where: { id: reg.id },
        data: { paymentStatus: 'refunded' },
      })

      // Remove player from their team roster
      if (reg.teamPref) {
        try {
          const team = await prisma.team.findFirst({ where: { name: reg.teamPref.trim() } })
          if (team) {
            const player = await prisma.player.findFirst({
              where: { name: fullName, teamId: team.id },
            })
            if (player) {
              await prisma.playerGameStat.deleteMany({ where: { playerId: player.id } })
              await prisma.player.delete({ where: { id: player.id } })
              results.push(`  → Removed ${fullName} from ${team.name}`)
            } else {
              results.push(`  → No roster entry found for ${fullName} on ${team.name}`)
            }
          }
        } catch (e: any) {
          results.push(`  → Failed to remove player: ${e.message}`)
        }
      }

      refundedCount++
    } catch (e: any) {
      results.push(`✗ ${reg.id}: ${e.message}`)
    }
  }

  return NextResponse.json({
    ok: true,
    checked: regs.length,
    refunded: refundedCount,
    results,
  })
}
