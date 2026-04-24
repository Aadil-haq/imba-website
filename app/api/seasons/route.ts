import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // Get all distinct season + league combos that have games
    const games = await prisma.game.findMany({
      select: { season: true, league: true },
      distinct: ['season', 'league'],
      orderBy: { season: 'desc' },
    })

    const seasons = games.map(g => ({ season: g.season, league: g.league }))
    return NextResponse.json(seasons)
  } catch (error) {
    console.error('Seasons GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch seasons' }, { status: 500 })
  }
}
