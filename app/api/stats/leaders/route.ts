import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const stats = await prisma.playerGameStat.groupBy({
      by: ['playerId'],
      _sum: {
        points: true,
        rebounds: true,
        assists: true,
        steals: true,
        blocks: true,
      },
      _count: { gameId: true },
    })

    const playerIds = stats.map((s) => s.playerId)
    const players = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      include: { team: true },
    })
    const playerMap = new Map(players.map((p) => [p.id, p]))

    const enriched = stats
      .map((stat) => {
        const player = playerMap.get(stat.playerId)
        if (!player) return null
        const g = stat._count.gameId
        return {
          playerId: stat.playerId,
          playerName: player.name,
          teamName: player.team.name,
          teamSlug: player.team.slug,
          teamColor: player.team.color,
          gamesPlayed: g,
          ppg: g > 0 ? (stat._sum.points ?? 0) / g : 0,
          rpg: g > 0 ? (stat._sum.rebounds ?? 0) / g : 0,
          apg: g > 0 ? (stat._sum.assists ?? 0) / g : 0,
          spg: g > 0 ? (stat._sum.steals ?? 0) / g : 0,
          bpg: g > 0 ? (stat._sum.blocks ?? 0) / g : 0,
        }
      })
      .filter(Boolean) as any[]

    const top = (key: string) =>
      [...enriched].sort((a, b) => b[key] - a[key]).slice(0, 3).map(p => ({ ...p, [key]: p[key].toFixed(1) }))

    return NextResponse.json({
      scorers: top('ppg'),
      rebounders: top('rpg'),
      assisters: top('apg'),
      stealers: top('spg'),
    })
  } catch (error) {
    console.error('Stats leaders error:', error)
    return NextResponse.json({ error: 'Failed to fetch leaders' }, { status: 500 })
  }
}
