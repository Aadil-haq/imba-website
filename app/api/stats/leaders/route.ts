import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const season = searchParams.get('season')

    // Fetch all raw stat rows (avoid groupBy + where on Turso which can fail)
    const where: Record<string, unknown> = { player: { isSub: false } }
    if (season) {
      const games = await prisma.game.findMany({ where: { season, played: true }, select: { id: true }, take: 5000 })
      const ids = games.map(g => g.id)
      if (ids.length === 0) return NextResponse.json({ scorers: [], rebounders: [], assisters: [], stealers: [] })
      where.gameId = { in: ids }
    }

    const rows = await prisma.playerGameStat.findMany({
      where,
      select: {
        playerId: true,
        points: true, rebounds: true, assists: true, steals: true, blocks: true,
        player: { select: { id: true, name: true, isSub: true } },
        team: { select: { name: true, slug: true, color: true } },
      },
      take: 10000,
    })

    // Aggregate manually per player
    const agg = new Map<string, { name: string; teamName: string; teamSlug: string; teamColor: string; gp: number; pts: number; reb: number; ast: number; stl: number; blk: number }>()
    for (const r of rows) {
      if (!r.player || r.player.isSub || !r.team) continue
      const dnp = r.points === 0 && r.rebounds === 0 && r.assists === 0 && r.steals === 0 && r.blocks === 0
      if (dnp) continue
      const cur = agg.get(r.playerId) ?? { name: r.player.name, teamName: r.team.name, teamSlug: r.team.slug, teamColor: r.team.color, gp: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0 }
      cur.gp++
      cur.pts += r.points
      cur.reb += r.rebounds
      cur.ast += r.assists
      cur.stl += r.steals
      cur.blk += r.blocks
      agg.set(r.playerId, cur)
    }

    const enriched = [...agg.entries()].map(([playerId, s]) => ({
      playerId,
      playerName: s.name,
      teamName: s.teamName,
      teamSlug: s.teamSlug,
      teamColor: s.teamColor,
      gamesPlayed: s.gp,
      ppg: s.gp > 0 ? s.pts / s.gp : 0,
      rpg: s.gp > 0 ? s.reb / s.gp : 0,
      apg: s.gp > 0 ? s.ast / s.gp : 0,
      spg: s.gp > 0 ? s.stl / s.gp : 0,
      bpg: s.gp > 0 ? s.blk / s.gp : 0,
    }))

    const top = (key: string) =>
      [...enriched].filter(p => p.gamesPlayed >= 1).sort((a, b) => (b as any)[key] - (a as any)[key]).slice(0, 5)
        .map(p => ({ ...p, [key]: (p as any)[key].toFixed(1) }))

    return NextResponse.json({
      scorers:    top('ppg'),
      rebounders: top('rpg'),
      assisters:  top('apg'),
      stealers:   top('spg'),
    })
  } catch (error) {
    console.error('Stats leaders error:', error)
    return NextResponse.json({ error: 'Failed to fetch leaders' }, { status: 500 })
  }
}
