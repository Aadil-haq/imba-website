import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // Group by season+league, ordered by the most recent game date so newest season always comes first
    const groups = await prisma.game.groupBy({
      by: ['season', 'league'],
      _max: { date: true },
      orderBy: { _max: { date: 'desc' } },
    })

    const seasons = groups.map(g => ({ season: g.season, league: g.league }))
    return NextResponse.json(seasons)
  } catch (error) {
    console.error('Seasons GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch seasons' }, { status: 500 })
  }
}
