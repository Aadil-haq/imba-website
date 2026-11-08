import { NextResponse } from 'next/server'
import { getLiveGames } from '@/lib/liveStats'

export const dynamic = 'force-dynamic'

// GET /api/games/live — games in progress right now, with score and clock
export async function GET() {
  try {
    const games = await getLiveGames()
    return NextResponse.json(games, {
      headers: { 'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=10' },
    })
  } catch (error) {
    console.error('Live games GET error:', error)
    return NextResponse.json([], { status: 200 })
  }
}
