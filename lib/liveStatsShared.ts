// Pure helpers shared by the server routes and the live scorer page (no DB imports).

// ── Event types logged by the live scorer ─────────────────────────────────────
// Made/missed shots, counting stats, substitutions (IN/OUT) and period changes.
export const EVENT_TYPES = [
  '2PM', '2PX', '3PM', '3PX', 'FTM', 'FTX',
  'REB', 'AST', 'STL', 'BLK', 'TO', 'FOUL',
  'IN', 'OUT', 'PERIOD',
] as const
export type EventType = typeof EVENT_TYPES[number]

export const EVENT_LABELS: Record<EventType, string> = {
  '2PM': 'made 2', '2PX': 'missed 2', '3PM': 'made 3', '3PX': 'missed 3',
  FTM: 'made FT', FTX: 'missed FT', REB: 'rebound', AST: 'assist', STL: 'steal',
  BLK: 'block', TO: 'turnover', FOUL: 'foul', IN: 'checked in', OUT: 'checked out',
  PERIOD: 'period',
}

const POINTS: Partial<Record<EventType, number>> = { '2PM': 2, '3PM': 3, FTM: 1 }

export interface LiveEvent {
  id: string; gameId: string; teamId: string; playerId: string | null
  type: string; period: number; batchId: string; createdAt: Date | string
}

export interface LiveLine {
  playerId: string; teamId: string
  points: number; rebounds: number; assists: number; steals: number; blocks: number; turnovers: number
  twoPtMade: number; twoPtAtt: number; threeMade: number; threeAtt: number; ftMade: number; ftAtt: number
  fouls: number; plusMinus: number
}

export const emptyLine = (playerId: string, teamId: string): LiveLine => ({
  playerId, teamId, points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0,
  twoPtMade: 0, twoPtAtt: 0, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, fouls: 0, plusMinus: 0,
})

// ── Replay ────────────────────────────────────────────────────────────────────
// Walks events in order to build each player's line, the score, who is on the
// floor, and +/- (points scored minus allowed while on the floor).
export function replayEvents(events: LiveEvent[], homeTeamId: string, awayTeamId: string) {
  const lines: Record<string, LiveLine> = {}
  const onCourt: Record<string, Set<string>> = { [homeTeamId]: new Set(), [awayTeamId]: new Set() }
  const score: Record<string, number> = { [homeTeamId]: 0, [awayTeamId]: 0 }
  let period = 1

  const line = (e: LiveEvent) => (lines[e.playerId!] ??= emptyLine(e.playerId!, e.teamId))

  for (const e of events) {
    const type = e.type as EventType
    if (type === 'PERIOD') { period = e.period; continue }
    if (!e.playerId) continue
    const l = line(e)

    switch (type) {
      case 'IN': onCourt[e.teamId]?.add(e.playerId); break
      case 'OUT': onCourt[e.teamId]?.delete(e.playerId); break
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
      for (const pid of onCourt[e.teamId] ?? []) (lines[pid] ??= emptyLine(pid, e.teamId)).plusMinus += pts
      for (const pid of onCourt[oppId] ?? []) (lines[pid] ??= emptyLine(pid, oppId)).plusMinus -= pts
    }
  }

  return {
    lines,
    period,
    homeScore: score[homeTeamId] ?? 0,
    awayScore: score[awayTeamId] ?? 0,
    onCourt: { [homeTeamId]: [...onCourt[homeTeamId]], [awayTeamId]: [...onCourt[awayTeamId]] },
  }
}
