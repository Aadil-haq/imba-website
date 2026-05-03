import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Resolve the active season for a given league from SiteSettings
async function getActiveSeasonForLeague(league: string): Promise<string> {
  try {
    const [activeSetting, gameSeasonsRaw, knownSetting] = await Promise.all([
      prisma.siteSetting.findUnique({ where: { key: 'active_seasons' } }),
      prisma.game.findMany({ select: { season: true, league: true }, distinct: ['season', 'league'] }),
      prisma.siteSetting.findUnique({ where: { key: 'known_seasons' } }),
    ])

    const activeSeasons: string[] = activeSetting ? JSON.parse(activeSetting.value) : []
    const knownSeasons: Array<{ season: string; league: string }> = knownSetting ? JSON.parse(knownSetting.value) : []

    // Build season → league map
    const seasonLeagueMap: Record<string, string> = {}
    for (const g of gameSeasonsRaw) seasonLeagueMap[g.season] = g.league
    for (const k of knownSeasons) seasonLeagueMap[k.season] = k.league

    // Normalize league: "Comp League" → "Comp", "Rec League" → "Rec"
    const normalizedLeague = league.replace(' League', '')

    // Find an active season matching this league
    const match = activeSeasons.find(s => {
      const sl = seasonLeagueMap[s] ?? ''
      return sl === normalizedLeague || sl === league
    })

    return match ?? 'Summer 2026'
  } catch {
    return 'Summer 2026'
  }
}

export async function GET(request: Request) {
  const cookie = request.headers.get('cookie') || ''
  if (!cookie.includes('imba_admin=true')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const registrations = await prisma.registration.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(registrations)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body.firstName || !body.lastName || !body.email || !body.phone || !body.age || !body.position) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const season = await getActiveSeasonForLeague(body.league || 'Rec')

    const registration = await prisma.registration.create({
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        age: parseInt(body.age),
        position: body.position,
        league: body.league || 'Rec League',
        teamPref: body.teamPref || null,
        jerseyNumber: body.jerseyNumber || null,
        jerseySize: body.jerseySize || null,
        paymentMethod: 'stripe',
        paymentStatus: 'pending',
        amount: 8000,
        season,
      },
    })

    return NextResponse.json(registration, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('Registration POST error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
