import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/teams/logos?season=X
// Returns { [teamId]: logoUrl | null } for all teams in the given season.
// Intentionally lightweight — only fetches id + logo, no game data.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const season = searchParams.get('season')
  if (!season) return NextResponse.json({})

  try {
    const games = await prisma.game.findMany({
      where: { season },
      select: { homeTeamId: true, awayTeamId: true },
    })

    const teamIds = [...new Set(games.flatMap(g => [g.homeTeamId, g.awayTeamId]))]
    if (teamIds.length === 0) return NextResponse.json({})

    const teams = await prisma.team.findMany({
      where: { id: { in: teamIds } },
      select: { id: true, logo: true },
    })

    const map: Record<string, string | null> = {}
    for (const t of teams) map[t.id] = t.logo ?? null

    return NextResponse.json(map, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    })
  } catch (error) {
    console.error('Team logos error:', error)
    return NextResponse.json({})
  }
}
