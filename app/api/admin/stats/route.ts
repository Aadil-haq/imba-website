import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const gameId = searchParams.get('gameId')
  if (!gameId) return NextResponse.json({ error: 'gameId required' }, { status: 400 })
  const stats = await prisma.playerGameStat.findMany({
    where: { gameId },
    include: { player: true, team: true },
  })
  return NextResponse.json(stats)
}

export async function POST(request: Request) {
  const body = await request.json()
  const stats = body.stats as {
    playerId: string; gameId: string; teamId: string
    points: number; rebounds: number; assists: number; steals: number; blocks: number; turnovers: number
    twoPtMade: number; twoPtAtt: number; threeMade: number; threeAtt: number; ftMade: number; ftAtt: number
  }[]

  const results = await Promise.all(
    stats.map((s) =>
      prisma.playerGameStat.upsert({
        where: { playerId_gameId: { playerId: s.playerId, gameId: s.gameId } },
        update: {
          points: s.points ?? 0,
          rebounds: s.rebounds ?? 0,
          assists: s.assists ?? 0,
          steals: s.steals ?? 0,
          blocks: s.blocks ?? 0,
          turnovers: s.turnovers ?? 0,
          twoPtMade: s.twoPtMade ?? 0,
          twoPtAtt: s.twoPtAtt ?? 0,
          threeMade: s.threeMade ?? 0,
          threeAtt: s.threeAtt ?? 0,
          ftMade: s.ftMade ?? 0,
          ftAtt: s.ftAtt ?? 0,
        },
        create: {
          playerId: s.playerId,
          gameId: s.gameId,
          teamId: s.teamId,
          points: s.points ?? 0,
          rebounds: s.rebounds ?? 0,
          assists: s.assists ?? 0,
          steals: s.steals ?? 0,
          blocks: s.blocks ?? 0,
          turnovers: s.turnovers ?? 0,
          twoPtMade: s.twoPtMade ?? 0,
          twoPtAtt: s.twoPtAtt ?? 0,
          threeMade: s.threeMade ?? 0,
          threeAtt: s.threeAtt ?? 0,
          ftMade: s.ftMade ?? 0,
          ftAtt: s.ftAtt ?? 0,
        },
      })
    )
  )

  return NextResponse.json({ saved: results.length })
}
