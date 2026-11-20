// Pure helpers shared by the server routes and the live scorer page (no DB imports).

// ── Event types logged by the live scorer ─────────────────────────────────────
// Made/missed shots, counting stats, substitutions (IN/OUT), period changes and
// game clock control. CLOCK_SET carries the period-elapsed seconds in `value`.
export const EVENT_TYPES = [
  '2PM', '2PX', '3PM', '3PX', 'FTM', 'FTX',
  'REB', 'AST', 'STL', 'BLK', 'TO', 'FOUL',
  'IN', 'OUT', 'PERIOD', 'TIMEOUT',
  'CLOCK_START', 'CLOCK_STOP', 'CLOCK_SET',
] as const
export type EventType = typeof EVENT_TYPES[number]

export const EVENT_LABELS: Record<EventType, string> = {
  '2PM': 'made 2', '2PX': 'missed 2', '3PM': 'made 3', '3PX': 'missed 3',
  FTM: 'made FT', FTX: 'missed FT', REB: 'rebound', AST: 'assist', STL: 'steal',
  BLK: 'block', TO: 'turnover', FOUL: 'foul', IN: 'checked in', OUT: 'checked out',
  PERIOD: 'period', TIMEOUT: 'timeout', CLOCK_START: 'clock started', CLOCK_STOP: 'clock stopped', CLOCK_SET: 'clock set',
}

export const CLOCK_TYPES: string[] = ['CLOCK_START', 'CLOCK_STOP', 'CLOCK_SET']
// 35+ league plays 4v4; every other league is 5v5
export const maxOnCourt = (league: string) => (/35\+/.test(league) ? 4 : 5)

const POINTS: Partial<Record<EventType, number>> = { '2PM': 2, '3PM': 3, FTM: 1 }

export interface LiveEvent {
  id: string; gameId: string; teamId: string; playerId: string | null
  type: string; period: number; batchId: string; createdAt: Date | string
  value?: number | null
}

export interface LiveLine {
  playerId: string; teamId: string
  points: number; rebounds: number; assists: number; steals: number; blocks: number; turnovers: number
  twoPtMade: number; twoPtAtt: number; threeMade: number; threeAtt: number; ftMade: number; ftAtt: number
  fouls: number; plusMinus: number; seconds: number
}

export const emptyLine = (playerId: string, teamId: string): LiveLine => ({
  playerId, teamId, points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0,
  twoPtMade: 0, twoPtAtt: 0, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, fouls: 0, plusMinus: 0, seconds: 0,
})

const wallMs = (d: Date | string) => new Date(d).getTime()

// 754 → "12:34"
export function fmtClock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// ── Replay ────────────────────────────────────────────────────────────────────
// Walks events in order to build each player's line, the score, who is on the
// floor, minutes, and +/- (points scored minus allowed while on the floor).
//
// Minutes run off the game clock, not the wall clock: the clock only advances
// between CLOCK_START and CLOCK_STOP, and a new PERIOD stops it. `nowMs` is the
// current server time, used to credit players still on the floor.
export function replayEvents(events: LiveEvent[], homeTeamId: string, awayTeamId: string, nowMs = Date.now()) {
  const lines: Record<string, LiveLine> = {}
  const onCourt: Record<string, Set<string>> = { [homeTeamId]: new Set(), [awayTeamId]: new Set() }
  const onSince: Record<string, number> = {}  // playerId → game seconds when they checked in
  const score: Record<string, number> = { [homeTeamId]: 0, [awayTeamId]: 0 }
  const eventClock: Record<string, { period: number; periodSec: number }> = {}
  let period = 1

  // Game clock state
  let running = false
  let elapsed = 0         // game seconds at lastChangeMs
  let lastChangeMs = 0
  let periodStart = 0     // game seconds when the current period began

  const gameSecAt = (ms: number) => elapsed + (running ? Math.max(0, ms - lastChangeMs) / 1000 : 0)
  const stopClock = (ms: number) => { if (running) { elapsed = gameSecAt(ms); running = false; lastChangeMs = ms } }
  const line = (pid: string, teamId: string) => (lines[pid] ??= emptyLine(pid, teamId))

  for (const e of events) {
    const type = e.type as EventType
    const ms = wallMs(e.createdAt)
    const now = gameSecAt(ms)
    eventClock[e.id] = { period, periodSec: now - periodStart }

    if (type === 'CLOCK_START') { if (!running) { elapsed = now; running = true; lastChangeMs = ms }; continue }
    if (type === 'CLOCK_STOP') { stopClock(ms); continue }
    if (type === 'CLOCK_SET') {
      // Players on the floor absorb the correction (e.g. scorer forgot to start
      // the clock); a stint can't start after the corrected time
      elapsed = periodStart + Math.max(0, e.value ?? 0); lastChangeMs = ms
      for (const pid of Object.keys(onSince)) onSince[pid] = Math.min(onSince[pid], elapsed)
      continue
    }
    if (type === 'PERIOD') {
      stopClock(ms)
      period = e.period
      periodStart = elapsed
      eventClock[e.id] = { period, periodSec: 0 }
      continue
    }
    if (!e.playerId) continue
    const l = line(e.playerId, e.teamId)

    switch (type) {
      case 'IN':
        if (!onCourt[e.teamId]?.has(e.playerId)) { onCourt[e.teamId]?.add(e.playerId); onSince[e.playerId] = now }
        break
      case 'OUT':
        if (onCourt[e.teamId]?.has(e.playerId)) {
          onCourt[e.teamId].delete(e.playerId)
          l.seconds += Math.max(0, now - (onSince[e.playerId] ?? now))
          delete onSince[e.playerId]
        }
        break
      case '2PM': l.twoPtMade++; l.twoPtAtt++; break
      case '2PX': l.twoPtAtt++; break
      case '3PM': l.threeMade++; l.threeAtt++; break
      case '3PX': l.threeAtt++; break
      case 'FTM': l.ftMade++; l.ftAtt++; break
      case 'FTX': l.ftAtt++; break
      case 'REB': l.rebounds++; break
      case 'AST': l.assists++; break
      case 'STL': l.steals++; break
      case 'BLK': l.blocks++; break
      case 'TO': l.turnovers++; break
      case 'FOUL': l.fouls++; break
    }

    const pts = POINTS[type]
    if (pts) {
      l.points += pts
      score[e.teamId] = (score[e.teamId] ?? 0) + pts
      const oppId = e.teamId === homeTeamId ? awayTeamId : homeTeamId
      for (const pid of onCourt[e.teamId] ?? []) line(pid, e.teamId).plusMinus += pts
      for (const pid of onCourt[oppId] ?? []) line(pid, oppId).plusMinus -= pts
    }
  }

  // Credit time for players still on the floor
  const gameSec = gameSecAt(nowMs)
  for (const [teamId, set] of Object.entries(onCourt)) {
    for (const pid of set) line(pid, teamId).seconds += Math.max(0, gameSec - (onSince[pid] ?? gameSec))
  }

  return {
    lines,
    period,
    homeScore: score[homeTeamId] ?? 0,
    awayScore: score[awayTeamId] ?? 0,
    onCourt: { [homeTeamId]: [...onCourt[homeTeamId]], [awayTeamId]: [...onCourt[awayTeamId]] },
    clock: { running, gameSec, periodSec: gameSec - periodStart },
    eventClock,
  }
}
