'use client'

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { replayEvents, EVENT_LABELS, type EventType, type LiveEvent } from '@/lib/liveStatsShared'

interface Team { id: string; name: string; color: string }
interface Player { id: string; name: string; number: number; teamId: string; isSub: boolean }
interface Game {
  id: string; homeTeamId: string; awayTeamId: string; homeTeam: Team; awayTeam: Team
  season: string; played: boolean
}
interface LiveState {
  game: Game
  players: Record<string, Player[]>
  events: LiveEvent[]
  hasManualStats: boolean
}
type NewEvent = { teamId: string; playerId?: string; type: EventType; period: number }

// What the action pad is asking for after the first tap
type Mode =
  | { kind: 'stat' }
  | { kind: 'assist'; teamId: string; shooterId: string }
  | { kind: 'subIn'; teamId: string; outId: string }   // pick who comes in
  | { kind: 'subOut'; teamId: string; inId: string }   // floor is full: pick who goes out

const STAT_BUTTONS: { type: EventType; label: string; color: string }[] = [
  { type: '2PM', label: '+2', color: '#27AE60' },
  { type: '3PM', label: '+3', color: '#27AE60' },
  { type: 'FTM', label: 'FT ✓', color: '#27AE60' },
  { type: '2PX', label: 'Miss 2', color: '#7a3b3b' },
  { type: '3PX', label: 'Miss 3', color: '#7a3b3b' },
  { type: 'FTX', label: 'Miss FT', color: '#7a3b3b' },
  { type: 'REB', label: 'REB', color: '#1a3a5c' },
  { type: 'AST', label: 'AST', color: '#1a3a5c' },
  { type: 'STL', label: 'STL', color: '#1a3a5c' },
  { type: 'BLK', label: 'BLK', color: '#1a3a5c' },
  { type: 'TO', label: 'TO', color: '#4a3a1a' },
  { type: 'FOUL', label: 'FOUL', color: '#4a3a1a' },
]

const btn: React.CSSProperties = {
  border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 800, cursor: 'pointer',
  touchAction: 'manipulation', userSelect: 'none',
}

let tempId = 0

export default function LiveScorerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [state, setState] = useState<LiveState | null>(null)
  const [pending, setPending] = useState<LiveEvent[]>([])
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>({ kind: 'stat' })
  const [activeTeam, setActiveTeam] = useState<string | null>(null)
  const [subName, setSubName] = useState('')
  const [addingSubFor, setAddingSubFor] = useState<string | null>(null)

  const [myBatches, setMyBatches] = useState<string[]>([])  // batches this device logged, for Undo
  const queue = useRef<Promise<unknown>>(Promise.resolve())
  const inFlight = useRef(0)

  const api = `/api/admin/games/${id}/live`

  const load = useCallback(async () => {
    if (inFlight.current > 0) return
    const res = await fetch(api)
    if (!res.ok) { setError('Could not load game'); return }
    const data = await res.json()
    if (inFlight.current === 0) setState(data)
  }, [api])

  // Initial load + poll so two scorers see each other's entries
  useEffect(() => {
    load()
    const t = setInterval(load, 3000)
    return () => clearInterval(t)
  }, [load])

  const events = useMemo(() => [...(state?.events ?? []), ...pending], [state, pending])
  const live = useMemo(
    () => state ? replayEvents(events, state.game.homeTeamId, state.game.awayTeamId) : null,
    [events, state],
  )

  const playersById = useMemo(() => {
    const map: Record<string, Player> = {}
    for (const list of Object.values(state?.players ?? {})) for (const p of list) map[p.id] = p
    return map
  }, [state])

  // Run mutations one at a time, in tap order
  const send = (fn: () => Promise<Response>) => {
    inFlight.current++
    queue.current = queue.current.then(async () => {
      try {
        const res = await fn()
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Request failed')
        if (data.batchId) setMyBatches(prev => [...prev, data.batchId])
        setError('')
        return data
      } catch (e: any) {
        setError(`Not saved: ${e.message}`)
        return null
      } finally {
        inFlight.current--
      }
    }).then(data => {
      if (inFlight.current === 0) {
        setPending([])
        if (data?.game) setState(data)
        else load()
      }
    })
  }

  const log = (newEvents: NewEvent[]) => {
    const batchId = `temp-${++tempId}`
    const now = Date.now()
    setPending(prev => [...prev, ...newEvents.map((e, i) => ({
      id: `${batchId}-${i}`, gameId: id, teamId: e.teamId, playerId: e.playerId ?? null,
      type: e.type, period: e.period, batchId, createdAt: new Date(now + i).toISOString(),
    }))])
    send(() => fetch(api, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: newEvents }),
    }))
  }

  const removeBatch = (batchId: string) => {
    setMyBatches(prev => prev.filter(b => b !== batchId))
    setState(prev => prev && { ...prev, events: prev.events.filter(e => e.batchId !== batchId) })
    send(() => fetch(`${api}?batchId=${encodeURIComponent(batchId)}`, { method: 'DELETE' }))
  }

  const undo = () => {
    const last = myBatches[myBatches.length - 1]
    if (last) removeBatch(last)
  }

  const setGameStatus = (action: 'final' | 'reopen') => {
    if (action === 'final' && !confirm('Mark this game FINAL? Scores and stats will count in standings.')) return
    send(() => fetch(api, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) }))
  }

  const addSub = async (teamId: string) => {
    const name = subName.trim()
    if (!name) return
    const res = await fetch('/api/admin/players', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, number: 0, position: 'G', teamId, isSub: true }),
    })
    if (!res.ok) { setError('Could not add sub'); return }
    const p = await res.json()
    setState(prev => prev && {
      ...prev,
      players: { ...prev.players, [teamId]: [...(prev.players[teamId] ?? []).filter(x => x.id !== p.id), p] },
    })
    setSubName('')
    setAddingSubFor(null)
  }

  if (!state || !live) {
    return <div style={{ minHeight: '100vh', backgroundColor: '#0d0d0d', color: '#555', padding: '40px', textAlign: 'center' }}>{error || 'Loading game…'}</div>
  }

  const { game } = state
  const period = live.period
  const teams = [game.awayTeam, game.homeTeam]
  const shownTeam = activeTeam ?? game.awayTeamId  // phone view shows one team at a time
  const teamOf = (pid: string) => playersById[pid]?.teamId
  const selectedPlayer = selected ? playersById[selected] : null
  const selectedOnCourt = !!selected && !!selectedPlayer && live.onCourt[selectedPlayer.teamId]?.includes(selected)

  const teamFouls = (teamId: string) =>
    events.filter(e => e.type === 'FOUL' && e.teamId === teamId && e.period === period).length

  const canUndo = pending.length === 0 && myBatches.length > 0

  const clearSelection = () => { setSelected(null); setMode({ kind: 'stat' }) }

  // Tapping a player: either select them, or complete the pending assist/sub
  const tapPlayer = (p: Player) => {
    if (mode.kind === 'assist') {
      if (p.teamId === mode.teamId && p.id !== mode.shooterId) log([{ teamId: p.teamId, playerId: p.id, type: 'AST', period }])
      clearSelection(); return
    }
    if (mode.kind === 'subIn' && p.teamId === mode.teamId && !live.onCourt[p.teamId].includes(p.id)) {
      log([{ teamId: p.teamId, playerId: mode.outId, type: 'OUT', period }, { teamId: p.teamId, playerId: p.id, type: 'IN', period }])
      clearSelection(); return
    }
    if (mode.kind === 'subOut' && p.teamId === mode.teamId && live.onCourt[p.teamId].includes(p.id)) {
      log([{ teamId: p.teamId, playerId: p.id, type: 'OUT', period }, { teamId: p.teamId, playerId: mode.inId, type: 'IN', period }])
      clearSelection(); return
    }
    setMode({ kind: 'stat' })
    setSelected(selected === p.id ? null : p.id)
    setActiveTeam(p.teamId)
  }

  const tapStat = (type: EventType) => {
    if (!selectedPlayer) return
    log([{ teamId: selectedPlayer.teamId, playerId: selectedPlayer.id, type, period }])
    const teammatesOnFloor = live.onCourt[selectedPlayer.teamId].filter(pid => pid !== selectedPlayer.id)
    if ((type === '2PM' || type === '3PM') && teammatesOnFloor.length) {
      setMode({ kind: 'assist', teamId: selectedPlayer.teamId, shooterId: selectedPlayer.id })
    } else {
      clearSelection()
    }
  }

  const tapSub = () => {
    if (!selectedPlayer) return
    const teamId = selectedPlayer.teamId
    if (selectedOnCourt) {
      setMode({ kind: 'subIn', teamId, outId: selectedPlayer.id })
    } else if (live.onCourt[teamId].length >= 5) {
      setMode({ kind: 'subOut', teamId, inId: selectedPlayer.id })
    } else {
      log([{ teamId, playerId: selectedPlayer.id, type: 'IN', period }])
      clearSelection()
    }
  }

  const prompt =
    mode.kind === 'assist' ? 'Assisted by? Tap a teammate, or skip' :
    mode.kind === 'subIn' ? `Who comes in for ${playersById[mode.outId]?.name}? Tap a bench player` :
    mode.kind === 'subOut' ? `Floor is full. Who goes out for ${playersById[mode.inId]?.name}?` :
    selectedPlayer ? `#${selectedPlayer.number || '–'} ${selectedPlayer.name}` : 'Tap a player, then a stat'

  // Recent plays, newest first, one row per batch
  const batches: { batchId: string; items: LiveEvent[] }[] = []
  for (const e of [...events].reverse()) {
    const last = batches[batches.length - 1]
    if (last?.batchId === e.batchId) last.items.push(e)
    else batches.push({ batchId: e.batchId, items: [e] })
  }

  const describe = (items: LiveEvent[]) => {
    const e = items[0]
    if (e.type === 'PERIOD') return `Start of period ${e.period}`
    const sub = items.length === 2 && items.some(i => i.type === 'IN') && items.some(i => i.type === 'OUT')
    if (sub) {
      const inP = playersById[items.find(i => i.type === 'IN')!.playerId!]
      const outP = playersById[items.find(i => i.type === 'OUT')!.playerId!]
      return `Sub: ${inP?.name ?? '?'} in for ${outP?.name ?? '?'}`
    }
    return `${playersById[e.playerId!]?.name ?? 'Unknown'} ${EVENT_LABELS[e.type as EventType] ?? e.type}`
  }

  const renderTeamPanel = (team: Team) => {
    const roster = state.players[team.id] ?? []
    const floor = roster.filter(p => live.onCourt[team.id].includes(p.id))
    const bench = roster.filter(p => !live.onCourt[team.id].includes(p.id))
    const dim = (p: Player) =>
      (mode.kind === 'assist' && (p.teamId !== mode.teamId || p.id === mode.shooterId || !live.onCourt[p.teamId].includes(p.id))) ||
      (mode.kind === 'subIn' && (p.teamId !== mode.teamId || live.onCourt[p.teamId].includes(p.id))) ||
      (mode.kind === 'subOut' && (p.teamId !== mode.teamId || !live.onCourt[p.teamId].includes(p.id)))

    const renderPlayer = (p: Player, big: boolean) => {
      const l = live.lines[p.id]
      const isSel = selected === p.id
      return (
        <button
          key={p.id}
          onClick={() => tapPlayer(p)}
          style={{
            ...btn, textAlign: 'left', padding: big ? '12px' : '9px 10px',
            backgroundColor: isSel ? team.color : big ? '#1e1e1e' : '#151515',
            border: `2px solid ${isSel ? '#fff' : big ? team.color + '66' : '#222'}`,
            opacity: dim(p) ? 0.3 : 1, fontWeight: 700,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: big ? '20px' : '15px', fontWeight: 900 }}>{p.isSub ? 'S' : (p.number || '–')}</span>
            <span style={{ fontSize: big ? '14px' : '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
          </div>
          <div style={{ fontSize: '11px', color: isSel ? '#fff' : '#777', marginTop: '3px', fontWeight: 600 }}>
            {l ? `${l.points} pts · ${l.rebounds} reb · ${l.assists} ast · ${l.fouls} PF` : '—'}
          </div>
        </button>
      )
    }

    return (
      <div style={{ backgroundColor: '#111', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: team.color, flexShrink: 0 }} />
            <span style={{ color: '#fff', fontWeight: 800, fontSize: '15px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.name}</span>
          </div>
          <span style={{ color: teamFouls(team.id) >= 7 ? '#F5A623' : '#666', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
            TEAM FOULS {teamFouls(team.id)}
          </span>
        </div>

        <div style={{ color: '#4A9FE3', fontSize: '10px', fontWeight: 800, letterSpacing: '0.1em', marginBottom: '6px' }}>
          ON FLOOR ({floor.length})
        </div>
        {floor.length === 0 ? (
          <div style={{ color: '#555', fontSize: '12px', marginBottom: '10px' }}>Nobody checked in yet. Tap a player below, then <b>Check in</b>. You can also log stats without setting a lineup.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '6px', marginBottom: '12px' }}>
            {floor.map(p => renderPlayer(p, true))}
          </div>
        )}

        <div style={{ color: '#555', fontSize: '10px', fontWeight: 800, letterSpacing: '0.1em', marginBottom: '6px' }}>BENCH</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '6px' }}>
          {bench.map(p => renderPlayer(p, false))}
        </div>
        {roster.length === 0 && <div style={{ color: '#555', fontSize: '12px' }}>No roster found for {game.season}. Add players under Teams & Roster, or add subs below.</div>}

        {addingSubFor === team.id ? (
          <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
            <input
              autoFocus value={subName} onChange={e => setSubName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSub(team.id)}
              placeholder="Sub's name"
              style={{ flex: 1, minWidth: 0, backgroundColor: '#0d0d0d', color: '#fff', border: '1px solid #333', borderRadius: '8px', padding: '8px 10px', fontSize: '14px' }}
            />
            <button onClick={() => addSub(team.id)} style={{ ...btn, backgroundColor: '#27AE60', padding: '8px 14px', fontSize: '13px' }}>Add</button>
            <button onClick={() => setAddingSubFor(null)} style={{ ...btn, backgroundColor: '#2a2a2a', padding: '8px 12px', fontSize: '13px' }}>✕</button>
          </div>
        ) : (
          <button onClick={() => { setAddingSubFor(team.id); setSubName('') }}
            style={{ ...btn, marginTop: '10px', backgroundColor: 'transparent', border: '1px dashed #333', color: '#777', padding: '8px', width: '100%', fontSize: '12px' }}>
            + Add sub player
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0d0d0d', paddingBottom: '300px' }}>
      {/* Scoreboard */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, backgroundColor: '#111', borderBottom: '1px solid #222', padding: '10px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
          <Link href="/admin/games" style={{ color: '#666', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>← Games</Link>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <Link href={`/games/${game.id}`} target="_blank" style={{ color: '#4A9FE3', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>Public page ↗</Link>
            {game.played ? (
              <button onClick={() => setGameStatus('reopen')} style={{ ...btn, backgroundColor: '#2a2a2a', color: '#aaa', padding: '6px 10px', fontSize: '11px' }}>Reopen</button>
            ) : (
              <button onClick={() => setGameStatus('final')} style={{ ...btn, backgroundColor: '#27AE60', padding: '6px 10px', fontSize: '11px' }}>End game</button>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
          <div style={{ flex: 1, textAlign: 'right', minWidth: 0 }}>
            <div style={{ color: '#aaa', fontSize: '12px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{game.awayTeam.name}</div>
            <div style={{ color: '#fff', fontSize: '34px', fontWeight: 900, lineHeight: 1 }}>{live.awayScore}</div>
          </div>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{
              backgroundColor: game.played ? '#1a4731' : '#5c1a1a', color: game.played ? '#27AE60' : '#ff6b6b',
              fontSize: '10px', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', letterSpacing: '0.08em', marginBottom: '4px',
            }}>{game.played ? 'FINAL' : 'LIVE'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#888', fontSize: '12px', fontWeight: 700 }}>P{period}</span>
              <button
                onClick={() => log([{ teamId: game.homeTeamId, type: 'PERIOD', period: period + 1 }])}
                style={{ ...btn, backgroundColor: '#222', color: '#aaa', padding: '3px 8px', fontSize: '11px' }}
              >Next ▸</button>
            </div>
          </div>
          <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
            <div style={{ color: '#aaa', fontSize: '12px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{game.homeTeam.name}</div>
            <div style={{ color: '#fff', fontSize: '34px', fontWeight: 900, lineHeight: 1 }}>{live.homeScore}</div>
          </div>
        </div>
        {error && <div style={{ color: '#ff6b6b', fontSize: '12px', textAlign: 'center', marginTop: '6px' }}>{error}</div>}
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '12px 16px' }}>
        {state.hasManualStats && (
          <div style={{ backgroundColor: '#3a2a10', border: '1px solid #F5A62355', color: '#F5A623', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', marginBottom: '12px' }}>
            This game already has stats entered by hand. Live scoring will overwrite the stat line of any player you log.
          </div>
        )}

        {/* Team toggle on phones; both columns side by side on tablets and up */}
        <div className="md:hidden" style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
          {teams.map(t => (
            <button key={t.id} onClick={() => setActiveTeam(t.id)}
              style={{ ...btn, flex: 1, padding: '10px', fontSize: '13px', backgroundColor: shownTeam === t.id ? t.color : '#1a1a1a', border: `1px solid ${t.color}55` }}>
              {t.name}
            </button>
          ))}
        </div>
        <div className="grid md:grid-cols-2" style={{ gap: '12px' }}>
          {teams.map(t => (
            <div key={t.id} className={shownTeam === t.id ? '' : 'hidden md:block'}>
              {renderTeamPanel(t)}
            </div>
          ))}
        </div>

        {/* Play-by-play */}
        <div style={{ marginTop: '16px' }}>
          <div style={{ color: '#4A9FE3', fontSize: '10px', fontWeight: 800, letterSpacing: '0.1em', marginBottom: '8px' }}>PLAY-BY-PLAY</div>
          {batches.length === 0 && <div style={{ color: '#444', fontSize: '13px' }}>Nothing logged yet.</div>}
          {batches.slice(0, 40).map(b => {
            const teamId = b.items[0].type === 'PERIOD' ? null : b.items[0].teamId
            const team = teams.find(t => t.id === teamId)
            const isPending = b.batchId.startsWith('temp-')
            return (
              <div key={b.batchId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 0', borderBottom: '1px solid #1a1a1a', opacity: isPending ? 0.5 : 1 }}>
                <span style={{ color: '#555', fontSize: '11px', width: '24px', flexShrink: 0 }}>P{b.items[0].period}</span>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: team?.color ?? '#444', flexShrink: 0 }} />
                <span style={{ color: '#ccc', fontSize: '13px', flex: 1 }}>{describe(b.items)}</span>
                {!isPending && (
                  <button onClick={() => removeBatch(b.batchId)} aria-label="Delete play"
                    style={{ ...btn, backgroundColor: 'transparent', color: '#555', fontSize: '16px', padding: '2px 8px' }}>✕</button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Action pad */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30, backgroundColor: '#111', borderTop: '1px solid #2a2a2a', padding: '10px 12px calc(10px + env(safe-area-inset-bottom))' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div style={{ flex: 1, color: selectedPlayer || mode.kind !== 'stat' ? '#fff' : '#666', fontSize: '14px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {prompt}
            </div>
            {(selectedPlayer || mode.kind !== 'stat') && (
              <button onClick={clearSelection} style={{ ...btn, backgroundColor: '#2a2a2a', color: '#aaa', padding: '8px 12px', fontSize: '12px' }}>
                {mode.kind === 'assist' ? 'No assist' : 'Cancel'}
              </button>
            )}
            <button onClick={undo} disabled={!canUndo}
              style={{ ...btn, backgroundColor: '#3a1a1a', color: '#ff8a8a', padding: '8px 14px', fontSize: '13px', opacity: canUndo ? 1 : 0.4 }}>
              ↶ Undo
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px', opacity: selectedPlayer && mode.kind === 'stat' ? 1 : 0.35, pointerEvents: selectedPlayer && mode.kind === 'stat' ? 'auto' : 'none' }}>
            {STAT_BUTTONS.map(s => (
              <button key={s.type} onClick={() => tapStat(s.type)}
                style={{ ...btn, backgroundColor: s.color, padding: '14px 4px', fontSize: '14px' }}>
                {s.label}
              </button>
            ))}
            <button onClick={tapSub}
              style={{ ...btn, gridColumn: 'span 6', backgroundColor: '#2a2a3a', padding: '12px', fontSize: '14px' }}>
              {selectedOnCourt ? '⇄ Sub out' : '⇄ Check in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
