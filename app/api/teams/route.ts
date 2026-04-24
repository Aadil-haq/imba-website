import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const season = searchParams.get('season') || null
    const league = searchParams.get('league') || null

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
        league: team.league,
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
    const team = await prisma.team.update({
      where: { id: body.id },
      data: { active: body.active },
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
