'use client'

import { useState, useEffect, useCallback } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'

interface Team { id: string; name: string; slug: string; color: string; logo?: string | null; active: boolean; league: string }
interface Player { id: string; name: string; number: number; position: string; teamId: string; isSub: boolean }
interface DbPlayer { id: string; name: string; number: number; position: string; teamId: string }
interface SeasonRow { season: string; league: string; active: boolean }
interface EditingPlayer { id: string; name: string; number: string; position: string; teamId: string }
interface NewPlayer { name: string; number: string; position: string; teamId: string }
interface EditingTeam { id: string; name: string; color: string }

const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F']

const inputS: React.CSSProperties = {
  backgroundColor: '#111', color: '#fff', border: '1px solid #2a2a2a',
  borderRadius: '6px', padding: '8px 12px', fontSize: '14px', outline: 'none',
  width: '100%', boxSizing: 'border-box',
}
const labelS: React.CSSProperties = { color: '#999', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }

export default function AdminTeamsPage() {
  const [seasons, setSeasons] = useState<SeasonRow[]>([])
  const [selectedSeason, setSelectedSeason] = useState('')
  const [teamsInSeason, setTeamsInSeason] = useState<Team[]>([])
  const [allTeams, setAllTeams] = useState<Team[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingTeams, setLoadingTeams] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok')
  const [uploadingLogo, setUploadingLogo] = useState<string | null>(null)
  const [draggingOver, setDraggingOver] = useState<string | null>(null)

  // Per-team "add player" state
  const [addingPlayerToTeam, setAddingPlayerToTeam] = useState<string | null>(null)
  const [newPlayer, setNewPlayer] = useState<NewPlayer>({ name: '', number: '', position: 'G', teamId: '' })
  const [savingPlayer, setSavingPlayer] = useState(false)

  // Player search / autocomplete
  const [allDbPlayers, setAllDbPlayers] = useState<DbPlayer[]>([])
  const [playerSearchQuery, setPlayerSearchQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Edit player modal
  const [editingPlayer, setEditingPlayer] = useState<EditingPlayer | null>(null)
  const [editSaving, setEditSaving] = useState(false)

  // Create team modal
  const [showCreateTeam, setShowCreateTeam] = useState(false)
  const [newTeam, setNewTeam] = useState({ name: '', league: 'Comp', color: '#4A9FE3' })
  const [creatingTeam, setCreatingTeam] = useState(false)

  // Edit team modal
  const [editingTeam, setEditingTeam] = useState<EditingTeam | null>(null)
  const [editTeamSaving, setEditTeamSaving] = useState(false)

  const showMsg = (text: string, type: 'ok' | 'err' = 'ok') => {
    setMsg(text); setMsgType(type)
    setTimeout(() => setMsg(''), 3000)
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTeam.name.trim()) return
    setCreatingTeam(true)
    const slug = newTeam.name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const res = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTeam.name.trim(), slug, color: newTeam.color, league: newTeam.league }),
    })
    setCreatingTeam(false)
    if (res.ok) {
      const created = await res.json()
      setAllTeams(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setShowCreateTeam(false)
      setNewTeam({ name: '', league: 'Comp', color: '#4A9FE3' })
      showMsg(`✓ Team "${created.name}" created! You can now add it to a season via Active Teams.`)
    } else {
      const err = await res.json().catch(() => ({}))
      showMsg(err.error || '✗ Failed to create team', 'err')
    }
  }

  // Load seasons on mount
  useEffect(() => {
    fetch('/api/admin/seasons')
      .then(r => r.json())
      .then((data: SeasonRow[]) => {
        if (!Array.isArray(data) || data.length === 0) { setLoading(false); return }
        setSeasons(data)
        // Default to first active season, or just first
        const active = data.find(s => s.active) ?? data[0]
        setSelectedSeason(active.season)
      })
      .catch(() => setLoading(false))
  }, [])

  // Load players for selected season
  useEffect(() => {
    if (!selectedSeason) return
    fetch(`/api/admin/players?season=${encodeURIComponent(selectedSeason)}`, { headers: { Authorization: 'Bearer imba-admin-2025' } })
      .then(r => r.json())
      .then(data => setPlayers(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [selectedSeason])

  // Load all teams (for edit player team selector)
  useEffect(() => {
    fetch('/api/teams')
      .then(r => r.json())
      .then(data => setAllTeams(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  // Load all players from DB for search autocomplete
  useEffect(() => {
    fetch('/api/admin/players', { headers: { Authorization: 'Bearer imba-admin-2025' } })
      .then(r => r.json())
      .then(data => setAllDbPlayers(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  // Load teams for selected season from season_teams SiteSetting (not games)
  const loadTeamsForSeason = useCallback(async (season: string) => {
    if (!season) return
    setLoadingTeams(true)
    try {
      const res = await fetch(`/api/admin/season-teams?season=${encodeURIComponent(season)}`, { headers: { Authorization: 'Bearer imba-admin-2025' } })
      const data = await res.json()
      const active: Team[] = Array.isArray(data.active) ? data.active : []
      setTeamsInSeason(active.sort((a, b) => a.name.localeCompare(b.name)))
    } catch { setTeamsInSeason([]) }
    setLoadingTeams(false)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (selectedSeason) loadTeamsForSeason(selectedSeason)
  }, [selectedSeason, loadTeamsForSeason])

  const reloadPlayers = () =>
    fetch(`/api/admin/players?season=${encodeURIComponent(selectedSeason)}`, { headers: { Authorization: 'Bearer imba-admin-2025' } })
      .then(r => r.json())
      .then(data => setPlayers(Array.isArray(data) ? data : []))

  const saveEditTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTeam) return
    setEditTeamSaving(true)
    const res = await fetch('/api/teams', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingTeam.id, name: editingTeam.name.trim(), color: editingTeam.color }),
    })
    if (res.ok) {
      const updated = await res.json()
      setTeamsInSeason(prev => prev.map(t => t.id === updated.id ? { ...t, name: updated.name, color: updated.color } : t))
      setAllTeams(prev => prev.map(t => t.id === updated.id ? { ...t, name: updated.name, color: updated.color } : t))
      showMsg('Team updated!')
      setEditingTeam(null)
    } else showMsg('Error updating team', 'err')
    setEditTeamSaving(false)
  }

  const uploadLogo = async (teamId: string, file: File) => {
    setUploadingLogo(teamId)
    const fd = new FormData()
    fd.append('file', file); fd.append('teamId', teamId)
    const res = await fetch('/api/admin/upload-logo', { method: 'POST', body: fd })
    if (res.ok) {
      const { url } = await res.json()
      setTeamsInSeason(prev => prev.map(t => t.id === teamId ? { ...t, logo: url } : t))
      setAllTeams(prev => prev.map(t => t.id === teamId ? { ...t, logo: url } : t))
      showMsg('Logo uploaded!')
    } else showMsg('Upload failed', 'err')
    setUploadingLogo(null)
  }

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingPlayer(true)
    const res = await fetch('/api/admin/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer imba-admin-2025' },
      body: JSON.stringify({ ...newPlayer, season: selectedSeason }),
    })
    if (res.ok) {
      showMsg('Player added!')
      setAddingPlayerToTeam(null)
      setNewPlayer({ name: '', number: '', position: 'G', teamId: '' })
      reloadPlayers()
    } else showMsg('Error adding player', 'err')
    setSavingPlayer(false)
  }

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPlayer) return
    setEditSaving(true)
    const res = await fetch('/api/admin/players', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer imba-admin-2025' },
      body: JSON.stringify(editingPlayer),
    })
    if (res.ok) { showMsg('Player updated!'); setEditingPlayer(null); reloadPlayers() }
    else showMsg('Error updating player', 'err')
    setEditSaving(false)
  }

  const deletePlayer = async (id: string) => {
    if (!confirm('Remove this player? All their stats will also be removed.')) return
    await fetch(`/api/admin/players?id=${id}`, { method: 'DELETE', headers: { Authorization: 'Bearer imba-admin-2025' } })
    reloadPlayers()
  }

  return (
    <AdminLayout>
      <div style={{ padding: '32px', maxWidth: '1100px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: '26px', fontWeight: 900, marginBottom: '4px' }}>Teams & Rosters</h1>
            <p style={{ color: '#555', fontSize: '13px' }}>Manage team rosters by season</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowCreateTeam(true)}
              style={{ backgroundColor: '#27AE60', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              + New Team
            </button>

          {/* Season selector */}
          {seasons.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ color: '#666', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>Season</label>
              <select
                value={selectedSeason}
                onChange={e => setSelectedSeason(e.target.value)}
                style={{ ...inputS, width: 'auto', minWidth: '200px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
              >
                {seasons.map(s => (
                  <option key={`${s.season}-${s.league}`} value={s.season}>
                    {s.season}{s.active ? ' ●' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          </div>
        </div>

        {/* Status message */}
        {msg && (
          <div style={{ backgroundColor: msgType === 'ok' ? '#0a3a1a' : '#3a0a0a', border: `1px solid ${msgType === 'ok' ? '#27AE60' : '#e74c3c'}`, color: msgType === 'ok' ? '#27AE60' : '#e74c3c', padding: '10px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', fontWeight: 600 }}>
            {msg}
          </div>
        )}

        {/* Create Team Modal */}
        {showCreateTeam && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #27AE60', borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '480px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
                <h3 style={{ color: '#fff', fontWeight: 800, fontSize: '18px', margin: 0 }}>Create New Team</h3>
                <button onClick={() => setShowCreateTeam(false)} style={{ background: 'none', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
              </div>
              <form onSubmit={handleCreateTeam}>
                <div style={{ display: 'grid', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <label style={labelS}>Team Name *</label>
                    <input
                      autoFocus
                      value={newTeam.name}
                      onChange={e => setNewTeam(t => ({ ...t, name: e.target.value }))}
                      style={inputS}
                      placeholder="e.g. King of Kings"
                      required
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={labelS}>League</label>
                      <select
                        value={newTeam.league}
                        onChange={e => setNewTeam(t => ({ ...t, league: e.target.value }))}
                        style={{ ...inputS, cursor: 'pointer' }}
                      >
                        {['Comp', 'Rec', '35+', 'Rec League', 'U17'].map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelS}>Team Color</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="color"
                          value={newTeam.color}
                          onChange={e => setNewTeam(t => ({ ...t, color: e.target.value }))}
                          style={{ width: '44px', height: '38px', padding: '2px', border: '1px solid #2a2a2a', borderRadius: '6px', backgroundColor: '#111', cursor: 'pointer' }}
                        />
                        <span style={{ color: '#888', fontSize: '12px', fontFamily: 'monospace' }}>{newTeam.color}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <p style={{ color: '#555', fontSize: '12px', marginBottom: '18px' }}>
                  After creating, go to <strong style={{ color: '#888' }}>Active Teams</strong> to assign this team to a season.
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateTeam(false)}
                    style={{ backgroundColor: '#2a2a2a', color: '#888', border: 'none', borderRadius: '6px', padding: '10px 20px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingTeam}
                    style={{ backgroundColor: creatingTeam ? '#1a3a1a' : '#27AE60', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 28px', fontSize: '14px', fontWeight: 700, cursor: creatingTeam ? 'not-allowed' : 'pointer' }}
                  >
                    {creatingTeam ? 'Creating...' : 'Create Team'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Team Modal */}
        {editingTeam && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #27AE60', borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '420px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
                <h3 style={{ color: '#fff', fontWeight: 800, fontSize: '18px', margin: 0 }}>Edit Team</h3>
                <button onClick={() => setEditingTeam(null)} style={{ background: 'none', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
              </div>
              <form onSubmit={saveEditTeam}>
                <div style={{ display: 'grid', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <label style={labelS}>Team Name *</label>
                    <input
                      autoFocus
                      value={editingTeam.name}
                      onChange={e => setEditingTeam(t => t ? { ...t, name: e.target.value } : t)}
                      style={inputS}
                      required
                    />
                  </div>
                  <div>
                    <label style={labelS}>Team Color</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="color"
                        value={editingTeam.color}
                        onChange={e => setEditingTeam(t => t ? { ...t, color: e.target.value } : t)}
                        style={{ width: '44px', height: '38px', padding: '2px', border: '1px solid #2a2a2a', borderRadius: '6px', backgroundColor: '#111', cursor: 'pointer' }}
                      />
                      <span style={{ color: '#888', fontSize: '12px', fontFamily: 'monospace' }}>{editingTeam.color}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setEditingTeam(null)}
                    style={{ backgroundColor: '#2a2a2a', color: '#888', border: 'none', borderRadius: '6px', padding: '10px 20px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={editTeamSaving}
                    style={{ backgroundColor: editTeamSaving ? '#1a3a1a' : '#27AE60', color: '#fff', border: 'none', borderRadius: '6px', padding: '10px 28px', fontSize: '14px', fontWeight: 700, cursor: editTeamSaving ? 'not-allowed' : 'pointer' }}>
                    {editTeamSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Player Modal */}
        {editingPlayer && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #4A9FE3', borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '480px' }}>
              <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '18px', marginBottom: '20px' }}>Edit Player</h3>
              <form onSubmit={saveEdit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelS}>Full Name</label>
                    <input value={editingPlayer.name} onChange={e => setEditingPlayer({ ...editingPlayer, name: e.target.value })} style={inputS} required />
                  </div>
                  <div>
                    <label style={labelS}>Jersey #</label>
                    <input type="number" min="0" max="99" value={editingPlayer.number} onChange={e => setEditingPlayer({ ...editingPlayer, number: e.target.value })} style={inputS} />
                  </div>
                  <div>
                    <label style={labelS}>Position</label>
                    <select value={editingPlayer.position} onChange={e => setEditingPlayer({ ...editingPlayer, position: e.target.value })} style={{ ...inputS, cursor: 'pointer' }}>
                      {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelS}>Team</label>
                    <select value={editingPlayer.teamId} onChange={e => setEditingPlayer({ ...editingPlayer, teamId: e.target.value })} style={{ ...inputS, cursor: 'pointer' }}>
                      {allTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setEditingPlayer(null)}
                    style={{ backgroundColor: '#2a2a2a', color: '#888', border: 'none', borderRadius: '6px', padding: '9px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={editSaving}
                    style={{ backgroundColor: '#4A9FE3', color: '#fff', border: 'none', borderRadius: '6px', padding: '9px 24px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    {editSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Teams Grid */}
        {loading || loadingTeams ? (
          <div style={{ textAlign: 'center', color: '#555', padding: '60px', fontSize: '14px' }}>Loading...</div>
        ) : teamsInSeason.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#444', padding: '60px', backgroundColor: '#141414', borderRadius: '12px', border: '1px solid #2a2a2a' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🏀</div>
            <div style={{ color: '#888', fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>No teams in {selectedSeason}</div>
            <div style={{ color: '#444', fontSize: '13px' }}>Add teams via the Active Teams page, then they will appear here.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
            {teamsInSeason.map(team => {
              const teamPlayers = players.filter(p => p.teamId === team.id && !p.isSub)
              const isAddingHere = addingPlayerToTeam === team.id

              return (
                <div key={team.id} style={{ backgroundColor: '#141414', border: '1px solid #1e1e1e', borderRadius: '12px', overflow: 'hidden' }}>

                  {/* Team header — drag-drop logo zone */}
                  <div
                    style={{
                      background: `linear-gradient(135deg, ${team.color}18 0%, transparent 60%)`,
                      borderBottom: `2px solid ${team.color}`,
                      padding: '14px 16px',
                      display: 'flex', alignItems: 'center', gap: '12px',
                      transition: 'background 0.15s',
                      backgroundColor: draggingOver === team.id ? team.color + '22' : undefined,
                    }}
                    onDragOver={e => { e.preventDefault(); setDraggingOver(team.id) }}
                    onDragLeave={() => setDraggingOver(null)}
                    onDrop={e => {
                      e.preventDefault(); setDraggingOver(null)
                      const f = e.dataTransfer.files?.[0]
                      if (f && f.type.startsWith('image/')) uploadLogo(team.id, f)
                    }}
                  >
                    {/* Logo drop zone */}
                    <label
                      style={{
                        cursor: 'pointer', flexShrink: 0,
                        width: '48px', height: '48px', borderRadius: '8px',
                        border: draggingOver === team.id ? `2px dashed ${team.color}` : team.logo ? 'none' : '1px dashed #3a3a3a',
                        backgroundColor: draggingOver === team.id ? team.color + '33' : team.logo ? 'transparent' : '#1e1e1e',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden', transition: 'all 0.15s',
                      }}
                      title={team.logo ? 'Click to replace logo' : 'Click or drag to upload logo'}
                    >
                      {uploadingLogo === team.id ? (
                        <span style={{ color: '#555', fontSize: '10px' }}>…</span>
                      ) : team.logo ? (
                        <img src={team.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ color: draggingOver === team.id ? team.color : '#444', fontSize: '22px' }}>+</span>
                      )}
                      <input type="file" accept="image/*" style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(team.id, f) }} />
                    </label>

                    {/* Team info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <h3 style={{ color: '#fff', fontWeight: 800, fontSize: '15px', margin: 0 }}>{team.name}</h3>
                        <span style={{
                          backgroundColor: team.league === 'Comp' ? '#1a2a4a' : '#1a3a1a',
                          color: team.league === 'Comp' ? '#4A9FE3' : '#27AE60',
                          fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
                        }}>{team.league}</span>
                        {team.active && (
                          <span style={{ backgroundColor: '#1a4731', color: '#27AE60', border: '1px solid #27AE60', borderRadius: '4px', padding: '1px 8px', fontSize: '10px', fontWeight: 700 }}>● LIVE</span>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); setEditingTeam({ id: team.id, name: team.name, color: team.color }) }}
                          style={{ marginLeft: 'auto', backgroundColor: '#1e1e1e', color: '#555', border: '1px solid #2a2a2a', borderRadius: '4px', padding: '2px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                        >Edit</button>
                      </div>
                      <div style={{ color: '#444', fontSize: '11px', marginTop: '3px' }}>
                        {draggingOver === team.id
                          ? <span style={{ color: team.color, fontWeight: 700 }}>Drop to upload logo</span>
                          : <span>{teamPlayers.length} player{teamPlayers.length !== 1 ? 's' : ''} · {team.logo ? 'Click logo to replace' : 'Click + or drag to add logo'}</span>
                        }
                      </div>
                    </div>
                  </div>

                  {/* Roster table */}
                  {teamPlayers.length > 0 && (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#0f0f0f' }}>
                          <th style={{ padding: '7px 14px', textAlign: 'left', color: '#444', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em' }}>#</th>
                          <th style={{ padding: '7px 14px', textAlign: 'left', color: '#444', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em' }}>PLAYER</th>
                          <th style={{ padding: '7px 10px', textAlign: 'center', color: '#444', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em' }}>POS</th>
                          <th style={{ padding: '7px 14px', textAlign: 'right', color: '#444', fontSize: '10px', fontWeight: 700 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamPlayers.sort((a, b) => a.number - b.number).map((p, i) => (
                          <tr key={p.id} style={{ borderBottom: '1px solid #1a1a1a', backgroundColor: i % 2 === 0 ? 'transparent' : '#111' }}>
                            <td style={{ padding: '9px 14px', color: team.color, fontWeight: 700, fontSize: '13px' }}>{p.number}</td>
                            <td style={{ padding: '9px 14px', color: '#ccc', fontSize: '13px' }}>{p.name}</td>
                            <td style={{ padding: '9px 10px', textAlign: 'center' }}>
                              <span style={{ backgroundColor: '#2a2a2a', color: '#777', padding: '1px 7px', borderRadius: '3px', fontSize: '10px', fontWeight: 700 }}>{p.position}</span>
                            </td>
                            <td style={{ padding: '9px 14px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => setEditingPlayer({ id: p.id, name: p.name, number: String(p.number), position: p.position, teamId: p.teamId })}
                                  style={{ backgroundColor: '#1a3a5c', color: '#4A9FE3', border: 'none', borderRadius: '4px', padding: '3px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                                >Edit</button>
                                <button
                                  onClick={() => deletePlayer(p.id)}
                                  style={{ backgroundColor: '#3a1a1a', color: '#e74c3c', border: 'none', borderRadius: '4px', padding: '3px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                                >✕</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {teamPlayers.length === 0 && !isAddingHere && (
                    <div style={{ padding: '16px', textAlign: 'center', color: '#444', fontSize: '13px' }}>No players yet</div>
                  )}

                  {/* Add player inline form */}
                  {isAddingHere ? (
                    <div style={{ padding: '14px', backgroundColor: '#0f0f0f', borderTop: '1px solid #1e1e1e' }}>
                      <form onSubmit={addPlayer}>
                        {/* Search existing players */}
                        <div style={{ marginBottom: '10px', position: 'relative' }}>
                          <label style={labelS}>Search existing player or type new name *</label>
                          <input
                            autoFocus
                            value={playerSearchQuery}
                            onChange={e => {
                              const q = e.target.value
                              setPlayerSearchQuery(q)
                              setNewPlayer(p => ({ ...p, name: q }))
                              setShowSuggestions(q.length > 0)
                            }}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                            style={{ ...inputS, borderColor: '#3a3a3a' }}
                            placeholder="Search by name..."
                            required
                          />
                          {showSuggestions && (() => {
                            const q = playerSearchQuery.toLowerCase()
                            const suggestions = allDbPlayers.filter(p =>
                              p.name.toLowerCase().includes(q) && p.teamId !== newPlayer.teamId
                            ).slice(0, 8)
                            return suggestions.length > 0 ? (
                              <div style={{
                                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                                backgroundColor: '#1a1a1a', border: '1px solid #3a3a3a', borderRadius: '6px',
                                marginTop: '2px', maxHeight: '200px', overflowY: 'auto',
                              }}>
                                {suggestions.map(p => (
                                  <div
                                    key={p.id}
                                    onMouseDown={() => {
                                      setNewPlayer(prev => ({
                                        ...prev,
                                        name: p.name,
                                        number: String(p.number),
                                        position: p.position,
                                      }))
                                      setPlayerSearchQuery(p.name)
                                      setShowSuggestions(false)
                                    }}
                                    style={{
                                      padding: '9px 12px', cursor: 'pointer', display: 'flex',
                                      alignItems: 'center', justifyContent: 'space-between',
                                      borderBottom: '1px solid #2a2a2a',
                                    }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = '#2a2a2a'}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}
                                  >
                                    <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>{p.name}</span>
                                    <span style={{ color: '#555', fontSize: '11px' }}>#{p.number} · {p.position}</span>
                                  </div>
                                ))}
                              </div>
                            ) : null
                          })()}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                          <div>
                            <label style={labelS}># Jersey</label>
                            <input
                              type="number" min="0" max="99"
                              value={newPlayer.number}
                              onChange={e => setNewPlayer({ ...newPlayer, number: e.target.value })}
                              style={inputS} placeholder="0" required
                            />
                          </div>
                          <div>
                            <label style={labelS}>Position</label>
                            <select
                              value={newPlayer.position}
                              onChange={e => setNewPlayer({ ...newPlayer, position: e.target.value })}
                              style={{ ...inputS, cursor: 'pointer' }}
                            >
                              {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button type="submit" disabled={savingPlayer}
                            style={{ backgroundColor: '#27AE60', color: '#fff', border: 'none', borderRadius: '6px', padding: '9px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', flex: 1 }}>
                            {savingPlayer ? 'Adding...' : 'Add Player'}
                          </button>
                          <button type="button" onClick={() => {
                            setAddingPlayerToTeam(null)
                            setNewPlayer({ name: '', number: '', position: 'G', teamId: '' })
                            setPlayerSearchQuery('')
                          }}
                            style={{ backgroundColor: '#2a2a2a', color: '#666', border: 'none', borderRadius: '6px', padding: '9px 14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  ) : (
                    <div style={{ padding: '10px 14px', borderTop: '1px solid #1a1a1a' }}>
                      <button
                        onClick={() => { setAddingPlayerToTeam(team.id); setNewPlayer({ name: '', number: '', position: 'G', teamId: team.id }) }}
                        style={{ backgroundColor: 'transparent', color: '#444', border: '1px dashed #2a2a2a', borderRadius: '6px', padding: '6px 0', fontSize: '12px', fontWeight: 700, cursor: 'pointer', width: '100%', transition: 'all 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#27AE60'; (e.currentTarget as HTMLElement).style.color = '#27AE60' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2a2a2a'; (e.currentTarget as HTMLElement).style.color = '#444' }}
                      >
                        + Add Player
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
