'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'

interface Team { id: string; name: string; color: string }
interface Player { id: string; name: string; number: number; position: string; teamId: string; isSub: boolean }
interface Game {
  id: string; homeTeam: Team; awayTeam: Team; homeTeamId: string; awayTeamId: string
  date: string; week: number; played: boolean; homeScore: number | null; awayScore: number | null
  season: string; league: string
}
interface StatRow {
  playerId: string; gameId: string; teamId: string
  points: number; assists: number; rebounds: number; steals: number; blocks: number
  twoPtMade: number; threeMade: number; ftMade: number; fouls: number
}
interface SubEntry {
  name: string; teamId: string
  points: number; assists: number; rebounds: number; steals: number; blocks: number
  twoPtMade: number; threeMade: number; ftMade: number; fouls: number
}

const calcPoints = (s: Pick<StatRow, 'twoPtMade' | 'threeMade' | 'ftMade'>) =>
  s.twoPtMade * 2 + s.threeMade * 3 + s.ftMade

const EMPTY_STAT = (playerId: string, gameId: string, teamId: string): StatRow => ({
  playerId, gameId, teamId, points: 0, assists: 0, rebounds: 0, steals: 0, blocks: 0,
  twoPtMade: 0, threeMade: 0, ftMade: 0, fouls: 0,
})
const EMPTY_SUB = (teamId: string): SubEntry => ({
  name: '', teamId, points: 0, assists: 0, rebounds: 0, steals: 0, blocks: 0,
  twoPtMade: 0, threeMade: 0, ftMade: 0, fouls: 0,
})

const inputS: React.CSSProperties = {
  backgroundColor: '#0d0d0d', color: '#fff', border: '1px solid #222',
  borderRadius: '4px', padding: '4px 2px', fontSize: '13px', textAlign: 'center', outline: 'none',
}

export default function AdminStatsPage() {
  const [seasons, setSeasons] = useState<string[]>([])
  const [selectedSeason, setSelectedSeason] = useState('')
  const [seasonGames, setSeasonGames] = useState<Game[]>([])
  const [expandedGame, setExpandedGame] = useState<string | null>(null)
  const [gamePlayers, setGamePlayers] = useState<Record<string, Record<string, Player[]>>>({})
  const [statsMap, setStatsMap] = useState<Record<string, Record<string, StatRow>>>({})
  const [subsMap, setSubsMap] = useState<Record<string, Record<string, SubEntry[]>>>({})
  const [scoreMap, setScoreMap] = useState<Record<string, { home: string; away: string }>>({})
  const [dnpMap, setDnpMap] = useState<Record<string, Record<string, boolean>>>({})
  const [savingGame, setSavingGame] = useState<string | null>(null)
  const [gameMsg, setGameMsg] = useState<Record<string, string>>({})
  const [loadingSeasons, setLoadingSeasons] = useState(true)
  const [loadingGames, setLoadingGames] = useState(false)
  const [loadingStats, setLoadingStats] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/seasons')
      .then(r => r.json())
      .then(s => {
        const list: string[] = Array.isArray(s) ? s.map((x: any) => x.season ?? x).filter(Boolean) : []
        setSeasons(list)
        setLoadingSeasons(false)
      })
  }, [])

  useEffect(() => {
    if (!selectedSeason) { setSeasonGames([]); return }
    setLoadingGames(true)
    setExpandedGame(null)
    setStatsMap({})
    setSubsMap({})
    setGamePlayers({})
    setScoreMap({})
    setDnpMap({})
    fetch(`/api/admin/games?season=${encodeURIComponent(selectedSeason)}`)
      .then(r => r.json())
      .then((g: Game[]) => {
        setSeasonGames(Array.isArray(g) ? g : [])
        setLoadingGames(false)
      })
  }, [selectedSeason])

  const openGame = async (game: Game) => {
    if (expandedGame === game.id) { setExpandedGame(null); return }
    setExpandedGame(game.id)

    // Init score fields from existing game data
    if (!scoreMap[game.id]) {
      setScoreMap(prev => ({ ...prev, [game.id]: {
        home: game.homeScore !== null ? String(game.homeScore) : '',
        away: game.awayScore !== null ? String(game.awayScore) : '',
      }}))
    }

    if (statsMap[game.id]) return
    setLoadingStats(game.id)

    const enc = encodeURIComponent(game.season)
    const [homeRes, awayRes, statsRes] = await Promise.all([
      fetch(`/api/admin/season-players?season=${enc}&teamId=${game.homeTeamId}`).then(r => r.json()),
      fetch(`/api/admin/season-players?season=${enc}&teamId=${game.awayTeamId}`).then(r => r.json()),
      fetch(`/api/admin/stats?gameId=${game.id}`).then(r => r.json()),
    ])

    setGamePlayers(prev => ({
      ...prev,
      [game.id]: {
        [game.homeTeamId]: homeRes.players ?? [],
        [game.awayTeamId]: awayRes.players ?? [],
      }
    }))

    const map: Record<string, StatRow> = {}
    const subsByTeam: Record<string, SubEntry[]> = {}
    const loadedDnp: Record<string, boolean> = {}
    ;(statsRes as any[]).forEach((s: any) => {
      if (s.player?.isSub) {
        if (!subsByTeam[s.teamId]) subsByTeam[s.teamId] = []
        subsByTeam[s.teamId].push({
          name: s.player.name, teamId: s.teamId,
          points: s.points, assists: s.assists, rebounds: s.rebounds,
          steals: s.steals, blocks: s.blocks,
          twoPtMade: s.twoPtMade, threeMade: s.threeMade, ftMade: s.ftMade, fouls: s.fouls ?? 0,
        })
      } else {
        map[s.playerId] = {
          playerId: s.playerId, gameId: s.gameId, teamId: s.teamId,
          points: s.points, assists: s.assists, rebounds: s.rebounds,
          steals: s.steals, blocks: s.blocks,
          twoPtMade: s.twoPtMade, threeMade: s.threeMade, ftMade: s.ftMade, fouls: s.fouls ?? 0,
        }
        // Restore DNP: a saved all-zero row means the player was marked DNP
        const isAllZero = s.points === 0 && s.assists === 0 && s.rebounds === 0 &&
          s.steals === 0 && s.blocks === 0 && s.twoPtMade === 0 &&
          s.threeMade === 0 && s.ftMade === 0 && s.fouls === 0
        if (isAllZero) loadedDnp[s.playerId] = true
      }
    })
    setStatsMap(prev => ({ ...prev, [game.id]: map }))
    setSubsMap(prev => ({ ...prev, [game.id]: subsByTeam }))
    setDnpMap(prev => ({ ...prev, [game.id]: { ...(prev[game.id] ?? {}), ...loadedDnp } }))
    setLoadingStats(null)
  }

  const getOrInit = (gameId: string, playerId: string, teamId: string): StatRow =>
    (statsMap[gameId] ?? {})[playerId] ?? EMPTY_STAT(playerId, gameId, teamId)

  const updateStat = (gameId: string, playerId: string, teamId: string, field: keyof StatRow, val: number) => {
    const current = getOrInit(gameId, playerId, teamId)
    const updated = { ...current, [field]: val }
    if (field === 'twoPtMade' || field === 'threeMade' || field === 'ftMade') {
      updated.points = calcPoints(updated)
    }
    setStatsMap(prev => ({ ...prev, [gameId]: { ...(prev[gameId] ?? {}), [playerId]: updated } }))
  }

  const updateSubField = (gameId: string, teamId: string, idx: number, field: keyof SubEntry, val: number | string) => {
    setSubsMap(prev => {
      const g = { ...(prev[gameId] ?? {}) }
      const arr = [...(g[teamId] ?? [])]
      const updated = { ...arr[idx], [field]: val }
      if (field === 'twoPtMade' || field === 'threeMade' || field === 'ftMade') {
        updated.points = calcPoints(updated as SubEntry)
      }
      arr[idx] = updated
      return { ...prev, [gameId]: { ...g, [teamId]: arr } }
    })
  }

  const toggleDnp = (gameId: string, playerId: string, teamId: string) => {
    const currentDnp = dnpMap[gameId]?.[playerId] ?? false
    const newDnp = !currentDnp
    // Update DNP map
    setDnpMap(prev => ({
      ...prev,
      [gameId]: { ...(prev[gameId] ?? {}), [playerId]: newDnp },
    }))
    // Clear stats separately when marking DNP
    if (newDnp) {
      setStatsMap(prev => ({
        ...prev,
        [gameId]: { ...(prev[gameId] ?? {}), [playerId]: EMPTY_STAT(playerId, gameId, teamId) },
      }))
    }
  }

  const addSub = (gameId: string, teamId: string) => {
    setSubsMap(prev => {
      const g = { ...(prev[gameId] ?? {}) }
      return { ...prev, [gameId]: { ...g, [teamId]: [...(g[teamId] ?? []), EMPTY_SUB(teamId)] } }
    })
  }

  const removeSub = (gameId: string, teamId: string, idx: number) => {
    setSubsMap(prev => {
      const g = { ...(prev[gameId] ?? {}) }
      const arr = [...(g[teamId] ?? [])]
      arr.splice(idx, 1)
      return { ...prev, [gameId]: { ...g, [teamId]: arr } }
    })
  }

  const saveStats = async (game: Game) => {
    setSavingGame(game.id)
    setGameMsg(prev => ({ ...prev, [game.id]: '' }))
    try {
      const scores = scoreMap[game.id] ?? { home: '', away: '' }
      const homeScore = scores.home !== '' ? parseInt(scores.home) : null
      const awayScore = scores.away !== '' ? parseInt(scores.away) : null

      // Save score + mark played if both scores entered
      if (homeScore !== null && awayScore !== null) {
        await fetch(`/api/games/${game.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ homeScore, awayScore, played: true }),
        })
        // Update local game list so badge appears
        setSeasonGames(prev => prev.map(g => g.id === game.id ? { ...g, homeScore, awayScore, played: true } : g))
      }

      // Build stat rows — include DNP players as all-zeros so state persists on reload
      const dnp = dnpMap[game.id] ?? {}
      const allRosteredPlayers = [
        ...(gamePlayers[game.id]?.[game.homeTeamId] ?? []),
        ...(gamePlayers[game.id]?.[game.awayTeamId] ?? []),
      ]
      // Ensure every rostered player has a stat row (DNP = all zeros)
      const fullStatsMap = { ...(statsMap[game.id] ?? {}) }
      for (const p of allRosteredPlayers) {
        if (!fullStatsMap[p.id]) {
          fullStatsMap[p.id] = EMPTY_STAT(p.id, game.id, p.teamId)
        }
      }
      const gameStats = Object.values(fullStatsMap)
        .filter(s => s.gameId === game.id)

      // Create sub players and build their stat rows
      const subStatRows: any[] = []
      for (const [teamId, subList] of Object.entries(subsMap[game.id] ?? {})) {
        for (const sub of subList) {
          if (!sub.name.trim()) continue
          const res = await fetch('/api/admin/players', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: sub.name.trim(), number: 0, position: 'G', teamId, isSub: true }),
          })
          if (!res.ok) continue
          const p = await res.json()
          subStatRows.push({
            playerId: p.id, gameId: game.id, teamId,
            points: sub.points, assists: sub.assists, rebounds: sub.rebounds,
            steals: sub.steals, blocks: sub.blocks, fouls: sub.fouls,
            turnovers: 0, twoPtMade: sub.twoPtMade, twoPtAtt: 0,
            threeMade: sub.threeMade, threeAtt: 0, ftMade: sub.ftMade, ftAtt: 0,
          })
        }
      }

      // Pad with zero attempt/TO fields for API compatibility (we only track made)
      const paddedStats = gameStats.map(s => ({
        ...s, turnovers: 0, twoPtAtt: 0, threeAtt: 0, ftAtt: 0,
      }))

      const saveRes = await fetch('/api/admin/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stats: [...paddedStats, ...subStatRows] }),
      })
      setGameMsg(prev => ({ ...prev, [game.id]: saveRes.ok ? '✓ Saved!' : '✗ Error saving.' }))
    } catch {
      setGameMsg(prev => ({ ...prev, [game.id]: '✗ Error saving.' }))
    }
    setSavingGame(null)
    setTimeout(() => setGameMsg(prev => ({ ...prev, [game.id]: '' })), 4000)
  }

  const numInput = (val: number, onChange: (v: number) => void) => (
    <input type="number" min="0" value={val} onChange={e => onChange(parseInt(e.target.value) || 0)}
      style={{ ...inputS, width: '42px' }} />
  )

  const STAT_COLS: { key: keyof StatRow; label: string }[] = [
    { key: 'assists',   label: 'AST' },
    { key: 'rebounds',  label: 'REB' },
    { key: 'steals',    label: 'STL' },
    { key: 'blocks',    label: 'BLK' },
    { key: 'fouls',     label: 'PF'  },
    { key: 'twoPtMade', label: '2PM' },
    { key: 'threeMade', label: '3PM' },
    { key: 'ftMade',    label: 'FTM' },
  ]

  return (
    <AdminLayout>
      <div style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ color: '#fff', fontSize: '26px', fontWeight: 900 }}>Enter Game Stats</h1>
          <p style={{ color: '#555', fontSize: '14px' }}>Score + stats in one place. Mark players as DNP if they didn&apos;t play.</p>
        </div>

        {/* Season selector */}
        <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <label style={{ color: '#999', fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Select Season</label>
          {loadingSeasons ? <div style={{ color: '#555', fontSize: '14px' }}>Loading seasons...</div> : (
            <select value={selectedSeason} onChange={e => setSelectedSeason(e.target.value)}
              style={{ backgroundColor: '#111', color: '#fff', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '10px 14px', fontSize: '15px', outline: 'none', cursor: 'pointer', minWidth: '300px' }}>
              <option value="">-- Select a season --</option>
              {seasons.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>

        {/* Games list */}
        {selectedSeason && (
          loadingGames ? <div style={{ color: '#555', fontSize: '14px', padding: '20px 0' }}>Loading games...</div>
          : seasonGames.length === 0 ? (
            <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '32px', textAlign: 'center', color: '#555', fontSize: '14px' }}>
              No games found for this season.
            </div>
          ) : (
            <div>
              <div style={{ color: '#555', fontSize: '13px', marginBottom: '12px' }}>
                {seasonGames.length} game{seasonGames.length !== 1 ? 's' : ''} — click to enter score &amp; stats
              </div>

              {seasonGames.map(game => {
                const isOpen = expandedGame === game.id
                const isLoadingThis = loadingStats === game.id
                const msg = gameMsg[game.id] ?? ''
                const hasStats = Object.keys(statsMap[game.id] ?? {}).length > 0
                const dateStr = new Date(game.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                const gameRosters = gamePlayers[game.id] ?? {}
                const scores = scoreMap[game.id] ?? { home: '', away: '' }
                const dnp = dnpMap[game.id] ?? {}

                return (
                  <div key={game.id} style={{ backgroundColor: '#1a1a1a', border: `1px solid ${isOpen ? '#3a5a3a' : '#2a2a2a'}`, borderRadius: '12px', marginBottom: '10px', overflow: 'hidden' }}>

                    {/* Collapsed row */}
                    <button onClick={() => openGame(game)}
                      style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', textAlign: 'left' }}>
                      <span style={{ color: '#444', fontSize: '12px', fontWeight: 700, minWidth: '50px' }}>Wk {game.week}</span>
                      <span style={{ color: '#888', fontSize: '13px', minWidth: '100px' }}>{dateStr}</span>
                      <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px', flex: 1 }}>
                        {game.homeTeam?.name}
                        <span style={{ color: game.played ? '#27AE60' : '#555', margin: '0 8px' }}>
                          {game.played ? `${game.homeScore}–${game.awayScore}` : 'vs'}
                        </span>
                        {game.awayTeam?.name}
                      </span>
                      {game.played && <span style={{ color: '#27AE60', fontSize: '10px', fontWeight: 700, backgroundColor: '#0a3a1a', border: '1px solid #27AE60', borderRadius: '4px', padding: '2px 8px' }}>FINAL</span>}
                      {hasStats && <span style={{ color: '#4A9FE3', fontSize: '10px', fontWeight: 700, backgroundColor: '#0a1a3a', border: '1px solid #4A9FE3', borderRadius: '4px', padding: '2px 8px' }}>STATS IN</span>}
                      <span style={{ color: '#555', fontSize: '18px', lineHeight: 1 }}>{isOpen ? '▲' : '▼'}</span>
                    </button>

                    {/* Expanded panel */}
                    {isOpen && (
                      <div style={{ borderTop: '1px solid #2a2a2a' }}>
                        {isLoadingThis ? (
                          <div style={{ padding: '24px', color: '#555', fontSize: '14px' }}>Loading roster &amp; stats...</div>
                        ) : (
                          <div style={{ padding: '20px' }}>

                            {/* ── Score entry ── */}
                            <div style={{ backgroundColor: '#111', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                              <span style={{ color: '#888', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Final Score</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ color: game.homeTeam.color, fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>{game.homeTeam.name}</div>
                                  <input type="number" min="0" value={scores.home}
                                    onChange={e => setScoreMap(prev => ({ ...prev, [game.id]: { ...scores, home: e.target.value } }))}
                                    placeholder="—"
                                    style={{ ...inputS, width: '56px', fontSize: '20px', fontWeight: 900, padding: '6px 4px', color: '#4A9FE3' }} />
                                </div>
                                <span style={{ color: '#333', fontSize: '20px', fontWeight: 700 }}>–</span>
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ color: game.awayTeam.color, fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>{game.awayTeam.name}</div>
                                  <input type="number" min="0" value={scores.away}
                                    onChange={e => setScoreMap(prev => ({ ...prev, [game.id]: { ...scores, away: e.target.value } }))}
                                    placeholder="—"
                                    style={{ ...inputS, width: '56px', fontSize: '20px', fontWeight: 900, padding: '6px 4px', color: '#4A9FE3' }} />
                                </div>
                              </div>
                              {game.played && <span style={{ color: '#27AE60', fontSize: '12px', fontWeight: 700 }}>✓ Marked as Final</span>}
                              {!game.played && scores.home && scores.away && <span style={{ color: '#F5A623', fontSize: '12px' }}>Will be marked Final on save</span>}
                            </div>

                            {/* ── Player stats ── */}
                            {[game.homeTeamId, game.awayTeamId].map(teamId => {
                              const team = teamId === game.homeTeamId ? game.homeTeam : game.awayTeam
                              const teamPlayers = gameRosters[teamId] ?? []
                              const teamSubs = (subsMap[game.id] ?? {})[teamId] ?? []

                              return (
                                <div key={teamId} style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a', borderRadius: '10px', marginBottom: '16px', overflow: 'hidden' }}>
                                  <div style={{ backgroundColor: team.color + '22', borderBottom: `2px solid ${team.color}`, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '10px', height: '10px', backgroundColor: team.color, borderRadius: '50%' }} />
                                    <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '15px', margin: 0 }}>{team.name}</h3>
                                    <span style={{ color: '#555', fontSize: '12px' }}>{teamPlayers.length} player{teamPlayers.length !== 1 ? 's' : ''}</span>
                                  </div>

                                  {teamPlayers.length === 0 ? (
                                    <div style={{ padding: '16px 18px', color: '#666', fontSize: '13px' }}>
                                      No players for this team in {game.season}. Add them via Subs below.
                                    </div>
                                  ) : (
                                    <div style={{ overflowX: 'auto' }}>
                                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                                        <thead>
                                          <tr style={{ backgroundColor: '#0d0d0d', borderBottom: '1px solid #333' }}>
                                            <th style={{ padding: '9px 12px', textAlign: 'left', color: '#555', fontWeight: 700, fontSize: '11px' }}>Player</th>
                                            <th style={{ padding: '9px 6px', textAlign: 'center', color: '#27AE60', fontWeight: 700, fontSize: '11px' }}>PTS</th>
                                            {STAT_COLS.map(c => (
                                              <th key={c.key} style={{ padding: '9px 6px', textAlign: 'center', color: '#555', fontWeight: 700, fontSize: '11px' }}>{c.label}</th>
                                            ))}
                                            <th style={{ padding: '9px 6px', textAlign: 'center', color: '#555', fontWeight: 700, fontSize: '11px' }}>DNP</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {teamPlayers.map((player, i) => {
                                            const s = getOrInit(game.id, player.id, teamId)
                                            const u = (field: keyof StatRow) => (v: number) => updateStat(game.id, player.id, teamId, field, v)
                                            const isDnp = !!dnp[player.id]
                                            return (
                                              <tr key={player.id} style={{ backgroundColor: isDnp ? '#0d0d0d' : i % 2 === 0 ? '#141414' : '#111', borderBottom: '1px solid #1e1e1e', opacity: isDnp ? 0.5 : 1 }}>
                                                <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                                                  <span style={{ color: team.color, fontWeight: 700, marginRight: '6px', fontSize: '12px' }}>#{player.number}</span>
                                                  <span style={{ color: '#ccc', fontSize: '13px' }}>{player.name}</span>
                                                  <span style={{ color: '#444', fontSize: '11px', marginLeft: '6px' }}>{player.position}</span>
                                                </td>
                                                {/* PTS — auto-calculated */}
                                                <td style={{ padding: '7px 6px', textAlign: 'center' }}>
                                                  {isDnp ? <span style={{ color: '#333', fontSize: '12px' }}>—</span>
                                                    : <span style={{ display: 'inline-block', width: '42px', backgroundColor: '#1a2a1a', color: '#27AE60', border: '1px solid #27AE6044', borderRadius: '4px', padding: '4px 2px', fontSize: '13px', fontWeight: 700, textAlign: 'center' }}>{s.points}</span>}
                                                </td>
                                                {STAT_COLS.map(c => (
                                                  <td key={c.key} style={{ padding: '7px 4px', textAlign: 'center' }}>
                                                    {isDnp ? <span style={{ color: '#333', fontSize: '12px' }}>—</span> : numInput(s[c.key] as number, u(c.key))}
                                                  </td>
                                                ))}
                                                <td style={{ padding: '7px 6px', textAlign: 'center' }}>
                                                  <button onClick={() => toggleDnp(game.id, player.id, teamId)}
                                                    style={{ backgroundColor: isDnp ? '#3a1a1a' : '#1e1e1e', color: isDnp ? '#e74c3c' : '#555', border: `1px solid ${isDnp ? '#e74c3c44' : '#2a2a2a'}`, borderRadius: '4px', padding: '3px 8px', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}>
                                                    {isDnp ? 'DNP ✓' : 'DNP'}
                                                  </button>
                                                </td>
                                              </tr>
                                            )
                                          })}
                                        </tbody>
                                        {/* Totals row */}
                                        {teamPlayers.length > 0 && (() => {
                                          const activePlayers = teamPlayers.filter(p => !dnp[p.id])
                                          const totals = activePlayers.reduce((acc, p) => {
                                            const s = getOrInit(game.id, p.id, teamId)
                                            acc.points   += s.points
                                            acc.assists  += s.assists
                                            acc.rebounds += s.rebounds
                                            acc.steals   += s.steals
                                            acc.blocks   += s.blocks
                                            acc.fouls    += s.fouls
                                            acc.twoPtMade += s.twoPtMade
                                            acc.threeMade += s.threeMade
                                            acc.ftMade   += s.ftMade
                                            return acc
                                          }, { points: 0, assists: 0, rebounds: 0, steals: 0, blocks: 0, fouls: 0, twoPtMade: 0, threeMade: 0, ftMade: 0 })
                                          const cellStyle: React.CSSProperties = { padding: '9px 4px', textAlign: 'center', color: '#fff', fontSize: '13px', fontWeight: 800 }
                                          return (
                                            <tfoot>
                                              <tr style={{ backgroundColor: '#0a1a0a', borderTop: `2px solid ${team.color}55` }}>
                                                <td style={{ padding: '9px 12px', color: '#888', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Totals</td>
                                                <td style={{ ...cellStyle, color: '#27AE60' }}>{totals.points}</td>
                                                {STAT_COLS.map(c => (
                                                  <td key={c.key} style={cellStyle}>{totals[c.key as keyof typeof totals]}</td>
                                                ))}
                                                <td />
                                              </tr>
                                            </tfoot>
                                          )
                                        })()}
                                      </table>
                                    </div>
                                  )}

                                  {/* Subs */}
                                  <div style={{ borderTop: '1px dashed #222', padding: '12px 18px', backgroundColor: '#0d0d0d' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: teamSubs.length > 0 ? '10px' : '0' }}>
                                      <span style={{ color: '#F5A623', fontSize: '11px', fontWeight: 700 }}>SUBSTITUTES</span>
                                      <span style={{ color: '#444', fontSize: '11px' }}>Hidden from leaderboards</span>
                                      <button onClick={() => addSub(game.id, teamId)}
                                        style={{ marginLeft: 'auto', backgroundColor: '#1a2a00', border: '1px solid #3a5a00', color: '#8dc63f', fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '6px', cursor: 'pointer' }}>
                                        + Add Sub
                                      </button>
                                    </div>
                                    {teamSubs.length > 0 && (
                                      <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                                          <thead>
                                            <tr style={{ backgroundColor: '#0a0a0a' }}>
                                              <th style={{ padding: '7px', textAlign: 'left', color: '#444', fontSize: '11px', fontWeight: 700 }}>Sub Name</th>
                                              <th style={{ padding: '7px 4px', textAlign: 'center', color: '#27AE60', fontSize: '11px', fontWeight: 700 }}>PTS</th>
                                              {STAT_COLS.map(c => (
                                                <th key={c.key} style={{ padding: '7px 4px', textAlign: 'center', color: '#444', fontSize: '11px', fontWeight: 700 }}>{c.label}</th>
                                              ))}
                                              <th style={{ width: '30px' }} />
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {teamSubs.map((sub, idx) => {
                                              const u = (field: keyof SubEntry) => (v: number) => updateSubField(game.id, teamId, idx, field, v)
                                              return (
                                                <tr key={idx} style={{ borderBottom: '1px solid #1a1a1a' }}>
                                                  <td style={{ padding: '5px 6px' }}>
                                                    <input value={sub.name} onChange={e => updateSubField(game.id, teamId, idx, 'name', e.target.value)}
                                                      placeholder="Player name..."
                                                      style={{ width: '130px', backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: '4px', padding: '4px 7px', fontSize: '12px', outline: 'none' }} />
                                                  </td>
                                                  <td style={{ padding: '5px 6px', textAlign: 'center' }}>
                                                    <span style={{ display: 'inline-block', width: '38px', backgroundColor: '#1a2a1a', color: '#27AE60', border: '1px solid #27AE6044', borderRadius: '4px', padding: '3px 2px', fontSize: '12px', fontWeight: 700, textAlign: 'center' }}>{sub.points}</span>
                                                  </td>
                                                  {STAT_COLS.map(c => (
                                                    <td key={c.key} style={{ padding: '5px 4px', textAlign: 'center' }}>
                                                      {numInput(sub[c.key as keyof SubEntry] as number, u(c.key as keyof SubEntry))}
                                                    </td>
                                                  ))}
                                                  <td style={{ padding: '5px 4px', textAlign: 'center' }}>
                                                    <button onClick={() => removeSub(game.id, teamId, idx)}
                                                      style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '16px' }}>×</button>
                                                  </td>
                                                </tr>
                                              )
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            })}

                            {/* Save */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
                              <button onClick={() => saveStats(game)} disabled={savingGame === game.id}
                                style={{ backgroundColor: savingGame === game.id ? '#2a2a2a' : '#27AE60', color: '#fff', fontWeight: 700, fontSize: '14px', padding: '12px 32px', borderRadius: '8px', border: 'none', cursor: savingGame === game.id ? 'not-allowed' : 'pointer' }}>
                                {savingGame === game.id ? 'Saving...' : `Save — ${game.homeTeam?.name} vs ${game.awayTeam?.name}`}
                              </button>
                              {msg && <span style={{ color: msg.includes('✗') ? '#e74c3c' : '#27AE60', fontSize: '14px', fontWeight: 700 }}>{msg}</span>}
                            </div>

                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        )}
      </div>
    </AdminLayout>
  )
}
