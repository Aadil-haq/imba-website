import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Helper: get teams assigned to any active season, optionally filtered by league
async function getSeasonActiveTeamIds(leagueFilter?: string | null): Promise<string[] | null> {
  try {
    // Get active seasons list
    const activeSetting = await prisma.siteSetting.findUnique({ where: { key: 'active_seasons' } })
    const activeSeasons: string[] = activeSetting ? JSON.parse(activeSetting.value) : []
    if (activeSeasons.length === 0) return null

    // Get season→league map from game data + known_seasons
    const gameSeasonsRaw = await prisma.game.findMany({
      select: { season: true, league: true },
      distinct: ['season', 'league'],
    })
    const knownSetting = await prisma.siteSetting.findUnique({ where: { key: 'known_seasons' } })
    const knownSeasons: Array<{ season: string; league: string }> = knownSetting
      ? JSON.parse(knownSetting.value) : []

    const allSeasonsMeta = [...gameSeasonsRaw, ...knownSeasons]
    const seasonLeagueMap: Record<string, string> = {}
    for (const s of allSeasonsMeta) seasonLeagueMap[s.season] = s.league

    // Filter active seasons by league if requested
    const relevantSeasons = activeSeasons.filter(s => {
      if (!leagueFilter) return true
      return seasonLeagueMap[s] === leagueFilter
    })
    if (relevantSeasons.length === 0) return []

    // Get team IDs from season_teams for those seasons
    const stSetting = await prisma.siteSetting.findUnique({ where: { key: 'season_teams' } })
    const seasonTeamsMap: Record<string, string[]> = stSetting ? JSON.parse(stSetting.value) : {}

    const ids = new Set<string>()
    for (const s of relevantSeasons) {
      for (const id of seasonTeamsMap[s] ?? []) ids.add(id)
    }
    return Array.from(ids)
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const season = searchParams.get('season') || null
    const league = searchParams.get('league') || null

    // forSeason=Comp|Rec|true → return teams in active seasons for that league
    const forSeason = searchParams.get('forSeason') || null

    if (forSeason) {
      const leagueFilter = forSeason === 'true' ? null : forSeason
      const teamIds = await getSeasonActiveTeamIds(leagueFilter)
      if (teamIds !== null) {
        const teams = await prisma.team.findMany({
          where: { id: { in: teamIds } },
          orderBy: { name: 'asc' },
          select: { id: true, name: true, color: true, logo: true, league: true, active: true },
        })
        return NextResponse.json(teams)
      }
      // Fall through to normal query if season_teams not configured
    }

    const gameWhere: Record<string, unknown> = { played: true }
    if (season) gameWhere.season = season
    if (league) gameWhere.league = league

    const activeOnly = searchParams.get('active') === 'true'
    const teamWhere: Record<string, unknown> = {}
    if (league) teamWhere.league = league
    if (activeOnly) teamWhere.active = true

    const teams = await prisma.team.findMany({
      where: teamWhere,
      include: {
        players: true,
        homeGames: { where: gameWhere as any },
        awayGames: { where: gameWhere as any },
      },
      orderBy: { name: 'asc' },
    })

    const teamsWithRecords = teams.map((team) => {
      let wins = 0
      let losses = 0
      let pointsFor = 0
      let pointsAgainst = 0

      team.homeGames.forEach((g) => {
        if (g.homeScore !== null && g.awayScore !== null) {
          pointsFor += g.homeScore
          pointsAgainst += g.awayScore
          if (g.homeScore > g.awayScore) wins++
          else losses++
        }
      })

      team.awayGames.forEach((g) => {
        if (g.homeScore !== null && g.awayScore !== null) {
          pointsFor += g.awayScore
          pointsAgainst += g.homeScore
          if (g.awayScore > g.homeScore) wins++
          else losses++
        }
      })

      return {
        id: team.id,
        name: team.name,
        slug: team.slug,
        color: team.color,
        logo: team.logo ?? null,
        league: team.league,
        active: team.active,
        playerCount: team.players.length,
        wins,
        losses,
        pointsFor,
        pointsAgainst,
      }
    })

    return NextResponse.json(teamsWithRecords)
  } catch (error) {
    console.error('Teams GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const data: Record<string, unknown> = {}
    if (body.active !== undefined) data.active = body.active
    if (body.league !== undefined) data.league = body.league
    if (body.name !== undefined) data.name = body.name
    if (body.color !== undefined) data.color = body.color
    if (body.logo !== undefined) data.logo = body.logo
    const team = await prisma.team.update({
      where: { id: body.id },
      data,
    })
    return NextResponse.json(team)
  } catch (error) {
    console.error('Teams PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update team' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const team = await prisma.team.create({
      data: {
        name: body.name,
        slug: body.slug || body.name.toLowerCase().replace(/\s+/g, '-'),
        color: body.color || '#4A9FE3',
      },
    })
    return NextResponse.json(team, { status: 201 })
  } catch (error) {
    console.error('Teams POST error:', error)
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 })
  }
}
