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
  const [games, setGames] = useState<Game[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedGame, setSelectedGame] = useState<string>('')
  const [stats, setStats] = useState<Record<string, StatRow>>({})
  // subs[teamId] = array of sub entries
  const [subs, setSubs] = useState<Record<string, SubEntry[]>>({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/games').then(r => r.json()),
      fetch('/api/admin/players').then(r => r.json()),
    ]).then(([g, p]) => {
      setGames(Array.isArray(g) ? g.filter((gm: Game) => gm.played) : [])
      setPlayers(Array.isArray(p) ? p : [])
      setLoading(false)
    })
  }, [])

  const game = games.find(g => g.id === selectedGame)

  useEffect(() => {
    if (!selectedGame) return
    setSubs({})
    fetch(`/api/admin/stats?gameId=${selectedGame}`)
      .then(r => r.json())
      .then((existing: any[]) => {
        const map: Record<string, StatRow> = {}
        const subsByTeam: Record<string, SubEntry[]> = {}
        existing.forEach((s: any) => {
          if (s.player?.isSub) {
            // pre-populate subs from existing data
            const teamId = s.teamId
            if (!subsByTeam[teamId]) subsByTeam[teamId] = []
            subsByTeam[teamId].push({
              name: s.player.name,
              teamId,
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
        setStats(map)
        setSubs(subsByTeam)
      })
  }, [selectedGame])

  const getOrInit = (playerId: string, teamId: string): StatRow =>
    stats[playerId] ?? EMPTY_STAT(playerId, selectedGame, teamId)

  const updateStat = (playerId: string, teamId: string, field: keyof StatRow, val: number) => {
    const current = getOrInit(playerId, teamId)
    setStats(prev => ({ ...prev, [playerId]: { ...current, [field]: val } }))
  }

  const updateSub = (teamId: string, idx: number, field: keyof SubEntry, val: string | number) => {
    setSubs(prev => {
      const arr = [...(prev[teamId] ?? [])]
      arr[idx] = { ...arr[idx], [field]: val }
      return { ...prev, [teamId]: arr }
    })
  }

  const addSub = (teamId: string) => {
    setSubs(prev => ({ ...prev, [teamId]: [...(prev[teamId] ?? []), EMPTY_SUB(teamId)] }))
  }

  const removeSub = (teamId: string, idx: number) => {
    setSubs(prev => {
      const arr = [...(prev[teamId] ?? [])]
      arr.splice(idx, 1)
      return { ...prev, [teamId]: arr }
    })
  }

  const relevantPlayers = game
    ? players.filter(p => (p.teamId === game.homeTeamId || p.teamId === game.awayTeamId) && !p.isSub)
    : []

  const saveStats = async () => {
    if (!selectedGame || !game) return
    setSaving(true)
    setMsg('')

    try {
      // 1. Save regular player stats
      const statsArr = Object.values(stats).filter(s => s.gameId === selectedGame)

      // 2. Handle subs: find-or-create sub players, then build their stat rows
      const subStatRows: StatRow[] = []
      for (const [teamId, subList] of Object.entries(subs)) {
        for (const sub of subList) {
          if (!sub.name.trim()) continue
          // find or create the sub player
          const createRes = await fetch('/api/admin/players', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: sub.name.trim(), number: 0, position: 'G', teamId, isSub: true }),
          })
          if (!createRes.ok) continue
          const newPlayer = await createRes.json()
          subStatRows.push({
            playerId: newPlayer.id,
            gameId: selectedGame,
            teamId,
            points: sub.points, rebounds: sub.rebounds, assists: sub.assists,
            steals: sub.steals, blocks: sub.blocks, turnovers: sub.turnovers,
            twoPtMade: sub.twoPtMade, twoPtAtt: sub.twoPtAtt,
            threeMade: sub.threeMade, threeAtt: sub.threeAtt,
            ftMade: sub.ftMade, ftAtt: sub.ftAtt,
          })
        }
      }

      const allStats = [...statsArr, ...subStatRows]
      const res = await fetch('/api/admin/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stats: allStats }),
      })
      setSaving(false)
      setMsg(res.ok ? '✓ Stats saved! Subs are recorded but won\'t appear on leaderboards.' : '✗ Error saving stats.')
    } catch {
      setSaving(false)
      setMsg('✗ Error saving stats.')
    }
    setTimeout(() => setMsg(''), 5000)
  }

  const cellInput = (val: number, onChange: (v: number) => void, w = '44px') => (
    <input
      type="number" min="0" value={val}
      onChange={e => onChange(parseInt(e.target.value) || 0)}
      style={{ width: w, backgroundColor: '#0d0d0d', color: '#fff', border: '1px solid #222', borderRadius: '4px', padding: '4px', fontSize: '13px', textAlign: 'center', outline: 'none' }}
    />
  )

  const headers = ['Player', 'PTS', 'REB', 'AST', 'STL', 'BLK', 'TO', '2PM', '2PA', '3PM', '3PA', 'FTM', 'FTA']

  return (
    <AdminLayout>
      <div style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ color: '#fff', fontSize: '26px', fontWeight: 900 }}>Enter Game Stats</h1>
          <p style={{ color: '#555', fontSize: '14px' }}>Select a played game to enter player statistics. Use the Sub section to add one-off subs (they won't appear on leaderboards).</p>
        </div>

        {msg && (
          <div style={{ backgroundColor: msg.includes('✗') ? '#3a0a0a' : '#0a3a1a', border: `1px solid ${msg.includes('✗') ? '#e74c3c' : '#27AE60'}`, color: msg.includes('✗') ? '#e74c3c' : '#27AE60', padding: '10px 16px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>
            {msg}
          </div>
        )}

        <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <label style={{ color: '#999', fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Select Game</label>
          {loading ? (
            <div style={{ color: '#555', fontSize: '14px' }}>Loading games...</div>
          ) : games.length === 0 ? (
            <div style={{ color: '#555', fontSize: '14px' }}>No played games yet. Enter scores in the Games section first.</div>
          ) : (
            <select
              value={selectedGame}
              onChange={e => setSelectedGame(e.target.value)}
              style={{ backgroundColor: '#111', color: '#fff', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '10px 14px', fontSize: '15px', outline: 'none', cursor: 'pointer', minWidth: '340px' }}
            >
              <option value="">-- Select a played game --</option>
              {games.map(g => (
                <option key={g.id} value={g.id}>
                  {g.season} · {g.homeTeam?.name} {g.homeScore}–{g.awayScore} {g.awayTeam?.name} [{new Date(g.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}]
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedGame && game && (
          <>
            <div style={{ backgroundColor: '#1a2a1a', border: '1px solid #2a3a2a', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', display: 'flex', gap: '24px', fontSize: '13px', flexWrap: 'wrap' }}>
              <span style={{ color: '#27AE60', fontWeight: 700 }}>STAT KEY</span>
              <span style={{ color: '#888' }}>2PM/2PA = 2-pointers · 3PM/3PA = 3-pointers · FTM/FTA = free throws</span>
              <span style={{ color: '#888' }}>TO = turnovers · STL = steals · BLK = blocks</span>
            </div>

            {[game.homeTeamId, game.awayTeamId].map(teamId => {
              const team = teamId === game.homeTeamId ? game.homeTeam : game.awayTeam
              const teamPlayers = relevantPlayers.filter(p => p.teamId === teamId)
              const teamSubs = subs[teamId] ?? []

              return (
                <div key={teamId} style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', marginBottom: '20px', overflow: 'hidden' }}>
                  {/* Team header */}
                  <div style={{ backgroundColor: team.color + '22', borderBottom: `2px solid ${team.color}`, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '10px', height: '10px', backgroundColor: team.color, borderRadius: '50%' }} />
                    <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>{team.name}</h3>
                    <span style={{ color: '#555', fontSize: '13px' }}>({teamPlayers.length} players)</span>
                  </div>

                  {/* Regular players */}
                  {teamPlayers.length === 0 ? (
                    <div style={{ padding: '16px 20px', color: '#555', fontSize: '13px' }}>No players on this team. Add players in Teams &amp; Roster.</div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#111', borderBottom: '1px solid #333' }}>
                            {headers.map(h => (
                              <th key={h} style={{ padding: '10px 8px', textAlign: h === 'Player' ? 'left' : 'center', color: '#555', fontWeight: 700, fontSize: '11px', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {teamPlayers.map((player, i) => {
                            const s = getOrInit(player.id, teamId)
                            const u = (field: keyof StatRow) => (v: number) => updateStat(player.id, teamId, field, v)
                            return (
                              <tr key={player.id} style={{ backgroundColor: i % 2 === 0 ? '#1a1a1a' : '#141414', borderBottom: '1px solid #222' }}>
                                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                                  <span style={{ color: team.color, fontWeight: 700, marginRight: '6px', fontSize: '12px' }}>#{player.number}</span>
                                  <span style={{ color: '#ccc', fontSize: '13px' }}>{player.name}</span>
                                  <span style={{ color: '#444', fontSize: '11px', marginLeft: '6px' }}>{player.position}</span>
                                </td>
                                <td style={{ padding: '8px 4px', textAlign: 'center' }}>{cellInput(s.points, u('points'))}</td>
                                <td style={{ padding: '8px 4px', textAlign: 'center' }}>{cellInput(s.rebounds, u('rebounds'))}</td>
                                <td style={{ padding: '8px 4px', textAlign: 'center' }}>{cellInput(s.assists, u('assists'))}</td>
                                <td style={{ padding: '8px 4px', textAlign: 'center' }}>{cellInput(s.steals, u('steals'))}</td>
                                <td style={{ padding: '8px 4px', textAlign: 'center' }}>{cellInput(s.blocks, u('blocks'))}</td>
                                <td style={{ padding: '8px 4px', textAlign: 'center' }}>{cellInput(s.turnovers, u('turnovers'))}</td>
                                <td style={{ padding: '8px 4px', textAlign: 'center' }}>{cellInput(s.twoPtMade, u('twoPtMade'))}</td>
                                <td style={{ padding: '8px 4px', textAlign: 'center' }}>{cellInput(s.twoPtAtt, u('twoPtAtt'))}</td>
                                <td style={{ padding: '8px 4px', textAlign: 'center' }}>{cellInput(s.threeMade, u('threeMade'))}</td>
                                <td style={{ padding: '8px 4px', textAlign: 'center' }}>{cellInput(s.threeAtt, u('threeAtt'))}</td>
                                <td style={{ padding: '8px 4px', textAlign: 'center' }}>{cellInput(s.ftMade, u('ftMade'))}</td>
                                <td style={{ padding: '8px 4px', textAlign: 'center' }}>{cellInput(s.ftAtt, u('ftAtt'))}</td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Sub section */}
                  <div style={{ borderTop: '1px dashed #2a2a2a', padding: '14px 20px', backgroundColor: '#111' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: teamSubs.length > 0 ? '12px' : '0' }}>
                      <span style={{ color: '#F5A623', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em' }}>SUBSTITUTES</span>
                      <span style={{ color: '#444', fontSize: '11px' }}>Subs are recorded but hidden from leaderboards</span>
                      <button
                        onClick={() => addSub(teamId)}
                        style={{ marginLeft: 'auto', backgroundColor: '#1a2a00', border: '1px solid #3a5a00', color: '#8dc63f', fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        + Add Sub
                      </button>
                    </div>

                    {teamSubs.length > 0 && (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#0d0d0d' }}>
                              <th style={{ padding: '8px', textAlign: 'left', color: '#555', fontSize: '11px', fontWeight: 700 }}>Sub Name</th>
                              {['PTS','REB','AST','STL','BLK','TO','2PM','2PA','3PM','3PA','FTM','FTA'].map(h => (
                                <th key={h} style={{ padding: '8px 4px', textAlign: 'center', color: '#555', fontSize: '11px', fontWeight: 700 }}>{h}</th>
                              ))}
                              <th style={{ width: '30px' }} />
                            </tr>
                          </thead>
                          <tbody>
                            {teamSubs.map((sub, idx) => {
                              const u = (field: keyof SubEntry) => (v: number) => updateSub(teamId, idx, field, v)
                              return (
                                <tr key={idx} style={{ borderBottom: '1px solid #1a1a1a' }}>
                                  <td style={{ padding: '6px 8px' }}>
                                    <input
                                      value={sub.name}
                                      onChange={e => updateSub(teamId, idx, 'name', e.target.value)}
                                      placeholder="Player name..."
                                      style={{ width: '140px', backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: '4px', padding: '5px 8px', fontSize: '13px', outline: 'none' }}
                                    />
                                  </td>
                                  <td style={{ padding: '6px 4px', textAlign: 'center' }}>{cellInput(sub.points, u('points'))}</td>
                                  <td style={{ padding: '6px 4px', textAlign: 'center' }}>{cellInput(sub.rebounds, u('rebounds'))}</td>
                                  <td style={{ padding: '6px 4px', textAlign: 'center' }}>{cellInput(sub.assists, u('assists'))}</td>
                                  <td style={{ padding: '6px 4px', textAlign: 'center' }}>{cellInput(sub.steals, u('steals'))}</td>
                                  <td style={{ padding: '6px 4px', textAlign: 'center' }}>{cellInput(sub.blocks, u('blocks'))}</td>
                                  <td style={{ padding: '6px 4px', textAlign: 'center' }}>{cellInput(sub.turnovers, u('turnovers'))}</td>
                                  <td style={{ padding: '6px 4px', textAlign: 'center' }}>{cellInput(sub.twoPtMade, u('twoPtMade'))}</td>
                                  <td style={{ padding: '6px 4px', textAlign: 'center' }}>{cellInput(sub.twoPtAtt, u('twoPtAtt'))}</td>
                                  <td style={{ padding: '6px 4px', textAlign: 'center' }}>{cellInput(sub.threeMade, u('threeMade'))}</td>
                                  <td style={{ padding: '6px 4px', textAlign: 'center' }}>{cellInput(sub.threeAtt, u('threeAtt'))}</td>
                                  <td style={{ padding: '6px 4px', textAlign: 'center' }}>{cellInput(sub.ftMade, u('ftMade'))}</td>
                                  <td style={{ padding: '6px 4px', textAlign: 'center' }}>{cellInput(sub.ftAtt, u('ftAtt'))}</td>
                                  <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                                    <button
                                      onClick={() => removeSub(teamId, idx)}
                                      style={{ backgroundColor: 'transparent', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}
                                    >×</button>
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

            <button
              onClick={saveStats}
              disabled={saving}
              style={{ backgroundColor: saving ? '#2a2a2a' : '#27AE60', color: '#fff', fontWeight: 700, fontSize: '15px', padding: '14px 40px', borderRadius: '8px', border: 'none', cursor: saving ? 'not-allowed' : 'pointer' }}
            >
              {saving ? 'Saving...' : 'Save All Stats'}
            </button>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
