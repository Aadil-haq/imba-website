import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const { searchParams } = new URL(request.url)
    const season = searchParams.get('season') || null

    const team = await prisma.team.findUnique({
      where: { slug },
      include: {
        players: {
          select: { id: true, season: true },
        },
        homeGames: {
          include: { awayTeam: true, homeTeam: true },
          orderBy: { date: 'desc' },
        },
        awayGames: {
          include: { homeTeam: true, awayTeam: true },
          orderBy: { date: 'desc' },
        },
      },
    })

    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

    // Per-season records
    const seasonMap: Record<string, { season: string; league: string; wins: number; losses: number; pf: number; pa: number }> = {}
    const key = (g: { season: string; league: string }) => `${g.season}__${g.league}`

    const ensure = (g: { season: string; league: string }) => {
      const k = key(g)
      if (!seasonMap[k]) seasonMap[k] = { season: g.season, league: g.league, wins: 0, losses: 0, pf: 0, pa: 0 }
      return seasonMap[k]
    }

    team.homeGames.filter(g => g.played).forEach(g => {
      if (g.homeScore !== null && g.awayScore !== null) {
        const s = ensure(g)
        s.pf += g.homeScore; s.pa += g.awayScore
        if (g.homeScore > g.awayScore) s.wins++; else s.losses++
      }
    })

    team.awayGames.filter(g => g.played).forEach(g => {
      if (g.homeScore !== null && g.awayScore !== null) {
        const s = ensure(g)
        s.pf += g.awayScore; s.pa += g.homeScore
        if (g.awayScore > g.homeScore) s.wins++; else s.losses++
      }
    })

    const seasonRecords = Object.values(seasonMap)
      .filter(s => s.wins + s.losses > 0)
      .sort((a, b) => b.season.localeCompare(a.season))

    const wins = seasonRecords.reduce((s, r) => s + r.wins, 0)
    const losses = seasonRecords.reduce((s, r) => s + r.losses, 0)
    const pointsFor = seasonRecords.reduce((s, r) => s + r.pf, 0)
    const pointsAgainst = seasonRecords.reduce((s, r) => s + r.pa, 0)

    // Build the player list for the requested season.
    // When a season is given we fetch by PlayerGameStat.teamId so that players
    // who later moved to another team still appear on their historical roster.
    let playersWithStats

    if (season) {
      // All player IDs who have stats for this team in this season
      const statRows = await prisma.playerGameStat.findMany({
        where: { teamId: team.id, game: { season } },
        select: { playerId: true },
        distinct: ['playerId'],
      })
      const statPlayerIds = new Set(statRows.map(r => r.playerId))

      // Also include players currently tagged with this season who haven't played yet
      const seasonTaggedIds = team.players
        .filter(p => p.season === season && !statPlayerIds.has(p.id))
        .map(p => p.id)

      const allPlayerIds = [...statPlayerIds, ...seasonTaggedIds]

      // Fetch full player records regardless of current teamId
      const players = await prisma.player.findMany({
        where: { id: { in: allPlayerIds } },
        include: {
          gameStat: {
            where: { teamId: team.id, game: { season } },
          },
        },
        orderBy: { number: 'asc' },
      })

      playersWithStats = players.map(player => {
        const stats = player.gameStat
        const games = stats.length
        const totals = stats.reduce(
          (acc, stat) => ({
            points: acc.points + stat.points,
            rebounds: acc.rebounds + stat.rebounds,
            assists: acc.assists + stat.assists,
            steals: acc.steals + stat.steals,
            blocks: acc.blocks + stat.blocks,
            twoPtMade: acc.twoPtMade + stat.twoPtMade,
            twoPtAtt: acc.twoPtAtt + stat.twoPtAtt,
            threeMade: acc.threeMade + stat.threeMade,
            threeAtt: acc.threeAtt + stat.threeAtt,
            ftMade: acc.ftMade + stat.ftMade,
            ftAtt: acc.ftAtt + stat.ftAtt,
          }),
          { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, twoPtMade: 0, twoPtAtt: 0, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0 }
        )
        return {
          id: player.id,
          name: player.name,
          number: player.number,
          position: player.position,
          gamesPlayed: games,
          ppg: games > 0 ? (totals.points / games).toFixed(1) : '0.0',
          rpg: games > 0 ? (totals.rebounds / games).toFixed(1) : '0.0',
          apg: games > 0 ? (totals.assists / games).toFixed(1) : '0.0',
          spg: games > 0 ? (totals.steals / games).toFixed(1) : '0.0',
          bpg: games > 0 ? (totals.blocks / games).toFixed(1) : '0.0',
          twoPtMade: totals.twoPtMade,
          twoPtAtt: totals.twoPtAtt,
          twoPtPct: totals.twoPtAtt > 0 ? ((totals.twoPtMade / totals.twoPtAtt) * 100).toFixed(1) : '-',
          threeMade: totals.threeMade,
          threeAtt: totals.threeAtt,
          threePct: totals.threeAtt > 0 ? ((totals.threeMade / totals.threeAtt) * 100).toFixed(1) : '-',
          ftMade: totals.ftMade,
          ftAtt: totals.ftAtt,
          ftPct: totals.ftAtt > 0 ? ((totals.ftMade / totals.ftAtt) * 100).toFixed(1) : '-',
          totalPoints: totals.points,
        }
      })
    } else {
      // No season filter — show all current team members with career stats on this team
      const players = await prisma.player.findMany({
        where: { teamId: team.id },
        include: {
          gameStat: {
            where: { teamId: team.id },
          },
        },
        orderBy: { number: 'asc' },
      })

      playersWithStats = players.map(player => {
        const stats = player.gameStat
        const games = stats.length
        const totals = stats.reduce(
          (acc, stat) => ({
            points: acc.points + stat.points,
            rebounds: acc.rebounds + stat.rebounds,
            assists: acc.assists + stat.assists,
            steals: acc.steals + stat.steals,
            blocks: acc.blocks + stat.blocks,
            twoPtMade: acc.twoPtMade + stat.twoPtMade,
            twoPtAtt: acc.twoPtAtt + stat.twoPtAtt,
            threeMade: acc.threeMade + stat.threeMade,
            threeAtt: acc.threeAtt + stat.threeAtt,
            ftMade: acc.ftMade + stat.ftMade,
            ftAtt: acc.ftAtt + stat.ftAtt,
          }),
          { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, twoPtMade: 0, twoPtAtt: 0, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0 }
        )
        return {
          id: player.id,
          name: player.name,
          number: player.number,
          position: player.position,
          gamesPlayed: games,
          ppg: games > 0 ? (totals.points / games).toFixed(1) : '0.0',
          rpg: games > 0 ? (totals.rebounds / games).toFixed(1) : '0.0',
          apg: games > 0 ? (totals.assists / games).toFixed(1) : '0.0',
          spg: games > 0 ? (totals.steals / games).toFixed(1) : '0.0',
          bpg: games > 0 ? (totals.blocks / games).toFixed(1) : '0.0',
          twoPtMade: totals.twoPtMade,
          twoPtAtt: totals.twoPtAtt,
          twoPtPct: totals.twoPtAtt > 0 ? ((totals.twoPtMade / totals.twoPtAtt) * 100).toFixed(1) : '-',
          threeMade: totals.threeMade,
          threeAtt: totals.threeAtt,
          threePct: totals.threeAtt > 0 ? ((totals.threeMade / totals.threeAtt) * 100).toFixed(1) : '-',
          ftMade: totals.ftMade,
          ftAtt: totals.ftAtt,
          ftPct: totals.ftAtt > 0 ? ((totals.ftMade / totals.ftAtt) * 100).toFixed(1) : '-',
          totalPoints: totals.points,
        }
      })
    }

    const allGames = [
      ...team.homeGames.map(g => ({ ...g, isHome: true })),
      ...team.awayGames.map(g => ({ ...g, isHome: false })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({
      id: team.id,
      name: team.name,
      slug: team.slug,
      color: team.color,
      logo: team.logo,
      wins,
      losses,
      pointsFor,
      pointsAgainst,
      seasonRecords,
      players: playersWithStats,
      games: allGames,
    })
  } catch (error) {
    console.error('Team slug GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 })
  }
}
