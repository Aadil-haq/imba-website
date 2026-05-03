import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminAuth } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const season = searchParams.get('season') || null
    const league = searchParams.get('league') || null

    const where: Record<string, unknown> = {}
    if (season) where.season = season
    if (league) where.league = league

    const games = await prisma.game.findMany({
      where,
      include: {
        homeTeam: true,
        awayTeam: true,
      },
      orderBy: [{ date: 'asc' }, { week: 'asc' }],
    })
    return NextResponse.json(games)
  } catch (error) {
    console.error('Games GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const game = await prisma.game.create({
      data: {
        homeTeamId: body.homeTeamId,
        awayTeamId: body.awayTeamId,
        date: new Date(body.date),
        time: body.time || '7:00 PM',
        location: body.location || 'Irving Masjid Gym',
        week: parseInt(body.week, 10) || 1,
        season: body.season || 'Spring 2025',
        league: body.league || 'Rec League',
        played: body.played ?? false,
      },
      include: { homeTeam: true, awayTeam: true },
    })
    return NextResponse.json(game, { status: 201 })
  } catch (error) {
    console.error('Games POST error:', error)
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 })
  }
}
