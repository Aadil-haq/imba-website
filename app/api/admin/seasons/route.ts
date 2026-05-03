import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // Seasons from actual games
    const games = await prisma.game.findMany({
      select: { season: true, league: true },
      distinct: ['season', 'league'],
      orderBy: { season: 'desc' },
    })

    // Extra seasons stored manually (not yet in games table)
    const knownSetting = await prisma.siteSetting.findUnique({ where: { key: 'known_seasons' } })
    const knownSeasons: Array<{ season: string; league: string }> = knownSetting
      ? JSON.parse(knownSetting.value)
      : []

    // Merge, deduplicating by season+league
    const seen = new Set(games.map(g => `${g.season}::${g.league}`))
    const extras = knownSeasons.filter(k => !seen.has(`${k.season}::${k.league}`))
    const allSeasons = [...games, ...extras].sort((a, b) => b.season.localeCompare(a.season))

    const setting = await prisma.siteSetting.findUnique({ where: { key: 'active_seasons' } })
    const active: string[] = setting ? JSON.parse(setting.value) : []

    return NextResponse.json(
      allSeasons.map(g => ({ season: g.season, league: g.league, active: active.includes(g.season) }))
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

// DELETE: Remove a season from known_seasons (and from games if no game data exists)
export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const { season, league } = body
    if (!season?.trim() || !league?.trim()) {
      return NextResponse.json({ error: 'season and league are required' }, { status: 400 })
    }

    // Remove from known_seasons
    const knownSetting = await prisma.siteSetting.findUnique({ where: { key: 'known_seasons' } })
    const known: Array<{ season: string; league: string }> = knownSetting
      ? JSON.parse(knownSetting.value)
      : []
    const filtered = known.filter(k => !(k.season === season.trim() && k.league === league.trim()))
    await prisma.siteSetting.upsert({
      where: { key: 'known_seasons' },
      update: { value: JSON.stringify(filtered) },
      create: { key: 'known_seasons', value: JSON.stringify(filtered) },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Seasons DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete season' }, { status: 500 })
  }
}

// PUT: Register a new season name (before any games exist for it)
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { season, league } = body
    if (!season?.trim() || !league?.trim()) {
      return NextResponse.json({ error: 'season and league are required' }, { status: 400 })
    }

    const knownSetting = await prisma.siteSetting.findUnique({ where: { key: 'known_seasons' } })
    const known: Array<{ season: string; league: string }> = knownSetting
      ? JSON.parse(knownSetting.value)
      : []

    // Avoid duplicates
    const exists = known.some(k => k.season === season.trim() && k.league === league.trim())
    if (!exists) {
      known.push({ season: season.trim(), league: league.trim() })
    }

    await prisma.siteSetting.upsert({
      where: { key: 'known_seasons' },
      update: { value: JSON.stringify(known) },
      create: { key: 'known_seasons', value: JSON.stringify(known) },
    })

    return NextResponse.json({ ok: true, season: season.trim(), league: league.trim() })
  } catch (err) {
    console.error('Seasons PUT error:', err)
    return NextResponse.json({ error: 'Failed to create season' }, { status: 500 })
  }
}
