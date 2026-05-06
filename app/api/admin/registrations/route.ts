import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminAuth } from '@/lib/auth'

// Shared auto-roster logic — called from webhook and admin
export async function addPlayerFromRegistration(reg: {
  firstName: string; lastName: string; teamPref: string | null
  jerseyNumber: string | null; position: string; season: string; league?: string
}): Promise<{ ok: boolean; msg: string }> {
  if (!reg.teamPref?.trim()) return { ok: false, msg: 'No team preference' }

  const stSetting = await prisma.siteSetting.findUnique({ where: { key: 'season_teams' } })
  const seasonTeamsMap: Record<string, string[]> = stSetting ? JSON.parse(stSetting.value) : {}
  const activeSeasonSetting = await prisma.siteSetting.findUnique({ where: { key: 'active_seasons' } })
  const activeSeasons: string[] = activeSeasonSetting ? JSON.parse(activeSeasonSetting.value) : []
  const activeTeamIds = new Set(activeSeasons.flatMap(s => seasonTeamsMap[s] ?? []))

  let allMatching = await prisma.team.findMany({ where: { name: reg.teamPref.trim() } })

  // Auto-create team if it doesn't exist yet
  if (allMatching.length === 0) {
    const slug = reg.teamPref.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now()
    const league = reg.league?.includes('Comp') ? 'Comp' : 'Rec'
    const newTeam = await prisma.team.create({
      data: { name: reg.teamPref.trim(), slug, color: '#4A9FE3', league },
    })
    allMatching = [newTeam]
  }

  const team = allMatching.find(t => activeTeamIds.has(t.id)) ?? allMatching[allMatching.length - 1]
  const fullName = `${reg.firstName.trim()} ${reg.lastName.trim()}`

  // Resolve the actual league season name (e.g. "D2 Rec 2026 Summer") from season_teams
  // rather than using the registration's generic season field (e.g. "Summer 2026")
  const leagueSeason = activeSeasons.find(s => (seasonTeamsMap[s] ?? []).includes(team.id)) ?? reg.season

  // Check if already rostered on this team (any season) — prevents duplicates
  const exists = await prisma.player.findFirst({
    where: { name: fullName, teamId: team.id },
  })
  if (exists) {
    // Update season to correct value if needed
    if (exists.season !== leagueSeason) {
      await prisma.player.update({ where: { id: exists.id }, data: { season: leagueSeason } })
    }
    return { ok: true, msg: `Already rostered: ${fullName}` }
  }

  await prisma.player.create({
    data: {
      name: fullName,
      number: parseInt(reg.jerseyNumber || '0') || 0,
      position: reg.position || 'G',
      isSub: false,
      teamId: team.id,
      season: leagueSeason,
    },
  })
  return { ok: true, msg: `Rostered: ${fullName} → ${team.name} [${leagueSeason}]` }
}

export async function GET(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const registrations = await prisma.registration.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json(registrations)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const reg = await prisma.registration.update({
      where: { id: body.id },
      data: { paymentStatus: body.paymentStatus },
    })

    // Auto-roster when marking paid
    if (body.paymentStatus === 'paid') {
      try { await addPlayerFromRegistration(reg) } catch (e) { console.error('Auto-roster on mark-paid failed:', e) }
    }

    // Remove player from roster when marking refunded
    if (body.paymentStatus === 'refunded' && reg.teamPref) {
      try {
        const fullName = `${reg.firstName.trim()} ${reg.lastName.trim()}`
        // Find the team by teamPref name
        const team = await prisma.team.findFirst({ where: { name: reg.teamPref.trim() } })
        if (team) {
          const player = await prisma.player.findFirst({
            where: { name: fullName, teamId: team.id },
          })
          if (player) {
            await prisma.playerGameStat.deleteMany({ where: { playerId: player.id } })
            await prisma.player.delete({ where: { id: player.id } })
          }
        }
      } catch (e) { console.error('Remove player on refund failed:', e) }
    }

    return NextResponse.json(reg)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update registration' }, { status: 500 })
  }
}

// PUT — batch re-roster all paid registrations (creates missing teams automatically)
export async function PUT(request: Request) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const paid = await prisma.registration.findMany({ where: { paymentStatus: 'paid' } })
    const results: string[] = []
    for (const reg of paid) {
      try {
        const r = await addPlayerFromRegistration(reg)
        results.push(`${reg.firstName} ${reg.lastName}: ${r.msg}`)
      } catch (e: any) {
        results.push(`${reg.firstName} ${reg.lastName}: ERROR — ${e.message}`)
      }
    }
    return NextResponse.json({ ok: true, total: paid.length, results })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    await prisma.registration.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete registration' }, { status: 500 })
  }
}
