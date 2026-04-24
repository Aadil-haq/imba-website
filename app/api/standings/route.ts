import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const season = searchParams.get('season') || null
    const league = searchParams.get('league') || null

    // Build game filter
    const gameWhere: Record<string, unknown> = { played: true }
    if (season) gameWhere.season = season
    if (league) gameWhere.league = league

    const teams = await prisma.team.findMany({
      where: league ? { league } : {},
      include: {
        homeGames: {
          where: gameWhere as any,
          select: { homeScore: true, awayScore: true, date: true },
          orderBy: { date: 'asc' },
        },
        awayGames: {
          where: gameWhere as any,
          select: { homeScore: true, awayScore: true, date: true },
          orderBy: { date: 'asc' },
        },
      },
    })

    const standings = teams
      .map((team) => {
        let wins = 0
        let losses = 0
        let pointsFor = 0
        let pointsAgainst = 0
        const gameResults: { result: string; date: Date }[] = []

        team.homeGames.forEach((g) => {
          if (g.homeScore !== null && g.awayScore !== null) {
            pointsFor += g.homeScore
            pointsAgainst += g.awayScore
            gameResults.push({ result: g.homeScore > g.awayScore ? 'W' : 'L', date: g.date })
            if (g.homeScore > g.awayScore) wins++
            else losses++
          }
        })

        team.awayGames.forEach((g) => {
          if (g.homeScore !== null && g.awayScore !== null) {
            pointsFor += g.awayScore
            pointsAgainst += g.homeScore
            gameResults.push({ result: g.awayScore > g.homeScore ? 'W' : 'L', date: g.date })
            if (g.awayScore > g.homeScore) wins++
            else losses++
          }
        })

        if (wins === 0 && losses === 0) return null

        // Streak from last 5
        gameResults.sort((a, b) => a.date.getTime() - b.date.getTime())
        const recent = gameResults.slice(-5).map(r => r.result)
        let streak = 0
        let streakType = ''
        if (recent.length > 0) {
          const last = recent[recent.length - 1]
          streak = 1
          for (let i = recent.length - 2; i >= 0; i--) {
            if (recent[i] === last) streak++
            else break
          }
          streakType = last
        }

        const gamesPlayed = wins + losses
        const pct = gamesPlayed > 0 ? (wins / gamesPlayed).toFixed(3) : '.000'

        return {
          teamId: team.id,
          teamName: team.name,
          teamSlug: team.slug,
          teamColor: team.color,
          league: team.league,
          wins,
          losses,
          gamesPlayed,
          pct,
          pointsFor,
          pointsAgainst,
          diff: pointsFor - pointsAgainst,
          streak: streak > 0 ? `${streakType}${streak}` : '-',
          last5: recent.join(''),
        }
      })
      .filter(Boolean)

    standings.sort((a, b) => {
      if (b!.wins !== a!.wins) return b!.wins - a!.wins
      return b!.diff - a!.diff
    })

    return NextResponse.json(standings)
  } catch (error) {
    console.error('Standings GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch standings' }, { status: 500 })
  }
}
