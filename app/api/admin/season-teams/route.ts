import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminAuth } from '@/lib/auth'

const SETTING_KEY = 'season_teams'

async function getSeasonTeamsMap(): Promise<Record<string, string[]>> {
  const setting = await prisma.siteSetting.findUnique({ where: { key: SETTING_KEY } })
  return setting ? JSON.parse(setting.value) : {}
}

async function saveSeasonTeamsMap(map: Record<string, string[]>) {
  await prisma.siteSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value: JSON.stringify(map) },
    create: { key: SETTING_KEY, value: JSON.stringify(map) },
  })
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const season = searchParams.get('season')
    if (!season) return NextResponse.json({ error: 'season required' }, { status: 400 })

    const map = await getSeasonTeamsMap()
    const activeIds: string[] = map[season] ?? []

    // Get all teams
    const allTeams = await prisma.team.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true, color: true, logo: true, league: true, active: true },
    })

    const activeTeams = allTeams.filter(t => activeIds.includes(t.id))
    const inactiveTeams = allTeams.filter(t => !activeIds.includes(t.id))

    return NextResponse.json({ active: activeTeams, inactive: inactiveTeams })
  } catch (err) {
    console.error('season-teams GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch season teams' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await request.json()
    const { season, activeTeamIds } = body
    if (!season) return NextResponse.json({ error: 'season required' }, { status: 400 })

    const map = await getSeasonTeamsMap()
    map[season] = Array.isArray(activeTeamIds) ? activeTeamIds : []
    await saveSeasonTeamsMap(map)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('season-teams POST error:', err)
    return NextResponse.json({ error: 'Failed to save season teams' }, { status: 500 })
  }
}
