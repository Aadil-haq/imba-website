import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const player = await prisma.player.findUnique({
      where: { id },
      include: { team: true },
    })

    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

    const gameStats = await prisma.playerGameStat.findMany({
      where: { playerId: id },
      include: {
        game: {
          select: {
            id: true,
            season: true,
            league: true,
            date: true,
            homeTeamId: true,
            awayTeamId: true,
            homeScore: true,
            awayScore: true,
            homeTeam: { select: { name: true, color: true, slug: true, logo: true } },
            awayTeam: { select: { name: true, color: true, slug: true, logo: true } },
            played: true,
          },
        },
        team: { select: { id: true, name: true, color: true, slug: true, logo: true } },
      },
      orderBy: { game: { date: 'desc' } },
    })

    const playedStats = gameStats.filter(s => s.game.played)

    // Season breakdown grouped by season + league + team
    const seasonMap = new Map<string, {
      season: string; league: string
      teamId: string; teamName: string; teamColor: string; teamSlug: string; teamLogo: string | null
      gamesPlayed: number
      points: number; rebounds: number; assists: number; steals: number; blocks: number; turnovers: number
      twoPtMade: number; twoPtAtt: number; threeMade: number; threeAtt: number; ftMade: number; ftAtt: number
    }>()

    const teamsMap = new Map<string, { id: string; name: string; color: string; slug: string; logo: string | null; seasons: Set<string> }>()

    for (const stat of playedStats) {
      const key = `${stat.game.season}__${stat.game.league}__${stat.teamId}`
      if (!seasonMap.has(key)) {
        seasonMap.set(key, {
          season: stat.game.season,
          league: stat.game.league,
          teamId: stat.teamId,
          teamName: stat.team.name,
          teamColor: stat.team.color,
          teamSlug: stat.team.slug,
          teamLogo: (stat.team as any).logo ?? null,
          gamesPlayed: 0,
          points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0,
          twoPtMade: 0, twoPtAtt: 0, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0,
        })
      }
      const s = seasonMap.get(key)!
      s.gamesPlayed++
      s.points += stat.points; s.rebounds += stat.rebounds; s.assists += stat.assists
      s.steals += stat.steals; s.blocks += stat.blocks; s.turnovers += stat.turnovers
      s.twoPtMade += stat.twoPtMade; s.twoPtAtt += stat.twoPtAtt
      s.threeMade += stat.threeMade; s.threeAtt += stat.threeAtt
      s.ftMade += stat.ftMade; s.ftAtt += stat.ftAtt

      if (!teamsMap.has(stat.teamId)) {
        teamsMap.set(stat.teamId, { id: stat.teamId, name: stat.team.name, color: stat.team.color, slug: stat.team.slug, logo: (stat.team as any).logo ?? null, seasons: new Set() })
      }
      teamsMap.get(stat.teamId)!.seasons.add(stat.game.season)
    }

    const seasonStats = [...seasonMap.values()]
      .sort((a, b) => b.season.localeCompare(a.season))
      .map(s => {
        const g = s.gamesPlayed
        const fgMade = s.twoPtMade + s.threeMade
        const fgAtt = s.twoPtAtt + s.threeAtt
        return {
          ...s,
          fgMade, fgAtt,
          ppg: g > 0 ? (s.points / g).toFixed(1) : '0.0',
          rpg: g > 0 ? (s.rebounds / g).toFixed(1) : '0.0',
          apg: g > 0 ? (s.assists / g).toFixed(1) : '0.0',
          spg: g > 0 ? (s.steals / g).toFixed(1) : '0.0',
          bpg: g > 0 ? (s.blocks / g).toFixed(1) : '0.0',
          fgPct: fgAtt > 0 ? (fgMade / fgAtt * 100).toFixed(1) : '—',
          twoPtPct: s.twoPtAtt > 0 ? (s.twoPtMade / s.twoPtAtt * 100).toFixed(1) : '—',
          threePct: s.threeAtt > 0 ? (s.threeMade / s.threeAtt * 100).toFixed(1) : '—',
          ftPct: s.ftAtt > 0 ? (s.ftMade / s.ftAtt * 100).toFixed(1) : '—',
        }
      })

    const teamsHistory = [...teamsMap.values()].map(t => ({
      id: t.id, name: t.name, color: t.color, slug: t.slug, logo: t.logo,
      seasons: [...t.seasons].sort((a, b) => b.localeCompare(a)),
    }))

    // Career totals
    const career = playedStats.reduce((acc, stat) => {
      acc.gamesPlayed++
      acc.points += stat.points; acc.rebounds += stat.rebounds; acc.assists += stat.assists
      acc.steals += stat.steals; acc.blocks += stat.blocks; acc.turnovers += stat.turnovers
      acc.twoPtMade += stat.twoPtMade; acc.twoPtAtt += stat.twoPtAtt
      acc.threeMade += stat.threeMade; acc.threeAtt += stat.threeAtt
      acc.ftMade += stat.ftMade; acc.ftAtt += stat.ftAtt
      return acc
    }, {
      gamesPlayed: 0, points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0,
      twoPtMade: 0, twoPtAtt: 0, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0,
    })

    const g = career.gamesPlayed
    const fgMade = career.twoPtMade + career.threeMade
    const fgAtt = career.twoPtAtt + career.threeAtt

    const careerStats = {
      ...career,
      fgMade, fgAtt,
      ppg: g > 0 ? (career.points / g).toFixed(1) : '0.0',
      rpg: g > 0 ? (career.rebounds / g).toFixed(1) : '0.0',
      apg: g > 0 ? (career.assists / g).toFixed(1) : '0.0',
      spg: g > 0 ? (career.steals / g).toFixed(1) : '0.0',
      bpg: g > 0 ? (career.blocks / g).toFixed(1) : '0.0',
      fgPct: fgAtt > 0 ? (fgMade / fgAtt * 100).toFixed(1) : '—',
      twoPtPct: career.twoPtAtt > 0 ? (career.twoPtMade / career.twoPtAtt * 100).toFixed(1) : '—',
      threePct: career.threeAtt > 0 ? (career.threeMade / career.threeAtt * 100).toFixed(1) : '—',
      ftPct: career.ftAtt > 0 ? (career.ftMade / career.ftAtt * 100).toFixed(1) : '—',
    }

    // Game log (most recent 20)
    const recentGames = playedStats.slice(0, 20).map(stat => {
      const isHome = stat.game.homeTeamId === stat.teamId
      const opp = isHome ? stat.game.awayTeam : stat.game.homeTeam
      const myScore = isHome ? stat.game.homeScore : stat.game.awayScore
      const oppScore = isHome ? stat.game.awayScore : stat.game.homeScore
      const fgM = stat.twoPtMade + stat.threeMade
      const fgA = stat.twoPtAtt + stat.threeAtt
      return {
        gameId: stat.gameId,
        date: stat.game.date,
        season: stat.game.season,
        league: stat.game.league,
        teamName: stat.team.name,
        teamColor: stat.team.color,
        teamLogo: (stat.team as any).logo ?? null,
        oppName: opp.name,
        oppColor: opp.color,
        oppLogo: (opp as any).logo ?? null,
        result: myScore !== null && oppScore !== null ? (myScore > oppScore ? 'W' : 'L') : null,
        myScore, oppScore,
        points: stat.points, rebounds: stat.rebounds, assists: stat.assists,
        steals: stat.steals, blocks: stat.blocks, turnovers: stat.turnovers,
        twoPtMade: stat.twoPtMade, twoPtAtt: stat.twoPtAtt,
        threeMade: stat.threeMade, threeAtt: stat.threeAtt,
        ftMade: stat.ftMade, ftAtt: stat.ftAtt,
        fgMade: fgM, fgAtt: fgA,
        fgPct: fgA > 0 ? (fgM / fgA * 100).toFixed(1) : '—',
      }
    })

    return NextResponse.json({
      id: player.id,
      name: player.name,
      number: player.number,
      position: player.position,
      currentTeam: { id: player.team.id, name: player.team.name, color: player.team.color, slug: player.team.slug, logo: (player.team as any).logo ?? null },
      teamsHistory,
      careerStats,
      seasonStats,
      recentGames,
    })
  } catch (error) {
    console.error('Player GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch player' }, { status: 500 })
  }
}
