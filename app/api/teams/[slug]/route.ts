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
          include: {
            gameStat: {
              include: { game: { select: { season: true } } },
            },
          },
          orderBy: { number: 'asc' },
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

    // Determine which players to show for the requested season.
    // - If a season is given: show players who have stats in that season,
    //   plus players with zero stats ever (newly registered, haven't played yet),
    //   plus players who have a paid registration for this team (handles re-registrants with historical stats).
    // - If no season: show all players on the team.
    let playerIds: Set<string> | null = null
    if (season) {
      const statRows = await prisma.playerGameStat.findMany({
        where: { teamId: team.id, game: { season } },
        select: { playerId: true },
        distinct: ['playerId'],
      })
      const statIdSet = new Set(statRows.map(r => r.playerId))
      // Players with no game stats at all (registered but not yet played)
      const noStatPlayers = team.players.filter(p => p.gameStat.length === 0).map(p => p.id)
      // Players who paid and chose this team (covers re-registrants with historical stats)
      const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase()
      const paidRegs = await prisma.registration.findMany({
        where: { paymentStatus: 'paid', teamPref: team.name },
        select: { firstName: true, lastName: true },
      })
      const paidNames = new Set(paidRegs.map(r => norm(`${r.firstName} ${r.lastName}`)))
      const paidPlayerIds = team.players
        .filter(p => paidNames.has(norm(p.name)))
        .map(p => p.id)
      playerIds = new Set([...statIdSet, ...noStatPlayers, ...paidPlayerIds])
    }

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

    // Overall totals
    const wins = seasonRecords.reduce((s, r) => s + r.wins, 0)
    const losses = seasonRecords.reduce((s, r) => s + r.losses, 0)
    const pointsFor = seasonRecords.reduce((s, r) => s + r.pf, 0)
    const pointsAgainst = seasonRecords.reduce((s, r) => s + r.pa, 0)

    const playersWithStats = team.players
      .filter(player => playerIds === null || playerIds.has(player.id))
      .map((player) => {
        // Only count stats from the requested season (or all if no season filter)
        const relevantStats = season
          ? player.gameStat.filter(s => s.game.season === season)
          : player.gameStat
        const games = relevantStats.length
        const totals = relevantStats.reduce(
          (acc, stat) => ({
            points: acc.points + stat.points,
            rebounds: acc.rebounds + stat.rebounds,
            assists: acc.assists + stat.assists,
            steals: acc.steals + stat.steals,
            blocks: acc.blocks + stat.blocks,
          }),
          { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0 }
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
        }
      })

    const allGames = [
      ...team.homeGames.map(g => ({ ...g, isHome: true })),
      ...team.awayGames.map(g => ({ ...g, isHome: false })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({
      ...team,
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
