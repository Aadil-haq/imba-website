import { prisma } from '@/lib/db'
import { replayEvents, emptyLine, fmtClock } from '@/lib/liveStatsShared'

export * from '@/lib/liveStatsShared'

// ── Table bootstrap ───────────────────────────────────────────────────────────
// Prod (Turso) has no migration pipeline, so create the table on first use.
let tableReady: Promise<void> | null = null
export function ensureGameEventTable() {
  if (!tableReady) {
    tableReady = (async () => {
      await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "GameEvent" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "gameId" TEXT NOT NULL,
        "teamId" TEXT NOT NULL,
        "playerId" TEXT,
        "type" TEXT NOT NULL,
        "period" INTEGER NOT NULL DEFAULT 1,
        "value" INTEGER,
        "batchId" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`)
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "GameEvent_gameId_idx" ON "GameEvent"("gameId")`)
      // Added after first release; ignore "duplicate column" on tables that have it
      await prisma.$executeRawUnsafe(`ALTER TABLE "GameEvent" ADD COLUMN "value" INTEGER`).catch(() => {})
    })().catch(e => { tableReady = null; throw e })
  }
  return tableReady
}

export async function getGameEvents(gameId: string) {
  await ensureGameEventTable()
  return prisma.gameEvent.findMany({ where: { gameId }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] })
}

// ── Sync into the existing tables ─────────────────────────────────────────────
// Keeps PlayerGameStat + Game scores current so standings, leaderboards and the
// box score page work unchanged. `extraPlayerIds` covers players whose last
// event was just deleted (they need their row reset to zero).
export async function syncGameFromEvents(gameId: string, extraPlayerIds: string[] = []) {
  const game = await prisma.game.findUnique({ where: { id: gameId } })
  if (!game) return null
  const events = await getGameEvents(gameId)
  const live = replayEvents(events, game.homeTeamId, game.awayTeamId)

  const teamByPlayer: Record<string, string> = {}
  for (const e of events) if (e.playerId) teamByPlayer[e.playerId] = e.teamId
  if (extraPlayerIds.length) {
    const extra = await prisma.player.findMany({ where: { id: { in: extraPlayerIds } }, select: { id: true, teamId: true } })
    for (const p of extra) teamByPlayer[p.id] ??= p.teamId
  }

  await Promise.all(Object.entries(teamByPlayer).map(([playerId, teamId]) => {
    const { plusMinus: _pm, seconds: _s, playerId: _p, teamId: _t, ...stats } = live.lines[playerId] ?? emptyLine(playerId, teamId)
    return prisma.playerGameStat.upsert({
      where: { playerId_gameId: { playerId, gameId } },
      update: stats,
      create: { playerId, gameId, teamId, ...stats },
    })
  }))

  await prisma.game.update({
    where: { id: gameId },
    data: events.length
      ? { homeScore: live.homeScore, awayScore: live.awayScore }
      : game.played ? {} : { homeScore: null, awayScore: null },
  })

  return { game, events, live }
}

// ── Games in progress ─────────────────────────────────────────────────────────
// A game is live when it isn't final, has a running score, and the scorer has
// logged something recently (so an abandoned scorer doesn't stay "live" forever).
const LIVE_WINDOW_MS = 3 * 60 * 60 * 1000

export async function getLiveGames() {
  const candidates = await prisma.game.findMany({
    where: { played: false, homeScore: { not: null }, awayScore: { not: null } },
    include: {
      homeTeam: { select: { id: true, name: true, slug: true, color: true, logo: true } },
      awayTeam: { select: { id: true, name: true, slug: true, color: true, logo: true } },
    },
    take: 20,
  })
  if (!candidates.length) return []
  await ensureGameEventTable()
  const now = Date.now()

  const live = await Promise.all(candidates.map(async game => {
    const events = await prisma.gameEvent.findMany({ where: { gameId: game.id }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] })
    const last = events[events.length - 1]
    if (!last || now - new Date(last.createdAt).getTime() > LIVE_WINDOW_MS) return null
    const r = replayEvents(events, game.homeTeamId, game.awayTeamId, now)
    return {
      id: game.id, season: game.season, league: game.league,
      homeTeam: game.homeTeam, awayTeam: game.awayTeam,
      homeScore: r.homeScore, awayScore: r.awayScore,
      period: r.period, clock: fmtClock(r.clock.periodSec), clockRunning: r.clock.running,
    }
  }))
  return live.filter((g): g is NonNullable<typeof g> => g !== null)
}

export type LiveGameSummary = Awaited<ReturnType<typeof getLiveGames>>[number]
