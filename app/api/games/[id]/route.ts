import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminAuth } from '@/lib/auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await request.json()

    const game = await prisma.game.update({
      where: { id },
      data: {
        homeScore: body.homeScore !== undefined ? Number(body.homeScore) : undefined,
        awayScore: body.awayScore !== undefined ? Number(body.awayScore) : undefined,
        played: body.played !== undefined ? body.played : undefined,
        date: body.date ? new Date(body.date) : undefined,
        time: body.time || undefined,
        location: body.location || undefined,
        week: body.week !== undefined ? Number(body.week) : undefined,
      },
      include: { homeTeam: true, awayTeam: true },
    })
    return NextResponse.json(game)
  } catch (error) {
    console.error('Game PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update game' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    await prisma.playerGameStat.deleteMany({ where: { gameId: id } })
    await prisma.game.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Game DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete game' }, { status: 500 })
  }
}
