import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminAuth } from '@/lib/auth'

export async function POST(request: Request) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const results: string[] = []

    // ── Schema migrations ──────────────────────────────────────────────────
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Team" ADD COLUMN "logo" TEXT`); results.push('logo added') } catch (e: any) { results.push(e.message) }
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Team" ADD COLUMN "active" INTEGER NOT NULL DEFAULT 0`); results.push('active added') } catch (e: any) { results.push(e.message) }
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Game" ADD COLUMN "forfeit" INTEGER NOT NULL DEFAULT 0`); results.push('forfeit added') } catch (e: any) { results.push(e.message) }
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Registration" ADD COLUMN "jerseyNumber" TEXT`); results.push('jerseyNumber added') } catch (e: any) { results.push(e.message) }
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Registration" ADD COLUMN "jerseySize" TEXT`); results.push('jerseySize added') } catch (e: any) { results.push(e.message) }

    // ── Fix AWA stats in D2 2025 Summer ────────────────────────────────────
    try {
      const rows = await prisma.$executeRawUnsafe(`
        UPDATE "PlayerGameStat"
        SET "teamId" = 'cmogql1kg000004jlrmlo6p6l'
        WHERE "teamId" = 'cmoaodbaa00galkpxbg4mgm7k'
        AND "gameId" IN (SELECT id FROM "Game" WHERE season = 'D2 2025 Summer')
      `)
      results.push(`AWA stats fixed: ${rows} rows updated`)
    } catch (e: any) { results.push('AWA stats fix: ' + e.message) }

    return NextResponse.json({ ok: true, results })
  } catch (e: any) {
    return NextResponse.json({ ok: true, msg: e.message })
  }
}
