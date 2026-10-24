import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminAuth } from '@/lib/auth'
import { addPlayerFromRegistration } from '@/app/api/admin/registrations/route'

// POST — match successful Stripe payment intents to pending registrations by email or metadata registrationId
export async function POST(request: Request) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey || stripeKey.includes('placeholder')) {
    return NextResponse.json({ error: 'No Stripe key configured' }, { status: 400 })
  }

  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(stripeKey)

  const pendingRegs = await prisma.registration.findMany({ where: { paymentStatus: 'pending' } })
  if (pendingRegs.length === 0) return NextResponse.json({ ok: true, matched: 0, results: ['No pending registrations'] })

  // Build lookup maps
  const byId = new Map(pendingRegs.map(r => [r.id, r]))
  const byEmail = new Map(pendingRegs.map(r => [r.email.toLowerCase().trim(), r]))

  const results: string[] = []
  let matched = 0

  // Page through all recent succeeded payment intents
  let hasMore = true
  let startingAfter: string | undefined = undefined

  while (hasMore) {
    const page = await stripe.paymentIntents.list({
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })

    for (const pi of page.data) {
      if (pi.status !== 'succeeded') continue

      // Try matching by registrationId in metadata first, then by email
      const metaId = pi.metadata?.registrationId
      const email = (pi.receipt_email || pi.metadata?.email || '').toLowerCase().trim()

      const reg = (metaId && byId.get(metaId)) || (email && byEmail.get(email)) || null
      if (!reg) continue

      await prisma.registration.update({
        where: { id: reg.id },
        data: {
          paymentStatus: 'paid',
          stripeSession: pi.id,
          amount: pi.amount_received ?? pi.amount ?? reg.amount,
        },
      })

      try { await addPlayerFromRegistration(reg) } catch {}

      results.push(`✓ ${reg.firstName} ${reg.lastName} (${reg.email}) → paid via ${pi.id}`)
      byId.delete(reg.id)
      byEmail.delete(reg.email.toLowerCase().trim())
      matched++
    }

    hasMore = page.has_more
    if (page.data.length > 0) startingAfter = page.data[page.data.length - 1].id
    // Stop after 3 pages (~300 intents) to avoid timeout
    if (startingAfter && matched === 0 && page.data[0]?.created < Date.now() / 1000 - 60 * 60 * 24 * 30) break
  }

  for (const reg of byId.values()) {
    results.push(`— No Stripe match: ${reg.firstName} ${reg.lastName} (${reg.email})`)
  }

  return NextResponse.json({ ok: true, matched, totalPending: pendingRegs.length, results })
}
