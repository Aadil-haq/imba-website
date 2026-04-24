'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'

interface Team { id: string; name: string; color: string }
interface Game {
  id: string; homeTeam: Team; awayTeam: Team; homeTeamId: string; awayTeamId: string
  homeScore: number | null; awayScore: number | null
  date: string; time: string; location: string; week: number; played: boolean; season: string
}

export default function AdminGamesPage() {
  const [games, setGames] = useState<Game[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [scoreGame, setScoreGame] = useState<Game | null>(null)
  const [newGame, setNewGame] = useState({ homeTeamId: '', awayTeamId: '', date: '', time: '7:00 PM', location: 'Irving Masjid Gym', week: '1', season: 'Spring 2025' })
  const [score, setScore] = useState({ homeScore: '', awayScore: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = async () => {
    const [g, t] = await Promise.all([
      fetch('/api/admin/games').then(r => r.json()),
      fetch('/api/teams').then(r => r.json()),
    ])
    setGames(Array.isArray(g) ? g : [])
    setTeams(Array.isArray(t) ? t : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const addGame = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newGame),
    })
    if (res.ok) {
      setMsg('Game added!')
      setShowAddForm(false)
      setNewGame({ homeTeamId: '', awayTeamId: '', date: '', time: '7:00 PM', location: 'Irving Masjid Gym', week: '1', season: 'Spring 2025' })
      load()
    } else {
      setMsg('Error adding game')
    }
    setSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  const updateScore = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scoreGame) return
    setSaving(true)
    const res = await fetch(`/api/games/${scoreGame.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ homeScore: parseInt(score.homeScore), awayScore: parseInt(score.awayScore), played: true }),
    })
    if (res.ok) {
      setMsg('Score updated!')
      setScoreGame(null)
      load()
    } else {
      setMsg('Error updating score')
    }
    setSaving(false)
    setTimeout(() => setMsg(''), 3000)
  }

  const deleteGame = async (id: string) => {
    if (!confirm('Delete this game?')) return
    await fetch(`/api/games/${id}`, { method: 'DELETE' })
    load()
  }

  const inputS = { backgroundColor: '#111', color: '#fff', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '8px 12px', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' as const }

  return (
    <AdminLayout>
      <div style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: '26px', fontWeight: 900 }}>Games</h1>
            <p style={{ color: '#555', fontSize: '14px' }}>Manage schedule and enter scores</p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{ backgroundColor: '#4A9FE3', color: '#fff', fontWeight: 700, fontSize: '14px', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
          >
            {showAddForm ? 'Cancel' : '+ Add Game'}
          </button>
        </div>

        {msg && <div style={{ backgroundColor: '#1a3a5c', border: '1px solid #4A9FE3', color: '#4A9FE3', padding: '10px 16px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>{msg}</div>}

        {/* Add Game Form */}
        {showAddForm && (
          <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '16px', marginBottom: '20px' }}>Add New Game</h3>
            <form onSubmit={addGame}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ color: '#999', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Home Team *</label>
                  <select value={newGame.homeTeamId} onChange={e => setNewGame({ ...newGame, homeTeamId: e.target.value })} style={{ ...inputS, cursor: 'pointer' }} required>
                    <option value="">Select team</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ color: '#999', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Away Team *</label>
                  <select value={newGame.awayTeamId} onChange={e => setNewGame({ ...newGame, awayTeamId: e.target.value })} style={{ ...inputS, cursor: 'pointer' }} required>
                    <option value="">Select team</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ color: '#999', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Date *</label>
                  <input type="date" value={newGame.date} onChange={e => setNewGame({ ...newGame, date: e.target.value })} style={inputS} required />
                </div>
                <div>
                  <label style={{ color: '#999', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Time</label>
                  <input value={newGame.time} onChange={e => setNewGame({ ...newGame, time: e.target.value })} style={inputS} placeholder="7:00 PM" />
                </div>
                <div>
                  <label style={{ color: '#999', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Week</label>
                  <input type="number" min="1" value={newGame.week} onChange={e => setNewGame({ ...newGame, week: e.target.value })} style={inputS} />
                </div>
                <div>
                  <label style={{ color: '#999', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Location</label>
                  <input value={newGame.location} onChange={e => setNewGame({ ...newGame, location: e.target.value })} style={inputS} />
                </div>
              </div>
              <button type="submit" disabled={saving} style={{ backgroundColor: '#4A9FE3', color: '#fff', fontWeight: 700, fontSize: '14px', padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving...' : 'Add Game'}
              </button>
            </form>
          </div>
        )}

        {/* Score Entry Modal */}
        {scoreGame && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px' }}>
            <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '32px', maxWidth: '420px', width: '100%' }}>
              <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '18px', marginBottom: '8px' }}>Enter Score</h3>
              <p style={{ color: '#888', fontSize: '13px', marginBottom: '24px' }}>
                {scoreGame.homeTeam.name} vs {scoreGame.awayTeam.name}
              </p>
              <form onSubmit={updateScore}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#ccc', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>{scoreGame.homeTeam.name}</div>
                    <input
                      type="number" min="0" value={score.homeScore}
                      onChange={e => setScore({ ...score, homeScore: e.target.value })}
                      style={{ ...inputS, textAlign: 'center', fontSize: '24px', fontWeight: 900, color: '#4A9FE3' }}
                      placeholder="0" required
                    />
                  </div>
                  <div style={{ color: '#555', fontSize: '18px', fontWeight: 700 }}>-</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#ccc', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>{scoreGame.awayTeam.name}</div>
                    <input
                      type="number" min="0" value={score.awayScore}
                      onChange={e => setScore({ ...score, awayScore: e.target.value })}
                      style={{ ...inputS, textAlign: 'center', fontSize: '24px', fontWeight: 900, color: '#4A9FE3' }}
                      placeholder="0" required
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="submit" disabled={saving} style={{ flex: 1, backgroundColor: '#4A9FE3', color: '#fff', fontWeight: 700, fontSize: '14px', padding: '10px', borderRadius: '8px', border: 'none', cursor: saving ? 'not-allowed' : 'pointer' }}>
                    {saving ? 'Saving...' : 'Save Score'}
                  </button>
                  <button type="button" onClick={() => setScoreGame(null)} style={{ flex: 1, backgroundColor: '#1a1a1a', color: '#888', fontWeight: 600, fontSize: '14px', padding: '10px', borderRadius: '8px', border: '1px solid #2a2a2a', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Games List */}
        {loading ? (
          <div style={{ textAlign: 'center', color: '#555', padding: '48px' }}>Loading...</div>
        ) : (
          <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', overflow: 'hidden', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
              <thead>
                <tr style={{ backgroundColor: '#111', borderBottom: '2px solid #4A9FE3' }}>
                  {['Wk', 'Home', 'Score', 'Away', 'Date', 'Time', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: '#4A9FE3', fontWeight: 700, fontSize: '12px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {games.map((g, i) => (
                  <tr key={g.id} style={{ backgroundColor: i % 2 === 0 ? '#1a1a1a' : '#141414', borderBottom: '1px solid #222' }}>
                    <td style={{ padding: '12px 14px', color: '#888', fontSize: '13px' }}>{g.week}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', backgroundColor: g.homeTeam?.color || '#4A9FE3', borderRadius: '50%' }} />
                        <span style={{ color: '#ccc', fontSize: '13px', fontWeight: 600 }}>{g.homeTeam?.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {g.played ? (
                        <span style={{ color: '#4A9FE3', fontWeight: 800, fontSize: '14px' }}>{g.homeScore}–{g.awayScore}</span>
                      ) : (
                        <span style={{ color: '#444', fontSize: '12px' }}>TBD</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', backgroundColor: g.awayTeam?.color || '#888', borderRadius: '50%' }} />
                        <span style={{ color: '#ccc', fontSize: '13px', fontWeight: 600 }}>{g.awayTeam?.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#888', fontSize: '12px' }}>
                      {new Date(g.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#888', fontSize: '12px' }}>{g.time}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                        backgroundColor: g.played ? '#1a4731' : '#2a2a2a',
                        color: g.played ? '#27AE60' : '#888',
                      }}>
                        {g.played ? 'FINAL' : 'UPCOMING'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => { setScoreGame(g); setScore({ homeScore: String(g.homeScore ?? ''), awayScore: String(g.awayScore ?? '') }) }}
                          style={{ backgroundColor: '#1a3a5c', color: '#4A9FE3', border: '1px solid #4A9FE3', borderRadius: '4px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Score
                        </button>
                        <button
                          onClick={() => deleteGame(g.id)}
                          style={{ backgroundColor: '#4a1919', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: '4px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Del
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
