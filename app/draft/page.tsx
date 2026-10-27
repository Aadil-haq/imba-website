'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DRAFT_POOL, SCOUTING_REPORT_URL, type DraftPlayer } from '@/lib/draftPlayers'
import { availableNames, captainForPick, onClock, totalPicks, type DraftState } from '@/lib/draftShared'

interface Payload { state: DraftState; serverNow: number; isAdmin: boolean; pins?: Record<string, string> }
interface Session { captainId: string; pin: string }

const SESSION_KEY = 'imba_draft_session'
const POS_FILTERS = ['All', 'PG', 'SG', 'SF', 'PF', 'C', 'G']
const BLUE = '#4A9FE3'

const card: React.CSSProperties = { backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '14px' }
const btn = (bg: string, fg = '#fff', border = 'transparent'): React.CSSProperties => ({
  backgroundColor: bg, color: fg, border: `1px solid ${border}`, borderRadius: '8px', padding: '9px 16px',
  fontWeight: 700, fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap',
})
const inputS: React.CSSProperties = {
  backgroundColor: '#111', color: '#fff', border: '1px solid #333', borderRadius: '8px', padding: '9px 12px',
  fontSize: '14px', outline: 'none', fontFamily: 'inherit', minWidth: 0,
}

function fmt(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function DraftPage() {
  const [data, setData] = useState<Payload | null>(null)
  const [offset, setOffset] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [session, setSession] = useState<Session | null>(null)
  const [loginCaptain, setLoginCaptain] = useState('')
  const [loginPin, setLoginPin] = useState('')
  const [posFilter, setPosFilter] = useState('All')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('rating')
  const [open, setOpen] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const tickSent = useRef(0)

  const flash = useCallback((text: string, ok = true) => {
    setMsg({ text, ok })
    setTimeout(() => setMsg(m => (m && m.text === text ? null : m)), 4000)
  }, [])

  const apply = useCallback((p: Payload) => {
    setData(prev => {
      if (prev && prev.state.v > p.state.v) return prev
      return { state: p.state, serverNow: p.serverNow, isAdmin: p.isAdmin, pins: p.pins ?? prev?.pins }
    })
    setOffset(p.serverNow - Date.now())
  }, [])

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/draft', { cache: 'no-store' })
      if (r.ok) apply(await r.json())
    } catch { /* keep showing the last board */ }
  }, [apply])

  // Poll for live updates
  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 1500)
    return () => clearInterval(id)
  }, [refresh])

  // Smooth timer
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(id)
  }, [])

  // Restore captain session, or sign in from a personal link (?c=c3&k=1234)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const c = params.get('c'), k = params.get('k')
      if (c && k) {
        fetch('/api/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'auth', captainId: c, pin: k }) })
          .then(r => (r.ok ? r.json() : null))
          .then(j => {
            if (j && j.ok) {
              const s = { captainId: c, pin: k }
              localStorage.setItem(SESSION_KEY, JSON.stringify(s))
              setSession(s)
            }
          })
        window.history.replaceState({}, '', '/draft')
        return
      }
      const raw = localStorage.getItem(SESSION_KEY)
      if (raw) setSession(JSON.parse(raw))
    } catch { /* storage unavailable */ }
  }, [])

  const post = useCallback(async (body: Record<string, unknown>) => {
    setBusy(true)
    try {
      const r = await fetch('/api/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { flash(j.error || 'That did not work.', false); return null }
      if (j.state) apply({ state: j.state, serverNow: j.serverNow ?? Date.now(), isAdmin: !!data?.isAdmin, pins: j.pins ?? data?.pins })
      return j
    } finally { setBusy(false) }
  }, [apply, data?.isAdmin, data?.pins, flash])

  const state = data?.state
  const poolByName = useMemo(() => new Map(DRAFT_POOL.map(p => [p.name, p])), [])
  const serverNow = now + offset
  const turn = state ? onClock(state) : null
  const pickMs = (state?.pickSeconds ?? 60) * 1000
  let remaining: number | null = null
  if (state?.status === 'live' && state.clockStart) remaining = new Date(state.clockStart).getTime() + pickMs - serverNow
  else if (state?.status === 'paused') remaining = state.remainingMs ?? pickMs

  // Ask the server to auto-pick if the commissioner turned that on and time ran out.
  useEffect(() => {
    if (!state || state.status !== 'live' || !state.autoPick || remaining === null || remaining > -1500) return
    if (Date.now() - tickSent.current < 3000) return
    tickSent.current = Date.now()
    post({ action: 'tick' })
  }, [state, remaining, post])

  useEffect(() => {
    if (!state) return
    const t = turn ? `${turn.captain.name} on the clock` : state.status === 'done' ? 'Draft complete' : 'Draft'
    document.title = remaining !== null && state.status === 'live' ? `${fmt(remaining)} · ${t} · IMBA` : `${t} · IMBA`
  }, [state, turn, remaining])

  const me = state && session ? state.captains.find(c => c.id === session.captainId) ?? null : null
  const isAdmin = !!data?.isAdmin
  const myTurn = !!(turn && ((me && me.id === turn.captain.id) || isAdmin) && state?.status === 'live')

  const available = useMemo(() => {
    if (!state) return [] as DraftPlayer[]
    const names = new Set(availableNames(state))
    const q = query.trim().toLowerCase()
    const list = DRAFT_POOL.filter(p => names.has(p.name) && (posFilter === 'All' || p.pos === posFilter) &&
      (!q || (p.name + ' ' + p.notes).toLowerCase().includes(q)))
    const by: Record<string, (a: DraftPlayer, b: DraftPlayer) => number> = {
      rating: (a, b) => (b.rating ?? -1) - (a.rating ?? -1) || (b.p35 ?? -1) - (a.p35 ?? -1),
      p35: (a, b) => (b.p35 ?? -1) - (a.p35 ?? -1) || (b.rating ?? -1) - (a.rating ?? -1),
      r35: (a, b) => (b.r35 ?? -1) - (a.r35 ?? -1) || (b.rating ?? -1) - (a.rating ?? -1),
      height: (a, b) => (b.heightIn ?? 0) - (a.heightIn ?? 0),
      name: (a, b) => a.name.localeCompare(b.name),
    }
    return list.sort(by[sort])
  }, [state, posFilter, query, sort])

  async function signIn() {
    if (!loginCaptain || !loginPin) return
    const j = await post({ action: 'auth', captainId: loginCaptain, pin: loginPin.trim() })
    if (j?.ok) {
      const s = { captainId: loginCaptain, pin: loginPin.trim() }
      try { localStorage.setItem(SESSION_KEY, JSON.stringify(s)) } catch { /* ignore */ }
      setSession(s); setLoginPin(''); flash('Signed in.')
    }
  }
  function signOut() {
    try { localStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
    setSession(null)
  }
  async function draft(player: string) {
    if (!turn) return
    const j = await post({ action: 'pick', captainId: turn.captain.id, pin: me && me.id === turn.captain.id ? session?.pin : undefined, player })
    setConfirming(null)
    if (j?.ok) flash(`${player} drafted.`)
  }

  async function copyTeams() {
    if (!state) return
    const lines = state.captains.map(c => {
      const picks = state.picks.filter(p => p.captainId === c.id && p.player).map(p => p.player)
      return `Team ${c.name} (C)\n${picks.map((n, i) => `${i + 1}. ${n}`).join('\n')}`
    })
    const text = `IMBA 35+ Draft Results\n\n${lines.join('\n\n')}`
    try { await navigator.clipboard.writeText(text); flash('Teams copied.') } catch { flash('Could not copy automatically.', false) }
  }

  if (!state) {
    return <div style={{ backgroundColor: '#111', minHeight: '70vh', color: '#666', display: 'grid', placeItems: 'center' }}>Loading the draft board…</div>
  }

  const n = state.captains.length
  const rows = Math.ceil(totalPicks(state) / n)
  const status = state.status
  const urgent = remaining !== null && status === 'live' && remaining <= 10000
  const warn = remaining !== null && status === 'live' && remaining <= 20000
  const expired = remaining !== null && status === 'live' && remaining <= 0
  const timerColor = status === 'paused' ? '#888' : expired ? '#e74c3c' : urgent ? '#e74c3c' : warn ? '#F5A623' : '#fff'
  const pct = remaining === null ? 0 : Math.max(0, Math.min(100, (remaining / pickMs) * 100))
  const recent = [...state.picks].reverse().slice(0, 8)
  const captainName = (id: string) => state.captains.find(c => c.id === id)?.name ?? ''

  const statusPill = {
    setup: { t: 'Waiting to start', c: '#F5A623' }, live: { t: 'Live', c: '#27AE60' },
    paused: { t: 'Paused', c: '#888' }, done: { t: 'Draft complete', c: BLUE },
  }[status]

  return (
    <div style={{ backgroundColor: '#111', minHeight: '100vh', paddingBottom: '56px' }}>
      <style>{`
        @keyframes pulseRing { 0% { box-shadow: 0 0 0 0 rgba(74,159,227,.55);} 70% { box-shadow: 0 0 0 10px rgba(74,159,227,0);} 100% { box-shadow: 0 0 0 0 rgba(74,159,227,0);} }
        @keyframes blink { 50% { opacity: .35; } }
        .dr-row:hover { background-color: #202020 !important; }
        .dr-scroll { overflow-x: auto; }
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
      `}</style>

      {/* Header */}
      <div style={{ backgroundColor: '#0d0d0d', borderBottom: '1px solid #2a2a2a', padding: '22px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ color: BLUE, fontSize: '12px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>IMBA Winter 2026 · 35+ Draft League</div>
            <h1 style={{ color: '#fff', fontSize: 'clamp(28px, 6vw, 44px)', fontWeight: 900, lineHeight: 1 }}>Live Draft Board</h1>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: statusPill.c, border: `1px solid ${statusPill.c}`, borderRadius: '999px', padding: '5px 12px', fontSize: '12px', fontWeight: 800, letterSpacing: '0.05em' }}>
              {status === 'live' && <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: statusPill.c, marginRight: 7, animation: 'blink 1.4s infinite' }} />}
              {statusPill.t.toUpperCase()}
            </span>
            <a href={SCOUTING_REPORT_URL} target="_blank" rel="noopener noreferrer" style={{ ...btn('#1a2a4a', BLUE, BLUE), textDecoration: 'none' }}>Scouting report ↗</a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ paddingTop: '22px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {msg && (
          <div role="status" style={{ position: 'sticky', top: '70px', zIndex: 20, backgroundColor: msg.ok ? '#0a3a1a' : '#3a0a0a', border: `1px solid ${msg.ok ? '#27AE60' : '#e74c3c'}`, color: msg.ok ? '#27AE60' : '#ff7b6b', padding: '10px 16px', borderRadius: '8px', fontWeight: 700, fontSize: '14px' }}>{msg.text}</div>
        )}

        {/* On the clock */}
        <div style={{ ...card, padding: '22px', display: 'grid', gap: '18px', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', alignItems: 'center', border: myTurn ? `1px solid ${BLUE}` : card.border, animation: myTurn ? 'pulseRing 2s infinite' : undefined }}>
          <div>
            {status === 'setup' && (<><div style={{ color: '#F5A623', fontSize: '12px', fontWeight: 800, letterSpacing: '0.1em' }}>NOT STARTED</div>
              <div style={{ color: '#fff', fontSize: '26px', fontWeight: 900, marginTop: 4 }}>The draft starts at 9:00 PM</div>
              <div style={{ color: '#777', fontSize: '14px', marginTop: 6 }}>First pick: {state.captains[0]?.name}. This page updates by itself.</div></>)}
            {status === 'done' && (<><div style={{ color: BLUE, fontSize: '12px', fontWeight: 800, letterSpacing: '0.1em' }}>FINAL</div>
              <div style={{ color: '#fff', fontSize: '26px', fontWeight: 900, marginTop: 4 }}>All picks are in</div>
              <button onClick={copyTeams} style={{ ...btn('#1a2a4a', BLUE, BLUE), marginTop: 12 }}>Copy teams for WhatsApp</button></>)}
            {turn && (<><div style={{ color: '#888', fontSize: '12px', fontWeight: 800, letterSpacing: '0.1em' }}>ON THE CLOCK · PICK {turn.pickNo} OF {totalPicks(state)} · ROUND {turn.round}</div>
              <div style={{ color: '#fff', fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 900, marginTop: 4, lineHeight: 1.1 }}>{turn.captain.name}</div>
              {myTurn && status === 'live' && <div style={{ color: BLUE, fontWeight: 800, marginTop: 6 }}>{me && me.id === turn.captain.id ? 'You are up. Pick a player below.' : 'Commissioner mode: you can pick for them.'}</div>}
              {state.picks.length < totalPicks(state) - 1 && (() => { const nx = captainForPick(state, state.picks.length + 1).captain; return <div style={{ color: '#666', fontSize: '13px', marginTop: 6 }}>Up next: {nx.name}</div> })()}</>)}
          </div>
          {(status === 'live' || status === 'paused') && remaining !== null && (
            <div>
              <div style={{ color: timerColor, fontSize: 'clamp(52px, 11vw, 84px)', fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums', animation: expired ? 'blink 0.9s infinite' : undefined }}>
                {expired ? '0:00' : fmt(remaining)}
              </div>
              <div style={{ height: 8, borderRadius: 4, backgroundColor: '#2a2a2a', overflow: 'hidden', marginTop: 10 }}>
                <div style={{ height: '100%', width: `${pct}%`, backgroundColor: timerColor === '#fff' ? BLUE : timerColor, transition: 'width .25s linear' }} />
              </div>
              <div style={{ color: '#666', fontSize: '12px', marginTop: 6 }}>
                {status === 'paused' ? 'Clock paused by the commissioner' : expired ? (state.autoPick ? 'Time is up. Auto-pick is on.' : 'Time is up. The pick is still open.') : `${state.pickSeconds} seconds per pick`}
              </div>
            </div>
          )}
        </div>

        {/* Captain sign-in */}
        {!isAdmin && (
          <div style={{ ...card, padding: '14px 18px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            {me ? (
              <>
                <span style={{ color: '#ccc', fontSize: '14px' }}>Signed in as <strong style={{ color: '#fff' }}>{me.name}</strong></span>
                <button onClick={signOut} style={btn('#2a2a2a', '#aaa')}>Sign out</button>
              </>
            ) : (
              <>
                <span style={{ color: '#aaa', fontSize: '14px', fontWeight: 600 }}>Captains: sign in to pick</span>
                <select aria-label="Your name" value={loginCaptain} onChange={e => setLoginCaptain(e.target.value)} style={{ ...inputS, cursor: 'pointer' }}>
                  <option value="">Select your name</option>
                  {state.captains.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input aria-label="PIN" inputMode="numeric" placeholder="4-digit PIN" value={loginPin} onChange={e => setLoginPin(e.target.value)} onKeyDown={e => e.key === 'Enter' && signIn()} style={{ ...inputS, width: 130 }} />
                <button onClick={signIn} disabled={busy} style={btn(BLUE)}>Sign in</button>
              </>
            )}
          </div>
        )}

        {/* Board */}
        <div style={{ ...card, padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '18px' }}>Draft board</h2>
            <span style={{ color: '#666', fontSize: '12px' }}>{state.snake ? 'Snake order: direction flips each round' : 'Same order every round'} · Each column is a team</span>
          </div>
          <div className="dr-scroll">
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${n}, minmax(150px, 1fr))`, gap: '8px', minWidth: `${n * 158}px` }}>
              {state.captains.map((c, i) => (
                <div key={c.id} style={{ backgroundColor: '#0f0f0f', border: `1px solid ${turn && turn.captain.id === c.id ? BLUE : '#2a2a2a'}`, borderRadius: '8px', padding: '10px 12px' }}>
                  <div style={{ color: '#555', fontSize: '10px', fontWeight: 800, letterSpacing: '0.1em' }}>TEAM {i + 1} · CAPTAIN</div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: '14px', lineHeight: 1.2, marginTop: 2 }}>{c.name}</div>
                </div>
              ))}
              {Array.from({ length: rows }).flatMap((_, r) =>
                state.captains.map((c, ci) => {
                  const idx = r * n + (state.snake && r % 2 === 1 ? n - 1 - ci : ci)
                  const pick = state.picks[idx]
                  const isNow = !!turn && turn.pickNo === idx + 1
                  const p = pick && pick.player ? poolByName.get(pick.player) : null
                  const valid = idx < totalPicks(state)
                  const forfeited = !!pick && pick.by === 'skip'
                  return (
                    <div key={`${r}-${c.id}`} style={{
                      minHeight: 58, borderRadius: '8px', padding: '8px 10px', opacity: forfeited ? 0.3 : valid ? 1 : 0.25,
                      backgroundColor: pick && !forfeited ? '#16212c' : '#141414',
                      border: `1px ${forfeited ? 'dashed' : 'solid'} ${isNow ? BLUE : pick && !forfeited ? '#23394e' : '#222'}`,
                      boxShadow: isNow ? `0 0 0 2px ${BLUE}55` : undefined,
                    }}>
                      <div style={{ color: isNow ? BLUE : '#555', fontSize: '10px', fontWeight: 800, letterSpacing: '0.08em' }}>R{r + 1} · #{idx + 1}{pick && pick.by === 'auto' ? ' · AUTO' : ''}</div>
                      {pick && pick.by === 'skip' ? (
                        <div style={{ color: '#6b6b6b', fontSize: '13px', fontWeight: 700, marginTop: 4, fontStyle: 'italic' }}>Pick forfeited</div>
                      ) : pick ? (
                        <>
                          <div style={{ color: '#fff', fontWeight: 700, fontSize: '14px', lineHeight: 1.2 }}>{pick.player}</div>
                          <div style={{ color: '#7d93a8', fontSize: '11px', marginTop: 2 }}>{p ? `${p.pos}${p.height ? ' · ' + p.height : ''}` : ''}</div>
                        </>
                      ) : (
                        <div style={{ color: isNow ? BLUE : '#3a3a3a', fontSize: '13px', fontWeight: 700, marginTop: 4 }}>{isNow ? 'On the clock' : '—'}</div>
                      )}
                    </div>
                  )
                }))}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', alignItems: 'start' }}>

          {/* Available players */}
          <div style={{ ...card, padding: '16px', gridColumn: 'span 2', minWidth: 0 }} className="dr-wide">
            <style>{`.dr-wide { grid-column: span 2; } @media (max-width: 760px) { .dr-wide { grid-column: auto !important; } }`}</style>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '18px' }}>Available players <span style={{ color: '#666', fontWeight: 600 }}>({availableNames(state).length})</span></h2>
              <a href={SCOUTING_REPORT_URL} target="_blank" rel="noopener noreferrer" style={{ color: BLUE, fontSize: '13px', fontWeight: 700 }}>Full scouting report ↗</a>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {POS_FILTERS.map(p => (
                <button key={p} onClick={() => setPosFilter(p)} aria-pressed={posFilter === p} style={{ ...btn(posFilter === p ? BLUE : '#111', posFilter === p ? '#fff' : '#aaa', posFilter === p ? BLUE : '#333'), borderRadius: 999, padding: '6px 12px' }}>{p}</button>
              ))}
              <input type="search" aria-label="Search players" placeholder="Search players or notes" value={query} onChange={e => setQuery(e.target.value)} style={{ ...inputS, flex: '1 1 160px' }} />
              <select aria-label="Sort players" value={sort} onChange={e => setSort(e.target.value)} style={{ ...inputS, cursor: 'pointer' }}>
                <option value="rating">Rating</option>
                <option value="p35">35+ points per game</option>
                <option value="r35">35+ rebounds per game</option>
                <option value="height">Height</option>
                <option value="name">Name</option>
              </select>
            </div>
            <div style={{ border: '1px solid #222', borderRadius: '10px', overflow: 'hidden' }}>
              {available.length === 0 && <div style={{ color: '#666', padding: 24, textAlign: 'center' }}>No players match.</div>}
              {available.map((p, i) => (
                <div key={p.name} className="dr-row" style={{ padding: '12px 14px', borderTop: i ? '1px solid #222' : undefined, backgroundColor: '#161616' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                      <button onClick={() => setOpen(open === p.name ? null : p.name)} aria-expanded={open === p.name} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', color: '#fff', fontWeight: 700, fontSize: '16px' }}>{p.name}</button>
                      <div style={{ color: '#888', fontSize: '13px', marginTop: 2 }}>
                        <span style={{ color: BLUE, fontWeight: 800 }}>{p.pos}</span>{p.height ? ` · ${p.height}` : ''}{p.age ? ` · age ${p.age}` : ''}{p.plays ? ` · ${p.plays.toLowerCase()}` : ''}
                      </div>
                      <div style={{ color: '#9a9a9a', fontSize: '13px', marginTop: 4, overflowWrap: 'anywhere' }}>{p.statLines[0]}</div>
                    </div>
                    <div style={{ textAlign: 'center', minWidth: 44 }}>
                      <div style={{ color: '#fff', fontWeight: 900, fontSize: '24px', lineHeight: 1 }}>{p.rating ?? '—'}</div>
                      <div style={{ color: '#555', fontSize: '10px', fontWeight: 800, letterSpacing: '0.08em' }}>RATING</div>
                    </div>
                    {myTurn && (confirming === p.name ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button disabled={busy} onClick={() => draft(p.name)} style={btn('#27AE60')}>Confirm pick</button>
                        <button onClick={() => setConfirming(null)} style={btn('#2a2a2a', '#aaa')}>Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirming(p.name)} style={btn(BLUE)}>Draft</button>
                    ))}
                    {isAdmin && !myTurn && (
                      <button onClick={() => post({ action: 'remove', player: p.name })} style={btn('transparent', '#e74c3c', '#4a1919')}>Remove</button>
                    )}
                  </div>
                  {open === p.name && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #2a2a2a', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ color: '#ccc', fontSize: '13px' }}><strong style={{ color: '#888' }}>{p.scouted ? 'IMBA scouting: ' : 'Plays: '}</strong>{p.notes}</div>
                      {p.statLines.map((l, k) => <div key={k} style={{ color: '#9a9a9a', fontSize: '13px' }}>{l}</div>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Recent picks */}
          <div style={{ ...card, padding: '16px', minWidth: 0 }}>
            <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '18px', marginBottom: 12 }}>Recent picks</h2>
            {recent.length === 0 && <div style={{ color: '#666', fontSize: '14px' }}>No picks yet.</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recent.map(p => (
                <div key={p.n} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                  <span style={{ color: BLUE, fontWeight: 900, fontSize: '14px', minWidth: 30, fontVariantNumeric: 'tabular-nums' }}>#{p.n}</span>
                  <div style={{ minWidth: 0 }}>
                    {p.by === 'skip' ? (
                      <div style={{ color: '#9a9a9a', fontWeight: 700, fontSize: '15px' }}>{captainName(p.captainId)} forfeited this pick</div>
                    ) : (<>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>{p.player}</div>
                    <div style={{ color: '#777', fontSize: '12px' }}>to {captainName(p.captainId)}{p.by === 'auto' ? ' · auto-pick' : p.by === 'admin' ? ' · by commissioner' : ''}</div>
                    </>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Commissioner */}
        {isAdmin ? (
          <div style={{ ...card, padding: '18px', border: '1px solid #F5A62366' }}>
            <button onClick={() => setShowAdmin(s => !s)} aria-expanded={showAdmin} style={{ background: 'none', border: 'none', color: '#F5A623', fontWeight: 800, fontSize: '15px', cursor: 'pointer', padding: 0 }}>
              {showAdmin ? '▾' : '▸'} Commissioner controls
            </button>
            {showAdmin && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 14 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {status === 'setup' && <button disabled={busy} onClick={() => post({ action: 'start' })} style={btn('#27AE60')}>Start the draft</button>}
                  {status === 'live' && <button disabled={busy} onClick={() => post({ action: 'pause' })} style={btn('#3a2a00', '#F5A623', '#F5A623')}>Pause</button>}
                  {status === 'paused' && <button disabled={busy} onClick={() => post({ action: 'resume' })} style={btn('#27AE60')}>Resume</button>}
                  {(status === 'live' || status === 'paused') && <button disabled={busy} onClick={() => post({ action: 'restartClock' })} style={btn('#2a2a2a', '#ccc')}>Restart clock</button>}
                  {(status === 'live' || status === 'paused') && <button disabled={busy} onClick={() => post({ action: 'adminPick' })} style={btn('#1a2a4a', BLUE, BLUE)}>Auto-pick best available now</button>}
                  {(status === 'live' || status === 'paused') && <button disabled={busy} onClick={() => { if (confirm('Forfeit the pick that is on the clock?')) post({ action: 'skip' }) }} style={btn('#2a2a2a', '#ccc')}>Forfeit this pick</button>}
                  {state.picks.length > 0 && <button disabled={busy} onClick={() => post({ action: 'undo' })} style={btn('#2a0d0d', '#e74c3c', '#e74c3c')}>Undo last pick</button>}
                  {status !== 'setup' && <button disabled={busy} onClick={() => { if (confirm('Reset the whole draft? All picks will be cleared.')) post({ action: 'reset' }) }} style={btn('transparent', '#e74c3c', '#4a1919')}>Reset draft</button>}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
                  <label style={{ color: '#aaa', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>Seconds per pick
                    <input type="number" min={10} max={600} defaultValue={state.pickSeconds} key={`ps${state.pickSeconds}`} onBlur={e => { const v = Number(e.target.value); if (v && v !== state.pickSeconds) post({ action: 'settings', pickSeconds: v }) }} style={{ ...inputS, width: 80 }} />
                  </label>
                  <label style={{ color: '#aaa', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>Rounds
                    <input type="number" min={1} max={20} defaultValue={state.rounds} key={`r${state.rounds}`} onBlur={e => { const v = Number(e.target.value); if (v && v !== state.rounds) post({ action: 'settings', rounds: v }) }} style={{ ...inputS, width: 70 }} />
                  </label>
                  <label style={{ color: '#aaa', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                    <input type="checkbox" checked={state.snake} disabled={state.picks.length > 0} onChange={e => post({ action: 'settings', snake: e.target.checked })} /> Snake order
                  </label>
                  <label style={{ color: '#aaa', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                    <input type="checkbox" checked={state.autoPick} onChange={e => post({ action: 'settings', autoPick: e.target.checked })} /> Auto-pick when the clock hits 0
                  </label>
                </div>
                <div>
                  <div style={{ color: '#888', fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', marginBottom: 8 }}>CAPTAIN PINS AND PERSONAL LINKS</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {state.captains.map(c => (
                      <div key={c.id} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', color: '#ccc', fontSize: 14 }}>
                        <span style={{ minWidth: 150, fontWeight: 700 }}>{c.name}</span>
                        <code style={{ color: '#fff', backgroundColor: '#111', border: '1px solid #333', borderRadius: 6, padding: '3px 8px' }}>{data?.pins?.[c.id] ?? '----'}</code>
                        <button onClick={async () => { const url = `${window.location.origin}/draft?c=${c.id}&k=${data?.pins?.[c.id]}`; try { await navigator.clipboard.writeText(url); flash(`Link copied for ${c.name}.`) } catch { flash(url, true) } }} style={btn('#1a2a4a', BLUE, BLUE)}>Copy sign-in link</button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => { if (confirm('Generate new PINs? Old links stop working.')) post({ action: 'regeneratePins' }) }} style={{ ...btn('transparent', '#888', '#333'), marginTop: 10 }}>Generate new PINs</button>
                </div>
                {state.removed.length > 0 && (
                  <div>
                    <div style={{ color: '#888', fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', marginBottom: 8 }}>REMOVED FROM THE POOL</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {state.removed.map(nm => <button key={nm} onClick={() => post({ action: 'restore', player: nm })} style={btn('#111', '#ccc', '#333')}>{nm} · put back</button>)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <a href="/admin/login" style={{ color: '#444', fontSize: 12 }}>Commissioner login</a>
          </div>
        )}
      </div>
    </div>
  )
}
