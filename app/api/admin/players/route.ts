import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminAuth } from '@/lib/auth'

export async function GET(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const season = searchParams.get('season')

    if (season) {
      // Get the team IDs assigned to this season via season_teams SiteSetting
      const stSetting = await prisma.siteSetting.findUnique({ where: { key: 'season_teams' } })
      const seasonTeamsMap: Record<string, string[]> = stSetting ? JSON.parse(stSetting.value) : {}
      const seasonTeamIds = seasonTeamsMap[season] ?? []

      // 1. Players who have stats in games for this season (historical seasons)
      const statRows = await prisma.playerGameStat.findMany({
        where: { game: { season }, player: { isSub: false } },
        select: { playerId: true },
        distinct: ['playerId'],
      })
      const statPlayerIds = new Set(statRows.map(r => r.playerId))

      // 2. For new seasons (no games yet), use player.season field to find
      //    players rostered for this season. Try exact match first; if none found
      //    fall back to any player on a season team with a non-null season tag
      //    (handles legacy mismatch where player.season = "Summer 2026" but
      //    season key = "D2 Rec 2026 Summer")
      const seasonTaggedPlayers = seasonTeamIds.length > 0
        ? await prisma.player.findMany({
            where: { teamId: { in: seasonTeamIds }, isSub: false, season },
            select: { id: true },
          })
        : []
      const seasonTaggedIds = new Set(seasonTaggedPlayers.map(p => p.id))

      // Merge: stat-based (historical) + season-tagged (new seasons)
      const allPlayerIds = [...new Set([...statPlayerIds, ...seasonTaggedIds])]

      if (allPlayerIds.length === 0) return NextResponse.json([])

      const players = await prisma.player.findMany({
        where: { id: { in: allPlayerIds } },
        include: { team: true },
        orderBy: [{ team: { name: 'asc' } }, { number: 'asc' }],
      })
      return NextResponse.json(players)
    }

    const players = await prisma.player.findMany({
      include: { team: true },
      orderBy: [{ team: { name: 'asc' } }, { number: 'asc' }],
    })
    return NextResponse.json(players)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const isSub = body.isSub === true

    if (isSub) {
      let player = await prisma.player.findFirst({
        where: { name: body.name.trim(), teamId: body.teamId, isSub: true },
        include: { team: true },
      })
      if (!player) {
        player = await prisma.player.create({
          data: { name: body.name.trim(), number: 0, position: 'G', isSub: true, teamId: body.teamId },
          include: { team: true },
        })
      }
      return NextResponse.json(player, { status: 200 })
    }

    const player = await prisma.player.create({
      data: {
        name: body.name,
        number: parseInt(body.number) || 0,
        position: body.position || 'G',
        isSub: false,
        teamId: body.teamId,
        ...(body.season ? { season: body.season } : {}),
      },
      include: { team: true },
    })
    return NextResponse.json(player, { status: 201 })
  } catch (error) {
    console.error('Player POST error:', error)
    return NextResponse.json({ error: 'Failed to create player' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const { id, name, number, position, teamId, season } = body
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const player = await prisma.player.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(number !== undefined && { number: parseInt(number) || 0 }),
        ...(position !== undefined && { position }),
        ...(teamId !== undefined && { teamId }),
        ...(season !== undefined && { season }),
      },
      include: { team: true },
    })
    return NextResponse.json(player)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update player' }, { status: 500 })
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
    await prisma.playerGameStat.deleteMany({ where: { playerId: id } })
    await prisma.player.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete player' }, { status: 500 })
  }
}
