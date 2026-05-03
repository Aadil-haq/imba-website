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
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Game" ADD COLUMN "driveUrl" TEXT`); results.push('driveUrl added') } catch (e: any) { results.push(e.message) }
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Registration" ADD COLUMN "jerseyNumber" TEXT`); results.push('jerseyNumber added') } catch (e: any) { results.push(e.message) }
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Registration" ADD COLUMN "jerseySize" TEXT`); results.push('jerseySize added') } catch (e: any) { results.push(e.message) }

    // ── Season column on Player ─────────────────────────────────────────────
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Player" ADD COLUMN "season" TEXT`); results.push('Player.season added') } catch (e: any) { results.push(e.message) }

    // ── Discount code on Registration ───────────────────────────────────────
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Registration" ADD COLUMN "discountCode" TEXT`); results.push('Registration.discountCode added') } catch (e: any) { results.push(e.message) }

    // ── Fix registration seasons ────────────────────────────────────────────
    try {
      const rows = await prisma.$executeRawUnsafe(`UPDATE "Registration" SET "season" = 'Summer 2026' WHERE "season" = 'Spring 2025'`)
      results.push(`Registration seasons updated: ${rows} rows`)
    } catch (e: any) { results.push('Registration season fix: ' + e.message) }

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

    // ── Deduplicate players: same name + same team → keep one, delete rest ────
    try {
      const allPlayers = await prisma.player.findMany({
        select: { id: true, name: true, teamId: true, season: true },
        orderBy: { id: 'asc' }, // older cuid = created first
      })

      // Group by name+teamId
      const groups: Record<string, typeof allPlayers> = {}
      for (const p of allPlayers) {
        const key = `${p.name.trim().toLowerCase()}__${p.teamId}`
        if (!groups[key]) groups[key] = []
        groups[key].push(p)
      }

      let deleted = 0
      for (const group of Object.values(groups)) {
        if (group.length <= 1) continue

        // Keep the one with a non-null season (correctly tagged) or oldest ID
        const keep = group.find(p => p.season !== null) ?? group[0]
        const toDelete = group.filter(p => p.id !== keep.id)

        for (const p of toDelete) {
          // Reassign any stats from the duplicate to the keeper
          await prisma.playerGameStat.updateMany({
            where: { playerId: p.id },
            data: { playerId: keep.id },
          }).catch(() => {}) // ignore unique constraint conflicts
          await prisma.playerGameStat.deleteMany({ where: { playerId: p.id } })
          await prisma.player.delete({ where: { id: p.id } })
          deleted++
        }
      }
      results.push(`Deduplication: removed ${deleted} duplicate player records`)
    } catch (e: any) { results.push('Deduplication: ' + e.message) }

    // ── Backfill player.season from registration season to actual league season ──
    try {
      const stSetting = await prisma.siteSetting.findUnique({ where: { key: 'season_teams' } })
      const seasonTeamsMap: Record<string, string[]> = stSetting ? JSON.parse(stSetting.value) : {}

      let backfilled = 0
      for (const [leagueSeason, teamIds] of Object.entries(seasonTeamsMap)) {
        if (!teamIds.length) continue
        // Find players on these teams whose season doesn't match the league season
        // (e.g. player.season = "Summer 2026" but league season = "D2 Rec 2026 Summer")
        const toFix = await prisma.player.findMany({
          where: {
            teamId: { in: teamIds },
            isSub: false,
            season: { not: null },
            NOT: { season: leagueSeason },
          },
          select: { id: true },
        })
        if (toFix.length > 0) {
          await prisma.player.updateMany({
            where: { id: { in: toFix.map(p => p.id) } },
            data: { season: leagueSeason },
          })
          backfilled += toFix.length
          results.push(`Backfilled ${toFix.length} players → ${leagueSeason}`)
        }
      }
      if (backfilled === 0) results.push('Player season backfill: nothing to update')
    } catch (e: any) { results.push('Player season backfill: ' + e.message) }

    return NextResponse.json({ ok: true, results })
  } catch (e: any) {
    return NextResponse.json({ ok: true, msg: e.message })
  }
}
