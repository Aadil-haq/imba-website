import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminAuth } from '@/lib/auth'

const CURRENT_SEASONS = new Set(['D2 Rec 2026 Summer', 'D2 Comp 2026 Summer'])

export async function POST(request: Request) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
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

    const results: string[] = []
    let mergedGroups = 0
    let deletedRecords = 0

    for (const [, entries] of byName) {
      if (entries.length < 2) continue

      // Pick canonical: current-season entry with most stats, else overall most stats
      const withCurrent = entries.filter(e => e.season && CURRENT_SEASONS.has(e.season))
      const pool = withCurrent.length > 0 ? withCurrent : entries
      const canonical = pool.reduce((best, e) => e._count.gameStat >= best._count.gameStat ? e : best)
      const others = entries.filter(e => e.id !== canonical.id)

      for (const dupe of others) {
        try {
          // Use raw SQL to re-point stats — more reliable on Turso
          await (prisma as any).$executeRawUnsafe(
            `UPDATE "PlayerGameStat" SET "playerId" = ? WHERE "playerId" = ?`,
            canonical.id,
            dupe.id
          )
          await prisma.player.delete({ where: { id: dupe.id } })
          results.push(`✓ ${dupe.name} / ${dupe.season ?? 'legacy'} — ${dupe._count.gameStat} stats moved to canonical`)
          deletedRecords++
        } catch (e: any) {
          results.push(`✗ ${dupe.name} / ${dupe.id}: ${e.message}`)
        }
      }

      if (others.length > 0) mergedGroups++
    }

    return NextResponse.json({ ok: true, mergedGroups, deletedRecords, results })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
