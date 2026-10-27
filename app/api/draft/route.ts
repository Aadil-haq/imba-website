import { NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth'
import {
  DraftError, applyPick, applySkip, bestAvailable, loadPins, loadState, mutate, onClock,
  regeneratePins, startClock, availableNames, freshState, poolNames,
} from '@/lib/draft'

export const dynamic = 'force-dynamic'

const noStore = { 'Cache-Control': 'no-store, max-age=0' }

export async function GET(request: Request) {
  const state = await loadState()
  const isAdmin = checkAdminAuth(request)
  const body: Record<string, unknown> = { state, serverNow: Date.now(), isAdmin }
  if (isAdmin) body.pins = await loadPins()
  return NextResponse.json(body, { headers: noStore })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const action = String(body.action || '')
    const isAdmin = checkAdminAuth(request)
    const pins = await loadPins()

    const captainOk = (captainId: string, pin: string) =>
      !!captainId && !!pin && pins[captainId] !== undefined && pins[captainId] === String(pin)

    if (action === 'auth') {
      const state = await loadState()
      const cap = state.captains.find(c => c.id === body.captainId)
      if (!cap || !captainOk(cap.id, body.pin)) throw new DraftError('That PIN did not match.', 401)
      return NextResponse.json({ ok: true, captainId: cap.id }, { headers: noStore })
    }

    if (action === 'pick') {
      if (!isAdmin && !captainOk(body.captainId, body.pin)) throw new DraftError('Sign in as a captain to pick.', 401)
      const next = await mutate(s => {
        applyPick(s, String(body.captainId), String(body.player), isAdmin && !captainOk(body.captainId, body.pin) ? 'admin' : 'captain')
        return s
      })
      return NextResponse.json({ ok: true, state: next, serverNow: Date.now() }, { headers: noStore })
    }

    if (action === 'tick') {
      // Anyone's browser can report an expired clock; the server decides whether it really expired.
      const next = await mutate(s => {
        const turn = onClock(s)
        if (s.status !== 'live' || !s.autoPick || !s.clockStart || !turn) return s
        if (Date.now() < new Date(s.clockStart).getTime() + s.pickSeconds * 1000 + 1500) return s
        const player = bestAvailable(s)
        if (player) applyPick(s, turn.captain.id, player, 'auto')
        return s
      })
      return NextResponse.json({ ok: true, state: next, serverNow: Date.now() }, { headers: noStore })
    }

    // Everything below is commissioner-only.
    if (!isAdmin) throw new DraftError('Commissioner login required.', 401)

    let extra: Record<string, unknown> = {}
    const next = await mutate(s => {
      const now = Date.now()
      switch (action) {
        case 'start':
          if (s.status !== 'setup') throw new DraftError('The draft already started.')
          s.status = 'live'
          startClock(s, now)
          break
        case 'pause':
          if (s.status !== 'live') throw new DraftError('The draft is not live.')
          s.remainingMs = Math.max(0, s.pickSeconds * 1000 - (now - new Date(s.clockStart as string).getTime()))
          s.clockStart = null
          s.status = 'paused'
          break
        case 'resume':
          if (s.status !== 'paused') throw new DraftError('The draft is not paused.')
          s.status = 'live'
          s.clockStart = new Date(now - (s.pickSeconds * 1000 - (s.remainingMs ?? s.pickSeconds * 1000))).toISOString()
          s.remainingMs = null
          break
        case 'restartClock':
          if (s.status === 'live') startClock(s, now)
          else if (s.status === 'paused') s.remainingMs = s.pickSeconds * 1000
          break
        case 'undo': {
          if (!s.picks.length) throw new DraftError('There is no pick to undo.')
          s.picks.pop()
          if (s.status === 'done') s.status = 'live'
          if (s.status === 'live') startClock(s, now)
          else if (s.status === 'paused') s.remainingMs = s.pickSeconds * 1000
          break
        }
        case 'adminPick': {
          const turn = onClock(s)
          if (!turn) throw new DraftError('No pick is open.')
          const player = body.player ? String(body.player) : bestAvailable(s)
          if (!player) throw new DraftError('No players are left.')
          applyPick(s, turn.captain.id, player, 'admin')
          break
        }
        case 'skip':
          applySkip(s)
          break
        case 'settings': {
          if (typeof body.pickSeconds === 'number') s.pickSeconds = Math.min(600, Math.max(10, Math.round(body.pickSeconds)))
          if (typeof body.autoPick === 'boolean') s.autoPick = body.autoPick
          if (typeof body.rounds === 'number') s.rounds = Math.min(20, Math.max(1, Math.round(body.rounds)))
          if (typeof body.snake === 'boolean') {
            if (s.picks.length) throw new DraftError('Snake order can only change before the first pick.')
            s.snake = body.snake
          }
          break
        }
        case 'remove': {
          const name = String(body.player)
          if (!poolNames(s).includes(name)) throw new DraftError('Unknown player.')
          if (s.picks.some(p => p.player === name)) throw new DraftError('That player was already picked.')
          if (!s.removed.includes(name)) s.removed.push(name)
          break
        }
        case 'restore':
          s.removed = s.removed.filter(n => n !== String(body.player))
          break
        case 'reset': {
          const f = freshState()
          s.status = 'setup'
          s.picks = []
          s.clockStart = null
          s.remainingMs = null
          s.captains = f.captains
          break
        }
        case 'regeneratePins':
          break
        default:
          throw new DraftError('Unknown action.')
      }
      return s
    })

    if (action === 'regeneratePins') extra = { pins: await regeneratePins() }
    return NextResponse.json({ ok: true, state: next, serverNow: Date.now(), left: availableNames(next).length, ...extra }, { headers: noStore })
  } catch (err) {
    if (err instanceof DraftError) return NextResponse.json({ error: err.message }, { status: err.status, headers: noStore })
    console.error('Draft API error:', err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500, headers: noStore })
  }
}
