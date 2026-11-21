import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/db'
import { checkAdminAuth } from '@/lib/auth'
import { EVENT_TYPES, CLOCK_TYPES, maxOnCourt, getGameEvents, replayEvents, syncGameFromEvents, ensureGameEventTable } from '@/lib/liveStats'

type Params = { params: Promise<{ id: string }> }

const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

// Season roster for a team, falling back to the team's full non-sub roster.
async function rosterFor(teamId: string, season: string) {
  const seasonPlayers = await prisma.player.findMany({ where: { teamId, isSub: false, season }, orderBy: { number: 'asc' } })
  if (seasonPlayers.length) return seasonPlayers
  return prisma.player.findMany({ where: { teamId, isSub: false }, orderBy: { number: 'asc' } })
}

async function liveState(gameId: string) {
  const game = await prisma.game.findUnique({ where: { id: gameId }, include: { homeTeam: true, awayTeam: true } })
  if (!game) return null
  const events = await getGameEvents(gameId)
  const [homeRoster, awayRoster] = await Promise.all([
    rosterFor(game.homeTeamId, game.season),
    rosterFor(game.awayTeamId, game.season),
  ])

  // Anyone (including subs) who has events in this game but isn't on the roster
  const known = new Set([...homeRoster, ...awayRoster].map(p => p.id))
  const extraIds = [...new Set(events.map(e => e.playerId).filter((id): id is string => !!id && !known.has(id)))]
  const extras = extraIds.length ? await prisma.player.findMany({ where: { id: { in: extraIds } } }) : []

  const manualStatCount = events.length ? 0 : await prisma.playerGameStat.count({ where: { gameId } })

  return {
    game,
    players: {
      [game.homeTeamId]: [...homeRoster, ...extras.filter(p => p.teamId === game.homeTeamId)],
      [game.awayTeamId]: [...awayRoster, ...extras.filter(p => p.teamId === game.awayTeamId)],
    },
    events,
    live: replayEvents(events, game.homeTeamId, game.awayTeamId),
    hasManualStats: manualStatCount > 0,
    serverNow: Date.now(),  // lets the scorer correct for its own clock drift
  }
}

export async function GET(request: Request, { params }: Params) {
  if (!checkAdminAuth(request)) return unauthorized()
  const { id } = await params
  const state = await liveState(id)
  if (!state) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(state)
}

// POST { events: [{ teamId, playerId?, type, period }] } — logged as one batch
// so a substitution (OUT + IN) undoes as a single action.
export async function POST(request: Request, { params }: Params) {
  if (!checkAdminAuth(request)) return unauthorized()
  const { id } = await params
  try {
    const game = await prisma.game.findUnique({ where: { id } })
    if (!game) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await request.json()
    const incoming = Array.isArray(body.events) ? body.events : []
    const valid = incoming.filter((e: any) =>
      EVENT_TYPES.includes(e.type) &&
      (e.teamId === game.homeTeamId || e.teamId === game.awayTeamId) &&
      (e.type === 'PERIOD' || e.type === 'TIMEOUT' || CLOCK_TYPES.includes(e.type) || typeof e.playerId === 'string')
    )
    if (!valid.length) return NextResponse.json({ error: 'No valid events' }, { status: 400 })

    await ensureGameEventTable()
    const batchId = randomUUID()
    const now = Date.now()

    // Never allow more than a full lineup on the floor (4 for 35+, 5 otherwise)
    const existing = await getGameEvents(id)
    const preview = replayEvents([
      ...existing,
      ...valid.map((e: any, i: number) => ({ ...e, id: `new-${i}`, gameId: id, batchId, createdAt: new Date(now + i), playerId: e.playerId ?? null })),
    ], game.homeTeamId, game.awayTeamId, now)
    for (const onCourt of Object.values(preview.onCourt)) {
      if (onCourt.length > maxOnCourt(game.league)) {
        return NextResponse.json({ error: `That would put ${onCourt.length} players on the floor for one team. Sub someone out first.` }, { status: 409 })
      }
    }
    await prisma.gameEvent.createMany({
      data: valid.map((e: any, i: number) => ({
        gameId: id, teamId: e.teamId, playerId: e.playerId ?? null, type: e.type,
        period: Math.max(1, parseInt(e.period) || 1), batchId,
        value: Number.isFinite(e.value) ? Math.round(e.value) : null,
        createdAt: new Date(now + i), // keeps batch order stable
      })),
    })

    await syncGameFromEvents(id)
    return NextResponse.json({ batchId, ...(await liveState(id)) })
  } catch (e: any) {
    console.error('Live event POST error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE ?batchId=… — undo one action
export async function DELETE(request: Request, { params }: Params) {
  if (!checkAdminAuth(request)) return unauthorized()
  const { id } = await params
  const batchId = new URL(request.url).searchParams.get('batchId')
  if (!batchId) return NextResponse.json({ error: 'batchId required' }, { status: 400 })
  try {
    await ensureGameEventTable()
    const removed = await prisma.gameEvent.findMany({ where: { gameId: id, batchId } })
    await prisma.gameEvent.deleteMany({ where: { gameId: id, batchId } })
    await syncGameFromEvents(id, removed.map(e => e.playerId).filter((p): p is string => !!p))
    return NextResponse.json(await liveState(id))
  } catch (e: any) {
    console.error('Live event DELETE error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PATCH { action: 'final' | 'reopen' }
export async function PATCH(request: Request, { params }: Params) {
  if (!checkAdminAuth(request)) return unauthorized()
  const { id } = await params
  try {
    const { action } = await request.json()
    if (action === 'final') {
      // Stop the clock so minutes freeze at the final buzzer
      const game = await prisma.game.findUnique({ where: { id } })
      const events = await getGameEvents(id)
      if (game && replayEvents(events, game.homeTeamId, game.awayTeamId).clock.running) {
        await prisma.gameEvent.create({ data: { gameId: id, teamId: game.homeTeamId, type: 'CLOCK_STOP', period: events[events.length - 1]?.period ?? 1, batchId: randomUUID() } })
      }
      await syncGameFromEvents(id)
      await prisma.game.update({ where: { id }, data: { played: true } })
    } else if (action === 'reopen') {
      await prisma.game.update({ where: { id }, data: { played: false } })
    } else {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
    return NextResponse.json(await liveState(id))
  } catch (e: any) {
    console.error('Live PATCH error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
