import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminAuth } from '@/lib/auth'

export async function GET(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
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

    // For subs: find-or-create so the same sub name doesn't create duplicates
    if (isSub) {
      let player = await prisma.player.findFirst({
        where: { name: body.name.trim(), teamId: body.teamId, isSub: true },
        include: { team: true },
      })
      if (!player) {
        player = await prisma.player.create({
          data: {
            name: body.name.trim(),
            number: 0,
            position: 'G',
            isSub: true,
            teamId: body.teamId,
          },
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
    const { id, name, number, position, teamId } = body
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const player = await prisma.player.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(number !== undefined && { number: parseInt(number) || 0 }),
        ...(position !== undefined && { position }),
        ...(teamId !== undefined && { teamId }),
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
