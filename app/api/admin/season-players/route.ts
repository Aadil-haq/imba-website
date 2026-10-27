import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminAuth } from '@/lib/auth'

/**
 * GET /api/admin/season-players?season=X&teamId=Y
 *
 * Returns non-sub players who played for team Y in season X.
 * Strategy:
 *  1. Look for players who have a PlayerGameStat record with teamId=Y
 *     for any game whose season=X (i.e., they actually played that season).
 *  2. If none found (brand-new season, no stats yet), fall back to the
 *     team's current roster so the admin can still enter the first game's stats.
 */
export async function GET(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const season = searchParams.get('season')
  const teamId = searchParams.get('teamId')

  if (!season || !teamId) {
    return NextResponse.json({ error: 'season and teamId are required' }, { status: 400 })
  }

  try {
    // Primary: return only players currently on the season roster
    const rosterPlayers = await prisma.player.findMany({
      where: { teamId, isSub: false, season },
      include: { team: true },
      orderBy: { number: 'asc' },
    })

    if (rosterPlayers.length > 0) {
      return NextResponse.json({ players: rosterPlayers, source: 'roster' })
    }

    // Fallback: brand-new season with no season tags yet — use stat-based lookup
    const statRows = await prisma.playerGameStat.findMany({
      where: { teamId, game: { season }, player: { isSub: false } },
      select: { playerId: true },
      distinct: ['playerId'],
    })

    if (statRows.length > 0) {
      const statPlayers = await prisma.player.findMany({
        where: { id: { in: statRows.map(r => r.playerId) }, isSub: false },
        include: { team: true },
        orderBy: { number: 'asc' },
      })
      return NextResponse.json({ players: statPlayers, source: 'stats' })
    }

    return NextResponse.json({ players: [], source: 'empty' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
