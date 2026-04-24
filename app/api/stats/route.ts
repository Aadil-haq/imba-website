import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || 'points'
    const limit = parseInt(searchParams.get('limit') || '10')
    const season = searchParams.get('season') || null   // e.g. "D1 2025-26 Winter"
    const league = searchParams.get('league') || null   // e.g. "Comp", "Rec", "35+"
    const minGames = parseInt(searchParams.get('minGames') || '4')  // must have played 4+ games

    // Build game filter
    const gameWhere: Record<string, unknown> = { played: true }
    if (season) gameWhere.season = season
    if (league) gameWhere.league = league

    // Find all matching game IDs first
    const matchingGames = await prisma.game.findMany({
      where: gameWhere,
      select: { id: true },
    })
    const gameIds = matchingGames.map(g => g.id)

    const statWhere = gameIds.length > 0 ? { gameId: { in: gameIds } } : {}

    const stats = await prisma.playerGameStat.groupBy({
      by: ['playerId'],
      where: statWhere,
      _sum: {
        points: true, rebounds: true, assists: true, steals: true, blocks: true, turnovers: true,
        twoPtMade: true, twoPtAtt: true, threeMade: true, threeAtt: true, ftMade: true, ftAtt: true,
      },
      _count: { gameId: true },
    })

    const playerIds = stats.map((s) => s.playerId)
    // Exclude sub players from all leaderboards
    const players = await prisma.player.findMany({
      where: { id: { in: playerIds }, isSub: false },
      include: { team: true },
    })
    const playerMap = new Map(players.map((p) => [p.id, p]))

    const leaders = stats
      .filter(stat => stat._count.gameId >= minGames)
      .map((stat) => {
        const player = playerMap.get(stat.playerId)
        if (!player) return null
        const g = stat._count.gameId

        const twoPtMade = stat._sum.twoPtMade ?? 0
        const twoPtAtt = stat._sum.twoPtAtt ?? 0
        const threeMade = stat._sum.threeMade ?? 0
        const threeAtt = stat._sum.threeAtt ?? 0
        const ftMade = stat._sum.ftMade ?? 0
        const ftAtt = stat._sum.ftAtt ?? 0
        const fgMade = twoPtMade + threeMade
        const fgAtt = twoPtAtt + threeAtt

        return {
          playerId: stat.playerId,
          playerName: player.name,
          playerNumber: player.number,
          teamName: player.team.name,
          teamSlug: player.team.slug,
          teamColor: player.team.color,
          gamesPlayed: g,
          totalPoints: stat._sum.points ?? 0,
          totalRebounds: stat._sum.rebounds ?? 0,
          totalAssists: stat._sum.assists ?? 0,
          totalSteals: stat._sum.steals ?? 0,
          totalBlocks: stat._sum.blocks ?? 0,
          twoPtMade, twoPtAtt, threeMade, threeAtt, ftMade, ftAtt, fgMade, fgAtt,
          ppg: g > 0 ? ((stat._sum.points ?? 0) / g).toFixed(1) : '0.0',
          rpg: g > 0 ? ((stat._sum.rebounds ?? 0) / g).toFixed(1) : '0.0',
          apg: g > 0 ? ((stat._sum.assists ?? 0) / g).toFixed(1) : '0.0',
          spg: g > 0 ? ((stat._sum.steals ?? 0) / g).toFixed(1) : '0.0',
          bpg: g > 0 ? ((stat._sum.blocks ?? 0) / g).toFixed(1) : '0.0',
          fgPct: fgAtt > 0 ? (fgMade / fgAtt * 100).toFixed(1) : '—',
          twoPtPct: twoPtAtt > 0 ? (twoPtMade / twoPtAtt * 100).toFixed(1) : '—',
          threePct: threeAtt > 0 ? (threeMade / threeAtt * 100).toFixed(1) : '—',
          ftPct: ftAtt > 0 ? (ftMade / ftAtt * 100).toFixed(1) : '—',
        }
      }).filter(Boolean)

    const sortKey: Record<string, string> = {
      points: 'ppg', rebounds: 'rpg', assists: 'apg', steals: 'spg', blocks: 'bpg',
    }
    const key = sortKey[category] || 'ppg'
    leaders.sort((a, b) => parseFloat((b as any)[key]) - parseFloat((a as any)[key]))

    return NextResponse.json(leaders.slice(0, limit))
  } catch (error) {
    console.error('Stats GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
