import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminAuth } from '@/lib/auth'

const CURRENT_SEASONS = new Set(['D2 Rec 2026 Summer', 'D2 Comp 2026 Summer'])

// GET — dry run: show what would be deleted
// POST — actually delete
export async function GET(request: Request) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return analyse(false)
}

export async function POST(request: Request) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return analyse(true)
}

async function analyse(doDelete: boolean) {
  // Load every non-sub player with their stat count
  const players = await prisma.player.findMany({
    where: { isSub: false },
    include: { team: true, _count: { select: { gameStat: true } } },
  })

  // Group by normalised name
  const byName = new Map<string, typeof players>()
  for (const p of players) {
    const key = p.name.trim().toLowerCase()
    if (!byName.has(key)) byName.set(key, [])
    byName.get(key)!.push(p)
  }

  const toDelete: { id: string; name: string; team: string; season: string | null; stats: number; reason: string }[] = []
  const kept: { name: string; team: string; season: string | null; stats: number }[] = []

  for (const [, entries] of byName) {
    if (entries.length < 2) continue

    const hasCurrentEntry = entries.some(e => e.season && CURRENT_SEASONS.has(e.season))
    if (!hasCurrentEntry) continue

    // These are the season=None entries for a player who already has a current-season record
    const ghostCandidates = entries.filter(e => !e.season)

    for (const ghost of ghostCandidates) {
      const statCount = ghost._count.gameStat
      if (statCount === 0) {
        // No stats — safe to delete
        toDelete.push({
          id: ghost.id,
          name: ghost.name,
          team: ghost.team.name,
          season: ghost.season,
          stats: statCount,
          reason: 'season=None, 0 stats, player has current-season entry',
        })
      } else {
        // Has stats — keep
        kept.push({ name: ghost.name, team: ghost.team.name, season: ghost.season, stats: statCount })
      }
    }

    // Also clean up exact same-team same-season dupes (keep whichever has more stats)
    const byTeamSeason = new Map<string, typeof players>()
    for (const e of entries) {
      const key = `${e.teamId}|${e.season ?? ''}`
      if (!byTeamSeason.has(key)) byTeamSeason.set(key, [])
      byTeamSeason.get(key)!.push(e)
    }
    for (const [, group] of byTeamSeason) {
      if (group.length < 2) continue
      group.sort((a, b) => b._count.gameStat - a._count.gameStat) // keep highest stats first
      for (let i = 1; i < group.length; i++) {
        const dup = group[i]
        if (!toDelete.some(d => d.id === dup.id)) {
          toDelete.push({
            id: dup.id,
            name: dup.name,
            team: dup.team.name,
            season: dup.season,
            stats: dup._count.gameStat,
            reason: `exact same team+season duplicate of ${group[0].id}`,
          })
        }
      }
    }
  }

  if (doDelete) {
    let deleted = 0
    for (const d of toDelete) {
      try {
        await prisma.playerGameStat.deleteMany({ where: { playerId: d.id } })
        await prisma.player.delete({ where: { id: d.id } })
        deleted++
      } catch (e: any) {
        // skip if already gone
      }
    }
    return NextResponse.json({
      ok: true,
      deleted,
      keptWithStats: kept.length,
      details: toDelete.map(d => `✓ Deleted ${d.name} / ${d.team} (${d.stats} stats) — ${d.reason}`),
      preserved: kept.map(k => `⚠ Kept ${k.name} / ${k.team} — has ${k.stats} historical stats`),
    })
  }

  return NextResponse.json({
    ok: true,
    wouldDelete: toDelete.length,
    wouldKeep: kept.length,
    toDelete,
    toKeep: kept,
  })
}
