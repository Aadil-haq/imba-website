'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'

interface Team { id: string; name: string; color: string }
interface Player { id: string; name: string; number: number; position: string; teamId: string; team: Team; isSub: boolean }
interface Game {
  id: string; homeTeam: Team; awayTeam: Team; homeTeamId: string; awayTeamId: string
  date: string; week: number; played: boolean; homeScore: number | null; awayScore: number | null
  season: string; league: string
}
interface StatRow {
  playerId: string; gameId: string; teamId: string
  points: number; rebounds: number; assists: number; steals: number; blocks: number; turnovers: number
  twoPtMade: number; twoPtAtt: number; threeMade: number; threeAtt: number; ftMade: number; ftAtt: number
}
interface SubEntry {
  name: string; teamId: string
  points: number; rebounds: number; assists: number; steals: number; blocks: number; turnovers: number
  twoPtMade: number; twoPtAtt: number; threeMade: number; threeAtt: number; ftMade: number; ftAtt: number
}

const EMPTY_STAT = (playerId: string, gameId: string, teamId: string): StatRow => ({
  playerId, gameId, teamId,
  points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0,
  twoPtMade: 0, twoPtAtt: 0, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0,
})
const EMPTY_SUB = (teamId: string): SubEntry => ({
  name: '', teamId,
  points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0,
  twoPtMade: 0, twoPtAtt: 0, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0,
})

export default function AdminStatsPage() {
  const [seasons, setSeasons] = useState<string[]>([])
  const [selectedSeason, setSelectedSeason] = useState('')
  const [seasonGames, setSeasonGames] = useState<Game[]>([])
  const [expandedGame, setExpandedGame] = useState<string | null>(null)

  // season-specific players: { gameId: { teamId: Player[] } }
  const [gamePlayers, setGamePlayers] = useState<Record<string, Record<string, Player[]>>>({})
  // per-game stats: { gameId: { playerId: StatRow } }
  const [statsMap, setStatsMap] = useState<Record<string, Record<string, StatRow>>>({})
  // per-game subs: { gameId: { teamId: SubEntry[] } }
  const [subsMap, setSubsMap] = useState<Record<string, Record<string, SubEntry[]>>>({})
  // per-game save state
  const [savingGame, setSavingGame] = useState<string | null>(null)
  const [gameMsg, setGameMsg] = useState<Record<string, string>>({})
  // loading states
  const [loadingSeasons, setLoadingSeasons] = useState(true)
  const [loadingGames, setLoadingGames] = useState(false)
  const [loadingStats, setLoadingStats] = useState<string | null>(null)

  // Load seasons once
  useEffect(() => {
    fetch('/api/admin/seasons')
      .then(r => r.json())
      .then(s => {
        const list: string[] = Array.isArray(s)
          ? s.map((x: any) => x.season ?? x).filter(Boolean)
          : []
        setSeasons(list)
        setLoadingSeasons(false)
      })
  }, [])

  // Load games when season changes
  useEffect(() => {
    if (!selectedSeason) { setSeasonGames([]); return }
    setLoadingGames(true)
    setExpandedGame(null)
    setStatsMap({})
    setSubsMap({})
    setGamePlayers({})
    const enc = encodeURIComponent(selectedSeason)
    fetch(`/api/admin/games?season=${enc}`)
      .then(r => r.json())
      .then((g: Game[]) => {
        const played = Array.isArray(g) ? g.filter(gm => gm.played) : []
        setSeasonGames(played)
        setLoadingGames(false)
      })
  }, [selectedSeason])

  // Expand / collapse a game — load season-specific players + existing stats
  const openGame = async (game: Game) => {
    if (expandedGame === game.id) { setExpandedGame(null); return }
    setExpandedGame(game.id)
    if (statsMap[game.id]) return // already loaded

    setLoadingStats(game.id)

    const seasonEnc = encodeURIComponent(game.season)

    // Fetch season-specific players for both teams + existing stats in parallel
    const [homeRes, awayRes, statsRes] = await Promise.all([
      fetch(`/api/admin/season-players?season=${seasonEnc}&teamId=${game.homeTeamId}`).then(r => r.json()),
      fetch(`/api/admin/season-players?season=${seasonEnc}&teamId=${game.awayTeamId}`).then(r => r.json()),
      fetch(`/api/admin/stats?gameId=${game.id}`).then(r => r.json()),
    ])

    // Store season-specific rosters
    setGamePlayers(prev => ({
      ...prev,
      [game.id]: {
        [game.homeTeamId]: homeRes.players ?? [],
        [game.awayTeamId]: awayRes.players ?? [],
      }
    }))

    // Parse existing stats
    const map: Record<string, StatRow> = {}
    const subsByTeam: Record<string, SubEntry[]> = {}
    ;(statsRes as any[]).forEach((s: any) => {
      if (s.player?.isSub) {
        if (!subsByTeam[s.teamId]) subsByTeam[s.teamId] = []
        subsByTeam[s.teamId].push({
          name: s.player.name, teamId: s.teamId,
          points: s.points, rebounds: s.rebounds, assists: s.assists,
          steals: s.steals, blocks: s.blocks, turnovers: s.turnovers,
          twoPtMade: s.twoPtMade, twoPtAtt: s.twoPtAtt,
          threeMade: s.threeMade, threeAtt: s.threeAtt,
          ftMade: s.ftMade, ftAtt: s.ftAtt,
        })
      } else {
        map[s.playerId] = {
          playerId: s.playerId, gameId: s.gameId, teamId: s.teamId,
          points: s.points, rebounds: s.rebounds, assists: s.assists,
          steals: s.steals, blocks: s.blocks, turnovers: s.turnovers,
          twoPtMade: s.twoPtMade, twoPtAtt: s.twoPtAtt,
          threeMade: s.threeMade, threeAtt: s.threeAtt,
          ftMade: s.ftMade, ftAtt: s.ftAtt,
        }
      }
    })
    setStatsMap(prev => ({ ...prev, [game.id]: map }))
    setSubsMap(prev => ({ ...prev, [game.id]: subsByTeam }))
    setLoadingStats(null)
  }

  const getOrInit = (gameId: string, playerId: string, teamId: string): StatRow =>
    (statsMap[gameId] ?? {})[playerId] ?? EMPTY_STAT(playerId, gameId, teamId)

  const updateStat = (gameId: string, playerId: string, teamId: string, field: keyof StatRow, val: number) => {
    const current = getOrInit(gameId, playerId, teamId)
    setStatsMap(prev => ({
      ...prev,
      [gameId]: { ...(prev[gameId] ?? {}), [playerId]: { ...current, [field]: val } }
    }))
  }

  const updateSub = (gameId: string, teamId: string, idx: number, field: keyof SubEntry, val: string | number) => {
    setSubsMap(prev => {
      const g = { ...(prev[gameId] ?? {}) }
      const arr = [...(g[teamId] ?? [])]
      arr[idx] = { ...arr[idx], [field]: val }
      return { ...prev, [gameId]: { ...g, [teamId]: arr } }
    })
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
      const gameStats = Object.values(statsMap[game.id] ?? {}).filter(s => s.gameId === game.id)
      const subStatRows: StatRow[] = []
      for (const [teamId, subList] of Object.entries(subsMap[game.id] ?? {})) {
        for (const sub of subList) {
          if (!sub.name.trim()) continue
          const res = await fetch('/api/admin/players', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: sub.name.trim(), number: 0, position: 'G', teamId, isSub: true }),
          })
          if (!res.ok) continue
          const newPlayer = await res.json()
          subStatRows.push({
            playerId: newPlayer.id, gameId: game.id, teamId,
            points: sub.points, rebounds: sub.rebounds, assists: sub.assists,
            steals: sub.steals, blocks: sub.blocks, turnovers: sub.turnovers,
            twoPtMade: sub.twoPtMade, twoPtAtt: sub.twoPtAtt,
            threeMade: sub.threeMade, threeAtt: sub.threeAtt,
            ftMade: sub.ftMade, ftAtt: sub.ftAtt,
          })
        }
      }
      const allStats = [...gameStats, ...subStatRows]
      const saveRes = await fetch('/api/admin/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stats: allStats }),
      })
      setGameMsg(prev => ({ ...prev, [game.id]: saveRes.ok ? '✓ Saved!' : '✗ Error saving.' }))
    } catch {
      setGameMsg(prev => ({ ...prev, [game.id]: '✗ Error saving.' }))
    }
    setSavingGame(null)
    setTimeout(() => setGameMsg(prev => ({ ...prev, [game.id]: '' })), 4000)
  }

  const cellInput = (val: number, onChange: (v: number) => void, w = '42px') => (
    <input
      type="number" min="0" value={val}
      onChange={e => onChange(parseInt(e.target.value) || 0)}
      style={{ width: w, backgroundColor: '#0d0d0d', color: '#fff', border: '1px solid #222', borderRadius: '4px', padding: '4px 2px', fontSize: '13px', textAlign: 'center', outline: 'none' }}
    />
  )

  const headers = ['Player', 'PTS', 'REB', 'AST', 'STL', 'BLK', 'TO', '2PM', '2PA', '3PM', '3PA', 'FTM', 'FTA']

  return (
    <AdminLayout>
      <div style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ color: '#fff', fontSize: '26px', fontWeight: 900 }}>Enter Game Stats</h1>
          <p style={{ color: '#555', fontSize: '14px' }}>
            Pick a season — only players who played in that season appear for each team.
          </p>
        </div>

        {/* Season selector */}
        <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <label style={{ color: '#999', fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Select Season</label>
          {loadingSeasons ? (
            <div style={{ color: '#555', fontSize: '14px' }}>Loading seasons...</div>
          ) : (
            <select
              value={selectedSeason}
              onChange={e => setSelectedSeason(e.target.value)}
              style={{ backgroundColor: '#111', color: '#fff', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '10px 14px', fontSize: '15px', outline: 'none', cursor: 'pointer', minWidth: '300px' }}
            >
              <option value="">-- Select a season --</option>
              {seasons.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>

        {/* Games list */}
        {selectedSeason && (
          <>
            {loadingGames ? (
              <div style={{ color: '#555', fontSize: '14px', padding: '20px 0' }}>Loading games...</div>
            ) : seasonGames.length === 0 ? (
              <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '32px', textAlign: 'center', color: '#555', fontSize: '14px' }}>
                No played games in this season yet. Mark games as played in the Games section first.
              </div>
            ) : (
              <div>
                <div style={{ color: '#555', fontSize: '13px', marginBottom: '12px' }}>
                  {seasonGames.length} played game{seasonGames.length !== 1 ? 's' : ''} — click a game to enter stats
                </div>

                {seasonGames.map(game => {
                  const isOpen = expandedGame === game.id
                  const isLoadingThis = loadingStats === game.id
                  const msg = gameMsg[game.id] ?? ''
                  const hasStats = Object.keys(statsMap[game.id] ?? {}).length > 0
                  const dateStr = new Date(game.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                  const gameRosters = gamePlayers[game.id] ?? {}

                  return (
                    <div key={game.id} style={{ backgroundColor: '#1a1a1a', border: `1px solid ${isOpen ? '#3a5a3a' : '#2a2a2a'}`, borderRadius: '12px', marginBottom: '10px', overflow: 'hidden' }}>

                      {/* Collapsed game row */}
                      <button
                        onClick={() => openGame(game)}
                        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', textAlign: 'left' }}
                      >
                        <span style={{ color: '#444', fontSize: '12px', fontWeight: 700, minWidth: '50px' }}>Wk {game.week}</span>
                        <span style={{ color: '#888', fontSize: '13px', minWidth: '100px' }}>{dateStr}</span>
                        <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px', flex: 1 }}>
                          {game.homeTeam?.name}
                          <span style={{ color: '#27AE60', margin: '0 8px' }}>{game.homeScore ?? '–'}–{game.awayScore ?? '–'}</span>
                          {game.awayTeam?.name}
                        </span>
                        {hasStats && (
                          <span style={{ color: '#27AE60', fontSize: '11px', fontWeight: 700, backgroundColor: '#0a3a1a', border: '1px solid #27AE60', borderRadius: '4px', padding: '2px 8px' }}>STATS IN</span>
                        )}
                        <span style={{ color: '#555', fontSize: '18px', lineHeight: 1 }}>{isOpen ? '▲' : '▼'}</span>
                      </button>

                      {/* Expanded panel */}
                      {isOpen && (
                        <div style={{ borderTop: '1px solid #2a2a2a' }}>
                          {isLoadingThis ? (
                            <div style={{ padding: '24px', color: '#555', fontSize: '14px' }}>Loading season roster &amp; stats...</div>
                          ) : (
                            <div style={{ padding: '20px' }}>
                              <div style={{ backgroundColor: '#111', border: '1px solid #222', borderRadius: '6px', padding: '8px 14px', marginBottom: '16px', display: 'flex', gap: '20px', fontSize: '12px', flexWrap: 'wrap' }}>
                                <span style={{ color: '#27AE60', fontWeight: 700 }}>STAT KEY</span>
                                <span style={{ color: '#666' }}>2PM/2PA = 2-pointers · 3PM/3PA = 3-pointers · FTM/FTA = free throws · TO = turnovers</span>
                              </div>

                              {[game.homeTeamId, game.awayTeamId].map(teamId => {
                                const team = teamId === game.homeTeamId ? game.homeTeam : game.awayTeam
                                const teamPlayers = gameRosters[teamId] ?? []
                                const teamSubs = (subsMap[game.id] ?? {})[teamId] ?? []

                                return (
                                  <div key={teamId} style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a', borderRadius: '10px', marginBottom: '16px', overflow: 'hidden' }}>
                                    {/* Team header */}
                                    <div style={{ backgroundColor: team.color + '22', borderBottom: `2px solid ${team.color}`, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <div style={{ width: '10px', height: '10px', backgroundColor: team.color, borderRadius: '50%' }} />
                                      <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '15px', margin: 0 }}>{team.name}</h3>
                                      <span style={{ color: '#555', fontSize: '12px' }}>
                                        {teamPlayers.length} player{teamPlayers.length !== 1 ? 's' : ''} this season
                                      </span>
                                    </div>

                                    {/* Player rows */}
                                    {teamPlayers.length === 0 ? (
                                      <div style={{ padding: '16px 18px', color: '#666', fontSize: '13px' }}>
                                        No players recorded for this team in <strong style={{ color: '#888' }}>{game.season}</strong> yet.
                                        Use the Subs section below to add players for this game.
                                      </div>
                                    ) : (
                                      <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px' }}>
                                          <thead>
                                            <tr style={{ backgroundColor: '#0d0d0d', borderBottom: '1px solid #333' }}>
                                              {headers.map(h => (
                                                <th key={h} style={{ padding: '9px 6px', textAlign: h === 'Player' ? 'left' : 'center', color: '#555', fontWeight: 700, fontSize: '11px', whiteSpace: 'nowrap' }}>{h}</th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {teamPlayers.map((player, i) => {
                                              const s = getOrInit(game.id, player.id, teamId)
                                              const u = (field: keyof StatRow) => (v: number) => updateStat(game.id, player.id, teamId, field, v)
                                              return (
                                                <tr key={player.id} style={{ backgroundColor: i % 2 === 0 ? '#141414' : '#111', borderBottom: '1px solid #1e1e1e' }}>
                                                  <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                                                    <span style={{ color: team.color, fontWeight: 700, marginRight: '6px', fontSize: '12px' }}>#{player.number}</span>
                                                    <span style={{ color: '#ccc', fontSize: '13px' }}>{player.name}</span>
                                                    <span style={{ color: '#444', fontSize: '11px', marginLeft: '6px' }}>{player.position}</span>
                                                  </td>
                                                  <td style={{ padding: '7px 4px', textAlign: 'center' }}>{cellInput(s.points, u('points'))}</td>
                                                  <td style={{ padding: '7px 4px', textAlign: 'center' }}>{cellInput(s.rebounds, u('rebounds'))}</td>
                                                  <td style={{ padding: '7px 4px', textAlign: 'center' }}>{cellInput(s.assists, u('assists'))}</td>
                                                  <td style={{ padding: '7px 4px', textAlign: 'center' }}>{cellInput(s.steals, u('steals'))}</td>
                                                  <td style={{ padding: '7px 4px', textAlign: 'center' }}>{cellInput(s.blocks, u('blocks'))}</td>
                                                  <td style={{ padding: '7px 4px', textAlign: 'center' }}>{cellInput(s.turnovers, u('turnovers'))}</td>
                                                  <td style={{ padding: '7px 4px', textAlign: 'center' }}>{cellInput(s.twoPtMade, u('twoPtMade'))}</td>
                                                  <td style={{ padding: '7px 4px', textAlign: 'center' }}>{cellInput(s.twoPtAtt, u('twoPtAtt'))}</td>
                                                  <td style={{ padding: '7px 4px', textAlign: 'center' }}>{cellInput(s.threeMade, u('threeMade'))}</td>
                                                  <td style={{ padding: '7px 4px', textAlign: 'center' }}>{cellInput(s.threeAtt, u('threeAtt'))}</td>
                                                  <td style={{ padding: '7px 4px', textAlign: 'center' }}>{cellInput(s.ftMade, u('ftMade'))}</td>
                                                  <td style={{ padding: '7px 4px', textAlign: 'center' }}>{cellInput(s.ftAtt, u('ftAtt'))}</td>
                                                </tr>
                                              )
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}

                                    {/* Subs */}
                                    <div style={{ borderTop: '1px dashed #222', padding: '12px 18px', backgroundColor: '#0d0d0d' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: teamSubs.length > 0 ? '10px' : '0' }}>
                                        <span style={{ color: '#F5A623', fontSize: '11px', fontWeight: 700 }}>SUBSTITUTES</span>
                                        <span style={{ color: '#444', fontSize: '11px' }}>Hidden from leaderboards · use for one-off players</span>
                                        <button
                                          onClick={() => addSub(game.id, teamId)}
                                          style={{ marginLeft: 'auto', backgroundColor: '#1a2a00', border: '1px solid #3a5a00', color: '#8dc63f', fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '6px', cursor: 'pointer' }}
                                        >+ Add Sub</button>
                                      </div>

                                      {teamSubs.length > 0 && (
                                        <div style={{ overflowX: 'auto' }}>
                                          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px' }}>
                                            <thead>
                                              <tr style={{ backgroundColor: '#0a0a0a' }}>
                                                <th style={{ padding: '7px', textAlign: 'left', color: '#444', fontSize: '11px', fontWeight: 700 }}>Sub Name</th>
                                                {['PTS','REB','AST','STL','BLK','TO','2PM','2PA','3PM','3PA','FTM','FTA'].map(h => (
                                                  <th key={h} style={{ padding: '7px 4px', textAlign: 'center', color: '#444', fontSize: '11px', fontWeight: 700 }}>{h}</th>
                                                ))}
                                                <th style={{ width: '30px' }} />
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {teamSubs.map((sub, idx) => {
                                                const u = (field: keyof SubEntry) => (v: number) => updateSub(game.id, teamId, idx, field, v)
                                                return (
                                                  <tr key={idx} style={{ borderBottom: '1px solid #1a1a1a' }}>
                                                    <td style={{ padding: '5px 6px' }}>
                                                      <input
                                                        value={sub.name}
                                                        onChange={e => updateSub(game.id, teamId, idx, 'name', e.target.value)}
                                                        placeholder="Player name..."
                                                        style={{ width: '130px', backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: '4px', padding: '4px 7px', fontSize: '12px', outline: 'none' }}
                                                      />
                                                    </td>
                                                    <td style={{ padding: '5px 4px', textAlign: 'center' }}>{cellInput(sub.points, u('points'))}</td>
                                                    <td style={{ padding: '5px 4px', textAlign: 'center' }}>{cellInput(sub.rebounds, u('rebounds'))}</td>
                                                    <td style={{ padding: '5px 4px', textAlign: 'center' }}>{cellInput(sub.assists, u('assists'))}</td>
                                                    <td style={{ padding: '5px 4px', textAlign: 'center' }}>{cellInput(sub.steals, u('steals'))}</td>
                                                    <td style={{ padding: '5px 4px', textAlign: 'center' }}>{cellInput(sub.blocks, u('blocks'))}</td>
                                                    <td style={{ padding: '5px 4px', textAlign: 'center' }}>{cellInput(sub.turnovers, u('turnovers'))}</td>
                                                    <td style={{ padding: '5px 4px', textAlign: 'center' }}>{cellInput(sub.twoPtMade, u('twoPtMade'))}</td>
                                                    <td style={{ padding: '5px 4px', textAlign: 'center' }}>{cellInput(sub.twoPtAtt, u('twoPtAtt'))}</td>
                                                    <td style={{ padding: '5px 4px', textAlign: 'center' }}>{cellInput(sub.threeMade, u('threeMade'))}</td>
                                                    <td style={{ padding: '5px 4px', textAlign: 'center' }}>{cellInput(sub.threeAtt, u('threeAtt'))}</td>
                                                    <td style={{ padding: '5px 4px', textAlign: 'center' }}>{cellInput(sub.ftMade, u('ftMade'))}</td>
                                                    <td style={{ padding: '5px 4px', textAlign: 'center' }}>{cellInput(sub.ftAtt, u('ftAtt'))}</td>
                                                    <td style={{ padding: '5px 4px', textAlign: 'center' }}>
                                                      <button onClick={() => removeSub(game.id, teamId, idx)} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '16px' }}>×</button>
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

                              {/* Save button */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
                                <button
                                  onClick={() => saveStats(game)}
                                  disabled={savingGame === game.id}
                                  style={{ backgroundColor: savingGame === game.id ? '#2a2a2a' : '#27AE60', color: '#fff', fontWeight: 700, fontSize: '14px', padding: '12px 32px', borderRadius: '8px', border: 'none', cursor: savingGame === game.id ? 'not-allowed' : 'pointer' }}
                                >
                                  {savingGame === game.id ? 'Saving...' : `Save Stats — ${game.homeTeam?.name} vs ${game.awayTeam?.name}`}
                                </button>
                                {msg && (
                                  <span style={{ color: msg.includes('✗') ? '#e74c3c' : '#27AE60', fontSize: '14px', fontWeight: 700 }}>{msg}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  )
}
