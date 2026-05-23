import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminAuth } from '@/lib/auth'

interface GameInput {
  homeTeamId: string
  awayTeamId: string
  date: string       // "YYYY-MM-DD"
  time: string       // "7:00 PM"
  location: string
  week: number
  season: string
  league: string
}

export async function POST(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const games: GameInput[] = body.games

    if (!Array.isArray(games) || games.length === 0) {
      return NextResponse.json({ error: 'No games provided' }, { status: 400 })
    }

    // Validate each row
    const errors: string[] = []
    const valid: GameInput[] = []

    for (let i = 0; i < games.length; i++) {
      const g = games[i]
      const rowLabel = `Row ${i + 1}`
      if (!g.homeTeamId) { errors.push(`${rowLabel}: missing home team`); continue }
      if (!g.awayTeamId) { errors.push(`${rowLabel}: missing away team`); continue }
      if (g.homeTeamId === g.awayTeamId) { errors.push(`${rowLabel}: home and away teams are the same`); continue }
      if (!g.date) { errors.push(`${rowLabel}: missing date`); continue }
      if (!g.season) { errors.push(`${rowLabel}: missing season`); continue }
      if (!g.league) { errors.push(`${rowLabel}: missing league`); continue }
      valid.push(g)
    }

    if (valid.length === 0) {
      return NextResponse.json({ error: 'No valid games to import', details: errors }, { status: 400 })
    }

    // Insert all valid games in one transaction
    const created = await prisma.$transaction(
      valid.map(g =>
        prisma.game.create({
          data: {
            homeTeamId: g.homeTeamId,
            awayTeamId: g.awayTeamId,
            date: new Date(g.date + 'T12:00:00'),
            time: g.time || '7:00 PM',
            location: g.location || 'Irving Masjid Gym',
            week: g.week || 1,
            season: g.season,
            league: g.league,
            played: false,
          },
        })
      )
    )

    return NextResponse.json({
      created: created.length,
      skipped: errors.length,
      errors,
    })
  } catch (error) {
    console.error('Bulk import error:', error)
    return NextResponse.json({ error: 'Failed to import games' }, { status: 500 })
  }
}
