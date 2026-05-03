import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminAuth } from '@/lib/auth'
import { addPlayerFromRegistration } from '../registrations/route'

/**
 * POST /api/admin/roster-backfill
 * Iterates all paid registrations and ensures each player is on their team's roster.
 * Safe to run multiple times — skips already-rostered players.
 */
export async function POST(request: Request) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const paidRegs = await prisma.registration.findMany({
      where: { paymentStatus: 'paid' },
      orderBy: { createdAt: 'asc' },
    })

    const results: string[] = []
    for (const reg of paidRegs) {
      const result = await addPlayerFromRegistration(reg)
      results.push(result.msg)
    }

    const rostered = results.filter(r => r.startsWith('Rostered:')).length
    const skipped = results.filter(r => r.startsWith('Already')).length
    const failed = results.filter(r => r.startsWith('No team')).length

    return NextResponse.json({ ok: true, rostered, skipped, failed, details: results })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
