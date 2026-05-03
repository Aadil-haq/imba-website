'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'

interface Team { id: string; name: string; color: string; league: string }
interface Game {
  id: string; homeTeam: Team; awayTeam: Team; homeTeamId: string; awayTeamId: string
  homeScore: number | null; awayScore: number | null
  date: string; time: string; location: string; week: number; played: boolean; season: string; league: string
}
interface SeasonRow { season: string; league: string; active: boolean }

const wkLabel = (w: number) =>
  w === 99 ? 'Finals' : w === 98 ? 'Semi Finals' : w === 97 ? 'Quarterfinals' : w === 96 ? 'Round 1' : `Week ${w}`

const inputS = {
  backgroundColor: '#111', color: '#fff', border: '1px solid #2a2a2a',
  borderRadius: '6px', padding: '8px 12px', fontSize: '14px', outline: 'none',
  width: '100%', boxSizing: 'border-box' as const,
}
const selectS = { ...inputS, cursor: 'pointer' }
const labelS: React.CSSProperties = { color: '#999', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }

export default function AdminGamesPage() {
  const [games, setGames] = useState<Game[]>([])
  const [allTeams, setAllTeams] = useState<Team[]>([])
  const [seasonTeams, setSeasonTeams] = useState<Team[]>([]) // teams for the selected season
  const [allSeasons, setAllSeasons] = useState<SeasonRow[]>([]) // every known season
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [scoreGame, setScoreGame] = useState<Game | null>(null)
  const [editGame, setEditGame] = useState<Game | null>(null)
  const [selectedSeason, setSelectedSeason] = useState<string>('')
  const [newGame, setNewGame] = useState({
    homeTeamId: '', awayTeamId: '', date: '', time: '7:00 PM',
    location: 'Irving Masjid Gym', week: '1', season: '', league: 'Comp',
  })
  const [score, setScore] = useState({ homeScore: '', awayScore: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'ok'|'err'>('ok')

  const showMsg = (text: string, type: 'ok'|'err' = 'ok') => {
    setMsg(text); setMsgType(type)
    setTimeout(() => setMsg(''), 3000)
  }

  // ── Load data ─────────────────────────────────────────────────────────────

  const loadGames = async (season?: string) => {
    const url = season ? `/api/admin/games?season=${encodeURIComponent(season)}` : '/api/admin/games'
    const g = await fetch(url).then(r => r.json())
    setGames(Array.isArray(g) ? g : [])
  }

  useEffect(() => {
    const init = async () => {
      const [g, t, s] = await Promise.all([
        fetch('/api/admin/games').then(r => r.json()),
        fetch('/api/teams').then(r => r.json()),
        fetch('/api/admin/seasons').then(r => r.json()),
      ])
      const allGames: Game[] = Array.isArray(g) ? g : []
      setGames(allGames)
      setAllTeams(Array.isArray(t) ? t : [])

      // Use the full seasons list (includes seasons with no games yet)
      const seasons: SeasonRow[] = Array.isArray(s) ? s : []
      setAllSeasons(seasons)

      // Default to first active season, or most recent from games
      const activeSeason = seasons.find(s => s.active)
      const gameSeasons = [...new Set(allGames.map(g => g.season))].sort().reverse()
      const defaultSeason = activeSeason?.season ?? gameSeasons[0] ?? ''
      setSelectedSeason(defaultSeason)
      setNewGame(prev => ({ ...prev, season: defaultSeason, league: activeSeason?.league ?? 'Comp' }))
      setLoading(false)
    }
    init()
  }, [])

  // Load season-specific teams whenever selected season changes
  useEffect(() => {
    if (!selectedSeason) return
    fetch(`/api/admin/season-teams?season=${encodeURIComponent(selectedSeason)}`)
      .then(r => r.json())
      .then(data => {
        const active: Team[] = Array.isArray(data.active) ? data.active : []
        // If season has assigned teams, use those; otherwise show all teams
        setSeasonTeams(active.length > 0 ? active : allTeams)
      })
      .catch(() => setSeasonTeams(allTeams))
  }, [selectedSeason, allTeams])

  // ── Season selection helpers ───────────────────────────────────────────────

  const handleSeasonChange = (season: string) => {
    setSelectedSeason(season)
    const meta = allSeasons.find(s => s.season === season)
    setNewGame(prev => ({ ...prev, season, league: meta?.league ?? prev.league }))
  }

  // Combined list: all known seasons + any extra from actual games
  const gameSeasonsExtra = [...new Set(games.map(g => g.season))]
    .filter(s => !allSeasons.some(a => a.season === s))
    .map(s => ({ season: s, league: '', active: false }))
  const seasonList = [...allSeasons, ...gameSeasonsExtra]

  // ── Game CRUD ─────────────────────────────────────────────────────────────

  const addGame = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newGame.homeTeamId === newGame.awayTeamId) { showMsg('Home and away teams must be different', 'err'); return }
    setSaving(true)
    const res = await fetch('/api/games', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newGame, season: newGame.season || selectedSeason }),
    })
    setSaving(false)
    if (res.ok) {
      showMsg('✓ Game added!')
      setShowAddForm(false)
      setNewGame(prev => ({ ...prev, homeTeamId: '', awayTeamId: '', date: '' }))
      loadGames(selectedSeason)
    } else {
      showMsg('✗ Error adding game', 'err')
    }
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
    setSaving(false)
    if (res.ok) { showMsg('✓ Score saved!'); setScoreGame(null); loadGames(selectedSeason) }
    else showMsg('✗ Error updating score', 'err')
  }

  const saveEditGame = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editGame) return
    setSaving(true)
    const res = await fetch(`/api/games/${editGame.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        homeTeamId: editGame.homeTeamId,
        awayTeamId: editGame.awayTeamId,
        date: editGame.date,
        time: editGame.time,
        location: editGame.location,
        week: editGame.week,
      }),
    })
    setSaving(false)
    if (res.ok) { showMsg('✓ Game updated!'); setEditGame(null); loadGames(selectedSeason) }
    else showMsg('✗ Error updating game', 'err')
  }

  const deleteGame = async (id: string) => {
    if (!confirm('Delete this game and all its stats?')) return
    await fetch(`/api/games/${id}`, { method: 'DELETE' })
    loadGames(selectedSeason)
  }

  // ── Derived display data ───────────────────────────────────────────────────

  const filteredGames = games
    .filter(g => g.season === selectedSeason)
    .sort((a, b) => a.week - b.week || a.date.localeCompare(b.date))

  const teamsForForm = seasonTeams.length > 0 ? seasonTeams : allTeams

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      <div style={{ padding: '32px', maxWidth: '1200px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: '26px', fontWeight: 900 }}>Games</h1>
            <p style={{ color: '#555', fontSize: '14px' }}>Schedule games and enter scores</p>
          </div>
          <button
            onClick={() => { setShowAddForm(!showAddForm); }}
            style={{ backgroundColor: showAddForm ? '#2a2a2a' : '#4A9FE3', color: '#fff', fontWeight: 700, fontSize: '14px', padding: '10px 22px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
          >
            {showAddForm ? '✕ Cancel' : '+ Add Game'}
          </button>
        </div>

        {/* Status message */}
        {msg && (
          <div style={{ backgroundColor: msgType === 'ok' ? '#0a3a1a' : '#3a0a0a', border: `1px solid ${msgType === 'ok' ? '#27AE60' : '#e74c3c'}`, color: msgType === 'ok' ? '#27AE60' : '#e74c3c', padding: '10px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', fontWeight: 600 }}>
            {msg}
          </div>
        )}

        {/* Season selector row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <label style={{ color: '#888', fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Season</label>
          <select
            value={selectedSeason}
            onChange={e => handleSeasonChange(e.target.value)}
            style={{ ...selectS, width: 'auto', minWidth: '220px', fontWeight: 700 }}
          >
            {seasonList.map(s => (
              <option key={`${s.season}-${s.league}`} value={s.season}>
                {s.season}{s.active ? ' ●' : ''}
              </option>
            ))}
          </select>
          <span style={{ color: '#555', fontSize: '13px' }}>
            {filteredGames.length} game{filteredGames.length !== 1 ? 's' : ''}
            {seasonTeams.length > 0 && seasonTeams !== allTeams && (
              <span style={{ marginLeft: '10px', color: '#4A9FE3' }}>· {seasonTeams.length} teams assigned</span>
            )}
          </span>
        </div>

        {/* ── Add Game Form ──────────────────────────────────────────────── */}
        {showAddForm && (
          <div style={{ backgroundColor: '#141414', border: '1px solid #4A9FE3', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ color: '#fff', fontWeight: 800, fontSize: '16px', marginBottom: '20px' }}>
              Schedule New Game
              {newGame.season && <span style={{ color: '#555', fontWeight: 400, fontSize: '13px', marginLeft: '10px' }}>— {newGame.season}</span>}
            </h3>
            <form onSubmit={addGame}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>

                {/* Season */}
                <div>
                  <label style={labelS}>Season *</label>
                  <select
                    value={newGame.season}
                    onChange={e => {
                      const meta = allSeasons.find(s => s.season === e.target.value)
                      setNewGame(prev => ({ ...prev, season: e.target.value, league: meta?.league ?? prev.league }))
                    }}
                    style={selectS} required
                  >
                    <option value="">Select season</option>
                    {seasonList.map(s => (
                      <option key={`${s.season}-${s.league}`} value={s.season}>{s.season}</option>
                    ))}
                  </select>
                </div>

                {/* League */}
                <div>
                  <label style={labelS}>League</label>
                  <select value={newGame.league} onChange={e => setNewGame(prev => ({ ...prev, league: e.target.value }))} style={selectS}>
                    {['Comp', 'Rec', '35+', 'Rec League', 'U17'].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>

                {/* Home Team */}
                <div>
                  <label style={labelS}>Home Team *</label>
                  <select value={newGame.homeTeamId} onChange={e => setNewGame(prev => ({ ...prev, homeTeamId: e.target.value }))} style={selectS} required>
                    <option value="">Select team</option>
                    {teamsForForm.sort((a,b) => a.name.localeCompare(b.name)).map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {/* Away Team */}
                <div>
                  <label style={labelS}>Away Team *</label>
                  <select value={newGame.awayTeamId} onChange={e => setNewGame(prev => ({ ...prev, awayTeamId: e.target.value }))} style={selectS} required>
                    <option value="">Select team</option>
                    {teamsForForm.sort((a,b) => a.name.localeCompare(b.name)).map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label style={labelS}>Date *</label>
                  <input type="date" value={newGame.date} onChange={e => setNewGame(prev => ({ ...prev, date: e.target.value }))} style={inputS} required />
                </div>

                {/* Time */}
                <div>
                  <label style={labelS}>Time</label>
                  <input value={newGame.time} onChange={e => setNewGame(prev => ({ ...prev, time: e.target.value }))} style={inputS} placeholder="7:00 PM" />
                </div>

                {/* Round / Week */}
                <div>
                  <label style={labelS}>Round</label>
                  <select value={newGame.week} onChange={e => setNewGame(prev => ({ ...prev, week: e.target.value }))} style={selectS}>
                    {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16].map(w => (
                      <option key={w} value={w}>Week {w}</option>
                    ))}
                    <option value="96">Round 1 (Playoffs)</option>
                    <option value="97">Quarterfinals</option>
                    <option value="98">Semi Finals</option>
                    <option value="99">Finals</option>
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label style={labelS}>Location</label>
                  <input value={newGame.location} onChange={e => setNewGame(prev => ({ ...prev, location: e.target.value }))} style={inputS} />
                </div>
              </div>

              {newGame.homeTeamId && newGame.awayTeamId && newGame.homeTeamId === newGame.awayTeamId && (
                <div style={{ color: '#e74c3c', fontSize: '12px', marginBottom: '12px' }}>⚠ Home and away teams must be different</div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="submit"
                  disabled={saving || newGame.homeTeamId === newGame.awayTeamId}
                  style={{ backgroundColor: saving ? '#2a2a2a' : '#4A9FE3', color: '#fff', fontWeight: 700, fontSize: '14px', padding: '10px 28px', borderRadius: '8px', border: 'none', cursor: saving ? 'not-allowed' : 'pointer' }}
                >
                  {saving ? 'Saving...' : 'Add Game'}
                </button>
                <button type="button" onClick={() => setShowAddForm(false)}
                  style={{ backgroundColor: '#2a2a2a', color: '#888', fontWeight: 600, fontSize: '14px', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Score Entry Modal ──────────────────────────────────────────── */}
        {scoreGame && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px' }}>
            <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #4A9FE3', borderRadius: '14px', padding: '32px', maxWidth: '420px', width: '100%' }}>
              <h3 style={{ color: '#fff', fontWeight: 800, fontSize: '18px', marginBottom: '6px' }}>Enter Score</h3>
              <p style={{ color: '#555', fontSize: '13px', marginBottom: '24px' }}>{scoreGame.homeTeam.name} vs {scoreGame.awayTeam.name}</p>
              <form onSubmit={updateScore}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#ccc', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>{scoreGame.homeTeam.name}</div>
                    <input type="number" min="0" value={score.homeScore} onChange={e => setScore(s => ({ ...s, homeScore: e.target.value }))}
                      style={{ ...inputS, textAlign: 'center', fontSize: '32px', fontWeight: 900, color: '#4A9FE3', padding: '12px' }} placeholder="0" required />
                  </div>
                  <div style={{ color: '#444', fontSize: '20px', fontWeight: 700, textAlign: 'center' }}>–</div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#ccc', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>{scoreGame.awayTeam.name}</div>
                    <input type="number" min="0" value={score.awayScore} onChange={e => setScore(s => ({ ...s, awayScore: e.target.value }))}
                      style={{ ...inputS, textAlign: 'center', fontSize: '32px', fontWeight: 900, color: '#4A9FE3', padding: '12px' }} placeholder="0" required />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" disabled={saving} style={{ flex: 1, backgroundColor: '#27AE60', color: '#fff', fontWeight: 700, fontSize: '14px', padding: '12px', borderRadius: '8px', border: 'none', cursor: saving ? 'not-allowed' : 'pointer' }}>
                    {saving ? 'Saving...' : 'Save Score'}
                  </button>
                  <button type="button" onClick={() => setScoreGame(null)} style={{ flex: 1, backgroundColor: '#2a2a2a', color: '#888', fontWeight: 600, fontSize: '14px', padding: '12px', borderRadius: '8px', border: '1px solid #2a2a2a', cursor: 'pointer' }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Edit Game Modal ────────────────────────────────────────────── */}
        {editGame && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '24px' }}>
            <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '14px', padding: '32px', maxWidth: '540px', width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ color: '#fff', fontWeight: 800, fontSize: '18px', margin: 0 }}>Edit Game</h3>
                <button onClick={() => setEditGame(null)} style={{ background: 'none', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer' }}>✕</button>
              </div>
              <form onSubmit={saveEditGame}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                  <div>
                    <label style={labelS}>Home Team</label>
                    <select value={editGame.homeTeamId} onChange={e => setEditGame(g => g ? { ...g, homeTeamId: e.target.value, homeTeam: allTeams.find(t => t.id === e.target.value) as Team } : null)} style={selectS}>
                      {allTeams.sort((a,b) => a.name.localeCompare(b.name)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelS}>Away Team</label>
                    <select value={editGame.awayTeamId} onChange={e => setEditGame(g => g ? { ...g, awayTeamId: e.target.value, awayTeam: allTeams.find(t => t.id === e.target.value) as Team } : null)} style={selectS}>
                      {allTeams.sort((a,b) => a.name.localeCompare(b.name)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelS}>Date</label>
                    <input type="date" value={editGame.date.split('T')[0]} onChange={e => setEditGame(g => g ? { ...g, date: e.target.value } : null)} style={inputS} />
                  </div>
                  <div>
                    <label style={labelS}>Time</label>
                    <input value={editGame.time} onChange={e => setEditGame(g => g ? { ...g, time: e.target.value } : null)} style={inputS} />
                  </div>
                  <div>
                    <label style={labelS}>Round</label>
                    <select value={editGame.week} onChange={e => setEditGame(g => g ? { ...g, week: parseInt(e.target.value) } : null)} style={selectS}>
                      {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16].map(w => <option key={w} value={w}>Week {w}</option>)}
                      <option value="96">Round 1 (Playoffs)</option>
                      <option value="97">Quarterfinals</option>
                      <option value="98">Semi Finals</option>
                      <option value="99">Finals</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelS}>Location</label>
                    <input value={editGame.location} onChange={e => setEditGame(g => g ? { ...g, location: e.target.value } : null)} style={inputS} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setEditGame(null)} style={{ backgroundColor: '#2a2a2a', color: '#888', border: 'none', borderRadius: '6px', padding: '10px 20px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                  <button type="submit" disabled={saving} style={{ backgroundColor: '#4A9FE3', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 24px', fontSize: '14px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Games Table ───────────────────────────────────────────────── */}
        {loading ? (
          <div style={{ textAlign: 'center', color: '#555', padding: '60px' }}>Loading...</div>
        ) : filteredGames.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#444', padding: '60px', backgroundColor: '#141414', borderRadius: '12px', border: '1px solid #2a2a2a' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🏀</div>
            <div style={{ color: '#888', fontWeight: 700, marginBottom: '6px' }}>No games scheduled for {selectedSeason || 'this season'}</div>
            <div style={{ color: '#555', fontSize: '13px', marginBottom: '20px' }}>Click "+ Add Game" above to schedule the first game.</div>
            <button onClick={() => setShowAddForm(true)}
              style={{ backgroundColor: '#4A9FE3', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', fontWeight: 700, cursor: 'pointer' }}>
              + Add Game
            </button>
          </div>
        ) : (
          <div style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a', borderRadius: '12px', overflow: 'hidden', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0d0d0d', borderBottom: '2px solid #4A9FE3' }}>
                  {['Wk', 'Home', 'Score', 'Away', 'Date', 'Time', 'Status', ''].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: '#4A9FE3', fontWeight: 700, fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredGames.map((g, i) => (
                  <tr key={g.id} style={{ backgroundColor: i % 2 === 0 ? '#141414' : '#111', borderBottom: '1px solid #1e1e1e' }}>
                    <td style={{ padding: '12px 14px', color: g.week >= 90 ? '#F5A623' : '#666', fontSize: '12px', fontWeight: g.week >= 90 ? 700 : 400, whiteSpace: 'nowrap' }}>
                      {wkLabel(g.week)}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', backgroundColor: g.homeTeam?.color || '#4A9FE3', borderRadius: '50%', flexShrink: 0 }} />
                        <span style={{ color: g.played && (g.homeScore ?? 0) > (g.awayScore ?? 0) ? '#fff' : '#aaa', fontSize: '13px', fontWeight: 600 }}>{g.homeTeam?.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                      {g.played
                        ? <span style={{ color: '#4A9FE3', fontWeight: 900, fontSize: '15px', letterSpacing: '-0.02em' }}>{g.homeScore}–{g.awayScore}</span>
                        : <span style={{ color: '#333', fontSize: '12px' }}>TBD</span>}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', backgroundColor: g.awayTeam?.color || '#888', borderRadius: '50%', flexShrink: 0 }} />
                        <span style={{ color: g.played && (g.awayScore ?? 0) > (g.homeScore ?? 0) ? '#fff' : '#aaa', fontSize: '13px', fontWeight: 600 }}>{g.awayTeam?.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#777', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {new Date(g.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#555', fontSize: '12px', whiteSpace: 'nowrap' }}>{g.time}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', backgroundColor: g.played ? '#1a4731' : '#1a2a2a', color: g.played ? '#27AE60' : '#4A9FE3' }}>
                        {g.played ? 'FINAL' : 'UPCOMING'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => { setScoreGame(g); setScore({ homeScore: String(g.homeScore ?? ''), awayScore: String(g.awayScore ?? '') }) }}
                          style={{ backgroundColor: '#1a3a5c', color: '#4A9FE3', border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >
                          Score
                        </button>
                        <button
                          onClick={() => setEditGame(g)}
                          style={{ backgroundColor: '#1a2a1a', color: '#27AE60', border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteGame(g.id)}
                          style={{ backgroundColor: '#2a1a1a', color: '#e74c3c', border: 'none', borderRadius: '4px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
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
