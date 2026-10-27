import { DRAFT_POOL } from '@/lib/draftPlayers'

export type DraftStatus = 'setup' | 'live' | 'paused' | 'done'

export interface DraftPick {
  n: number
  round: number
  captainId: string
  player: string
  by: 'captain' | 'admin' | 'auto' | 'skip'
  at: string
}

export interface DraftState {
  v: number
  status: DraftStatus
  snake: boolean
  rounds: number
  pickSeconds: number
  autoPick: boolean
  captains: { id: string; name: string }[]
  picks: DraftPick[]
  removed: string[]
  clockStart: string | null
  remainingMs: number | null
}

export function poolNames(state: DraftState): string[] {
  const captainNames = new Set(state.captains.map(c => c.name))
  return DRAFT_POOL.map(p => p.name).filter(n => !captainNames.has(n))
}

export function availableNames(state: DraftState): string[] {
  const taken = new Set([...state.picks.map(p => p.player), ...state.removed])
  return poolNames(state).filter(n => !taken.has(n))
}

export function totalPicks(state: DraftState): number {
  // A forfeited pick uses up a slot without using up a player, so it adds one slot.
  const skips = state.picks.filter(p => p.by === 'skip').length
  return Math.min(state.rounds * state.captains.length, poolNames(state).length - state.removed.length + skips)
}

// Whose turn is it for pick number `index` (0-based)?
export function captainForPick(state: DraftState, index: number) {
  const n = state.captains.length
  const round = Math.floor(index / n)
  let pos = index % n
  if (state.snake && round % 2 === 1) pos = n - 1 - pos
  return { captain: state.captains[pos], round: round + 1 }
}

export function onClock(state: DraftState) {
  if (state.status === 'done' || state.status === 'setup') return null
  const idx = state.picks.length
  const { captain, round } = captainForPick(state, idx)
  return { captain, round, pickNo: idx + 1 }
}

