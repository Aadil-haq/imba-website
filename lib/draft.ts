import { prisma } from '@/lib/db'
import { DRAFT_POOL, DEFAULT_CAPTAINS } from '@/lib/draftPlayers'

import type { DraftState, DraftPick } from '@/lib/draftShared'
import { poolNames, availableNames, totalPicks, onClock, captainForPick } from '@/lib/draftShared'
export type { DraftState, DraftPick, DraftStatus } from '@/lib/draftShared'
export { poolNames, availableNames, totalPicks, onClock, captainForPick }

export class DraftError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

const STATE_KEY = 'draft_state'
const PINS_KEY = 'draft_pins'

export function freshState(): DraftState {
  return {
    v: 0,
    status: 'setup',
    snake: true,
    rounds: 6,
    pickSeconds: 60,
    autoPick: false,
    captains: DEFAULT_CAPTAINS.map((name, i) => ({ id: `c${i + 1}`, name })),
    picks: [],
    removed: [],
    clockStart: null,
    remainingMs: null,
  }
}

async function readRaw(): Promise<string> {
  const row = await prisma.siteSetting.findUnique({ where: { key: STATE_KEY } })
  if (row) return row.value
  const value = JSON.stringify(freshState())
  await prisma.siteSetting.upsert({ where: { key: STATE_KEY }, update: {}, create: { key: STATE_KEY, value } })
  const again = await prisma.siteSetting.findUnique({ where: { key: STATE_KEY } })
  return again ? again.value : value
}

export async function loadState(): Promise<DraftState> {
  return JSON.parse(await readRaw()) as DraftState
}

export async function loadPins(): Promise<Record<string, string>> {
  const row = await prisma.siteSetting.findUnique({ where: { key: PINS_KEY } })
  if (row) return JSON.parse(row.value)
  const state = await loadState()
  const pins: Record<string, string> = {}
  for (const c of state.captains) pins[c.id] = String(Math.floor(1000 + Math.random() * 9000))
  await prisma.siteSetting.upsert({ where: { key: PINS_KEY }, update: {}, create: { key: PINS_KEY, value: JSON.stringify(pins) } })
  const again = await prisma.siteSetting.findUnique({ where: { key: PINS_KEY } })
  return again ? JSON.parse(again.value) : pins
}

export async function regeneratePins(): Promise<Record<string, string>> {
  const state = await loadState()
  const pins: Record<string, string> = {}
  for (const c of state.captains) pins[c.id] = String(Math.floor(1000 + Math.random() * 9000))
  await prisma.siteSetting.upsert({ where: { key: PINS_KEY }, update: { value: JSON.stringify(pins) }, create: { key: PINS_KEY, value: JSON.stringify(pins) } })
  return pins
}

// Read-modify-write with compare-and-swap so two simultaneous picks can never both land.
export async function mutate(fn: (s: DraftState) => DraftState): Promise<DraftState> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const raw = await readRaw()
    const current = JSON.parse(raw) as DraftState
    const next = fn(structuredClone(current))
    next.v = current.v + 1
    const nextRaw = JSON.stringify(next)
    const res = await prisma.siteSetting.updateMany({ where: { key: STATE_KEY, value: raw }, data: { value: nextRaw } })
    if (res.count === 1) return next
  }
  throw new DraftError('The board is busy, try again.', 409)
}

export function startClock(s: DraftState, now = Date.now()) {
  s.clockStart = new Date(now).toISOString()
  s.remainingMs = null
}

function finishIfComplete(s: DraftState, now = Date.now()) {
  if (s.picks.length >= totalPicks(s) || availableNames(s).length === 0) {
    s.status = 'done'
    s.clockStart = null
    s.remainingMs = null
    return
  }
  if (s.status === 'paused') s.remainingMs = s.pickSeconds * 1000
  else startClock(s, now)
}

export function bestAvailable(s: DraftState): string | null {
  const byName = new Map(DRAFT_POOL.map(p => [p.name, p]))
  const avail = availableNames(s).map(n => byName.get(n)!).filter(Boolean)
  avail.sort((a, b) =>
    (b.rating ?? -1) - (a.rating ?? -1) ||
    (b.p35 ?? -1) - (a.p35 ?? -1) ||
    (b.heightIn ?? 0) - (a.heightIn ?? 0))
  return avail[0]?.name ?? null
}

// The commissioner forfeits the pick that is on the clock; the slot stays on the board as 'Forfeited'.
export function applySkip(s: DraftState) {
  if (s.status !== 'live' && s.status !== 'paused') throw new DraftError('The draft is not running.')
  const turn = onClock(s)
  if (!turn) throw new DraftError('No pick is open.')
  s.picks.push({ n: turn.pickNo, round: turn.round, captainId: turn.captain.id, player: '', by: 'skip', at: new Date().toISOString() })
  finishIfComplete(s)
}

export function applyPick(s: DraftState, captainId: string, player: string, by: DraftPick['by']) {
  if (s.status !== 'live' && !(by === 'admin' && s.status === 'paused')) {
    throw new DraftError(s.status === 'setup' ? 'The draft has not started yet.' : s.status === 'paused' ? 'The draft is paused.' : 'The draft is over.')
  }
  const turn = onClock(s)
  if (!turn) throw new DraftError('No pick is open.')
  if (turn.captain.id !== captainId) throw new DraftError(`It is ${turn.captain.name}'s turn.`, 409)
  if (!availableNames(s).includes(player)) throw new DraftError('That player is not available.', 409)
  s.picks.push({ n: turn.pickNo, round: turn.round, captainId, player, by, at: new Date().toISOString() })
  finishIfComplete(s)
}
