import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const games = await prisma.game.findMany({
      select: { season: true, league: true },
      distinct: ['season', 'league'],
      orderBy: { season: 'desc' },
    })

    const setting = await prisma.siteSetting.findUnique({ where: { key: 'active_seasons' } })
    const active: string[] = setting ? JSON.parse(setting.value) : []

    return NextResponse.json(
      games.map(g => ({ season: g.season, league: g.league, active: active.includes(g.season) }))
    )
  } catch (err) {
    console.error('Seasons GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch seasons' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const activeSeasons: string[] = body.activeSeasons ?? []

    await prisma.siteSetting.upsert({
      where: { key: 'active_seasons' },
      update: { value: JSON.stringify(activeSeasons) },
      create: { key: 'active_seasons', value: JSON.stringify(activeSeasons) },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Seasons POST error:', err)
    return NextResponse.json({ error: 'Failed to update seasons' }, { status: 500 })
  }
}
