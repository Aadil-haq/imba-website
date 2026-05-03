import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * GET /api/teams/by-season
 *
 * Returns all seasons in reverse-chronological order, each with their assigned
 * teams and season-specific W/L records.
 *
 * Response shape:
 * [
 *   {
 *     season: "D2 Comp 2026 Summer",
 *     league: "Comp",
 *     isActive: true,
 *     teams: [{ id, name, slug, color, wins, losses, playerCount }]
 *   },
 *   ...
 * ]
 */
export async function GET() {
  try {
    // 1. Load all settings we need in parallel
    const [stSetting, activeSetting, knownSetting, gameSeasonsRaw] = await Promise.all([
      prisma.siteSetting.findUnique({ where: { key: 'season_teams' } }),
      prisma.siteSetting.findUnique({ where: { key: 'active_seasons' } }),
      prisma.siteSetting.findUnique({ where: { key: 'known_seasons' } }),
      prisma.game.findMany({
        select: { season: true, league: true },
        distinct: ['season', 'league'],
      }),
    ])

    const seasonTeamsMap: Record<string, string[]> = stSetting ? JSON.parse(stSetting.value) : {}
    const activeSeasons: string[] = activeSetting ? JSON.parse(activeSetting.value) : []
    const knownSeasons: Array<{ season: string; league: string }> = knownSetting
      ? JSON.parse(knownSetting.value) : []

    // 2. Build season → league map
    const seasonLeagueMap: Record<string, string> = {}
    for (const g of gameSeasonsRaw) seasonLeagueMap[g.season] = g.league
    for (const k of knownSeasons) seasonLeagueMap[k.season] = k.league

    // 3. Collect all season names: from season_teams + game data + known_seasons
    const allSeasonNames = new Set<string>([
      ...Object.keys(seasonTeamsMap),
      ...gameSeasonsRaw.map(g => g.season),
      ...knownSeasons.map(k => k.season),
    ])

    // 4. For each season, get its team IDs (from season_teams if available, else
    //    derive from games played that season)
    const seasonList: Array<{
      season: string
      league: string
      isActive: boolean
      teams: Array<{ id: string; name: string; slug: string; color: string; wins: number; losses: number; playerCount: number }>
    }> = []

    for (const seasonName of allSeasonNames) {
      let teamIds: string[] = seasonTeamsMap[seasonName] ?? []

      // If no season_teams entry, derive from games
      if (teamIds.length === 0) {
        const gamesInSeason = await prisma.game.findMany({
          where: { season: seasonName },
          select: { homeTeamId: true, awayTeamId: true },
        })
        const idSet = new Set<string>()
        for (const g of gamesInSeason) {
          idSet.add(g.homeTeamId)
          idSet.add(g.awayTeamId)
        }
        teamIds = Array.from(idSet)
      }

      if (teamIds.length === 0) continue

      // 5. Fetch teams + their season-specific records
      const teams = await prisma.team.findMany({
        where: { id: { in: teamIds } },
        include: {
          homeGames: {
            where: { season: seasonName, played: true },
            select: { homeScore: true, awayScore: true },
          },
          awayGames: {
            where: { season: seasonName, played: true },
            select: { homeScore: true, awayScore: true },
          },
        },
        orderBy: { name: 'asc' },
      })

      // Player counts:
      // - Seasons with stats → count distinct players who appeared in games (accurate history)
      // - New seasons with no games yet → count current roster per team
      const statRows = await prisma.playerGameStat.findMany({
        where: { game: { season: seasonName }, teamId: { in: teamIds }, player: { isSub: false } },
        select: { playerId: true, teamId: true },
        distinct: ['playerId', 'teamId'],
      })
      const seasonPlayerCounts: Record<string, number> = {}
      if (statRows.length > 0) {
        for (const row of statRows) {
          seasonPlayerCounts[row.teamId] = (seasonPlayerCounts[row.teamId] ?? 0) + 1
        }
      } else {
        // No stats yet — use current roster size per team
        const rosterRows = await prisma.player.groupBy({
          by: ['teamId'],
          where: { teamId: { in: teamIds }, isSub: false },
          _count: { id: true },
        })
        for (const row of rosterRows) {
          seasonPlayerCounts[row.teamId] = row._count.id
        }
      }

      const teamsWithRecords = teams.map(team => {
        let wins = 0, losses = 0
        team.homeGames.forEach(g => {
          if (g.homeScore !== null && g.awayScore !== null) {
            if (g.homeScore > g.awayScore) wins++; else losses++
          }
        })
        team.awayGames.forEach(g => {
          if (g.homeScore !== null && g.awayScore !== null) {
            if (g.awayScore > g.homeScore) wins++; else losses++
          }
        })
        return {
          id: team.id,
          name: team.name,
          slug: team.slug,
          color: team.color,
          wins,
          losses,
          playerCount: seasonPlayerCounts[team.id] ?? 0,
        }
      })

      seasonList.push({
        season: seasonName,
        league: seasonLeagueMap[seasonName] ?? 'Unknown',
        isActive: activeSeasons.includes(seasonName),
        teams: teamsWithRecords,
      })
    }

    // 6. Sort: active seasons first, then by name descending (most recent first heuristic)
    seasonList.sort((a, b) => {
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
      return b.season.localeCompare(a.season)
    })

    return NextResponse.json(seasonList)
  } catch (error: any) {
    console.error('by-season error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
