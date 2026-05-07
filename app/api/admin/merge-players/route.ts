import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminAuth } from '@/lib/auth'

// POST — merge all duplicate-named players into one canonical record.
// Stats are re-pointed to the canonical player; extras are deleted.
// Canonical = current-season entry if exists, else highest-stat entry.
export async function POST(request: Request) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const players = await prisma.player.findMany({
    where: { isSub: false },
    include: { _count: { select: { gameStat: true } } },
  })

  // Group by normalised name
  const byName = new Map<string, typeof players>()
  for (const p of players) {
    const key = p.name.trim().toLowerCase()
    if (!byName.has(key)) byName.set(key, [])
    byName.get(key)!.push(p)
  }

  const CURRENT_SEASONS = new Set(['D2 Rec 2026 Summer', 'D2 Comp 2026 Summer'])

  const results: string[] = []
  let mergedGroups = 0
  let deletedRecords = 0

  for (const [, entries] of byName) {
    if (entries.length < 2) continue

    // Pick canonical: prefer current-season entry, then most stats
    const withCurrentSeason = entries.filter(e => e.season && CURRENT_SEASONS.has(e.season))
    const canonical = withCurrentSeason.length > 0
      ? withCurrentSeason.reduce((best, e) => e._count.gameStat > best._count.gameStat ? e : best)
      : entries.reduce((best, e) => e._count.gameStat > best._count.gameStat ? e : best)

    const others = entries.filter(e => e.id !== canonical.id)

    for (const dupe of others) {
      // Re-point all stats from dupe → canonical
      const moved = await prisma.playerGameStat.updateMany({
        where: { playerId: dupe.id },
        data: { playerId: canonical.id },
      })
      // Delete the now-empty dupe
      await prisma.player.delete({ where: { id: dupe.id } })
      results.push(
        `✓ Merged ${dupe.name} [${dupe.season ?? 'no-season'} / ${(dupe as any).teamId}] → canonical ${canonical.id} (moved ${moved.count} stats)`
      )
      deletedRecords++
    }

    if (others.length > 0) mergedGroups++
  }

  return NextResponse.json({ ok: true, mergedGroups, deletedRecords, results })
}
