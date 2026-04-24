import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const team = await prisma.team.findUnique({
      where: { slug },
      include: {
        players: {
          include: {
            gameStat: true,
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

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Calculate team record
    let wins = 0
    let losses = 0
    let pointsFor = 0
    let pointsAgainst = 0

    team.homeGames.filter(g => g.played).forEach((g) => {
      if (g.homeScore !== null && g.awayScore !== null) {
        pointsFor += g.homeScore
        pointsAgainst += g.awayScore
        if (g.homeScore > g.awayScore) wins++
        else losses++
      }
    })

    team.awayGames.filter(g => g.played).forEach((g) => {
      if (g.homeScore !== null && g.awayScore !== null) {
        pointsFor += g.awayScore
        pointsAgainst += g.homeScore
        if (g.awayScore > g.homeScore) wins++
        else losses++
      }
    })

    // Calculate player stats averages
    const playersWithStats = team.players.map((player) => {
      const games = player.gameStat.length
      const totals = player.gameStat.reduce(
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

    // Combine all games
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
      players: playersWithStats,
      games: allGames,
    })
  } catch (error) {
    console.error('Team slug GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 })
  }
}
