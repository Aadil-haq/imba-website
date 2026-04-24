import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminAuth } from '@/lib/auth'

export async function GET(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const games = await prisma.game.findMany({
      include: { homeTeam: true, awayTeam: true },
      orderBy: [{ week: 'asc' }, { date: 'asc' }],
    })
    return NextResponse.json(games)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const { id, driveUrl, ...rest } = body
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const game = await prisma.game.update({
      where: { id },
      data: {
        ...(driveUrl !== undefined && { driveUrl: driveUrl || null }),
        ...rest,
      },
    })
    return NextResponse.json(game)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update game' }, { status: 500 })
  }
}
