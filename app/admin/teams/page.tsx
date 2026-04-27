'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'

interface Team { id: string; name: string; slug: string; color: string; logo?: string; active: boolean; league: string }
interface Player { id: string; name: string; number: number; position: string; teamId: string; isSub: boolean; team: Team }
interface EditingPlayer { id: string; name: string; number: string; position: string; teamId: string }

const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F']

const inputS = {
  backgroundColor: '#111', color: '#fff', border: '1px solid #2a2a2a',
  borderRadius: '6px', padding: '8px 12px', fontSize: '14px', outline: 'none',
  width: '100%', boxSizing: 'border-box' as const,
}
const labelS = { color: '#999', fontSize: '12px', fontWeight: 600 as const, display: 'block', marginBottom: '4px' }

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok')

  // Add-to-season search
  const [searchQuery, setSearchQuery] = useState('')
  const [addingTo, setAddingTo] = useState<'Comp' | 'Rec' | null>(null)

  // All-teams browser
  const [teamSearch, setTeamSearch] = useState('')
  const [showActiveOnly, setShowActiveOnly] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState<string | null>(null)

  // Forms
  const [showPlayerForm, setShowPlayerForm] = useState(false)
  const [newPlayer, setNewPlayer] = useState({ name: '', number: '', position: 'G', teamId: '' })
  const [editingPlayer, setEditingPlayer] = useState<EditingPlayer | null>(null)
  const [saving, setSaving] = useState(false)
  const [editSaving, setEditSaving] = useState(false)

  const load = async () => {
    const [t, p] = await Promise.all([
      fetch('/api/teams').then(r => r.json()),
      fetch('/api/admin/players').then(r => r.json()),
    ])
    setTeams(Array.isArray(t) ? t : [])
    setPlayers(Array.isArray(p) ? p : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const showMsg = (text: string, type: 'ok' | 'err' = 'ok') => {
    setMsg(text); setMsgType(type)
    setTimeout(() => setMsg(''), 3000)
  }

  const patchTeam = async (id: string, data: Partial<Team>) => {
    const res = await fetch('/api/teams', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...data }),
    })
    if (!res.ok) { showMsg('Failed to update team', 'err'); throw new Error('patch failed') }
    // Optimistically update local state immediately so the UI reflects the change
    setTeams(prev => prev.map(t => t.id === id ? { ...t, ...data } : t))
    // Then sync with server in background
    load()
  }

  const uploadLogo = async (teamId: string, file: File) => {
    setUploadingLogo(teamId)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('teamId', teamId)
    const res = await fetch('/api/admin/upload-logo', { method: 'POST', body: fd })
    if (res.ok) { showMsg('Logo uploaded!'); await load() }
    else { showMsg('Upload failed', 'err') }
    setUploadingLogo(null)
  }

  const activateForLeague = async (team: Team, league: 'Comp' | 'Rec') => {
    try {
      await patchTeam(team.id, { active: true, league })
      showMsg(`${team.name} added to D2 ${league} League`)
      setAddingTo(null)
      setSearchQuery('')
    } catch { /* error already shown by patchTeam */ }
  }

  const deactivate = async (team: Team) => {
    try {
      await patchTeam(team.id, { active: false })
      showMsg(`${team.name} removed from live season`)
    } catch { /* error already shown by patchTeam */ }
  }

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/admin/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPlayer),
    })
    if (res.ok) { showMsg('Player added!'); setShowPlayerForm(false); setNewPlayer({ name: '', number: '', position: 'G', teamId: '' }); load() }
    else showMsg('Error adding player', 'err')
    setSaving(false)
  }

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPlayer) return
    setEditSaving(true)
    const res = await fetch('/api/admin/players', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingPlayer),
    })
    if (res.ok) { showMsg('Player updated!'); setEditingPlayer(null); load() }
    else showMsg('Error updating player', 'err')
    setEditSaving(false)
  }

  const deletePlayer = async (id: string) => {
    if (!confirm('Remove this player? All their stats will also be removed.')) return
    await fetch(`/api/admin/players?id=${id}`, { method: 'DELETE' })
    load()
  }

  const liveComp = teams.filter(t => t.active && t.league === 'Comp')
  const liveRec  = teams.filter(t => t.active && t.league === 'Rec')

  const searchResults = searchQuery.length > 1
    ? teams.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 8)
    : []

  const filteredAll = teams.filter(t =>
    (!showActiveOnly || t.active) &&
    (!teamSearch || t.name.toLowerCase().includes(teamSearch.toLowerCase()))
  )

  return (
    <AdminLayout>
      <div style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ color: '#fff', fontSize: '26px', fontWeight: 900 }}>Teams & Rosters</h1>
          <p style={{ color: '#555', fontSize: '14px' }}>D2 2026 Summer Season</p>
        </div>

        {msg && (
          <div style={{ backgroundColor: msgType === 'ok' ? '#1a3a5c' : '#4a1919', border: `1px solid ${msgType === 'ok' ? '#4A9FE3' : '#e74c3c'}`, color: msgType === 'ok' ? '#4A9FE3' : '#e74c3c', padding: '10px 16px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>
            {msg}
          </div>
        )}

        {/* ── Live Season ── */}
        <div style={{ backgroundColor: '#0d1a0d', border: '1px solid #27AE60', borderRadius: '14px', padding: '24px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ color: '#27AE60', fontWeight: 800, fontSize: '16px', marginBottom: '2px' }}>● Live Season — D2 2026 Summer</h2>
              <p style={{ color: '#3a6a3a', fontSize: '12px' }}>These teams appear in the player registration dropdown</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { setAddingTo('Comp'); setSearchQuery('') }}
                style={{ backgroundColor: '#4A9FE3', color: '#fff', border: 'none', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                + Add to Comp
              </button>
              <button
                onClick={() => { setAddingTo('Rec'); setSearchQuery('') }}
                style={{ backgroundColor: '#27AE60', color: '#fff', border: 'none', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                + Add to Rec
              </button>
            </div>
          </div>

          {/* Search panel */}
          {addingTo && (
            <div style={{ backgroundColor: '#111', border: `1px solid ${addingTo === 'Comp' ? '#4A9FE3' : '#27AE60'}`, borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ color: addingTo === 'Comp' ? '#4A9FE3' : '#27AE60', fontWeight: 700, fontSize: '13px', marginBottom: '10px' }}>
                Search to add team to D2 {addingTo} League:
              </div>
              <input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Type team name..."
                style={{ ...inputS, marginBottom: '10px' }}
              />
              {searchResults.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {searchResults.map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1a1a1a', borderRadius: '6px', padding: '8px 12px' }}>
                      <div>
                        <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>{t.name}</span>
                        <span style={{ color: '#555', fontSize: '11px', marginLeft: '8px' }}>{t.league}</span>
                        {t.active && <span style={{ color: '#27AE60', fontSize: '10px', marginLeft: '6px', fontWeight: 700 }}>ACTIVE</span>}
                      </div>
                      <button
                        onClick={() => activateForLeague(t, addingTo)}
                        style={{ backgroundColor: addingTo === 'Comp' ? '#1a3a5c' : '#1a4731', color: addingTo === 'Comp' ? '#4A9FE3' : '#27AE60', border: 'none', borderRadius: '4px', padding: '4px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {searchQuery.length > 1 && searchResults.length === 0 && (
                <div style={{ color: '#555', fontSize: '13px' }}>No teams found</div>
              )}
              <button onClick={() => { setAddingTo(null); setSearchQuery('') }}
                style={{ marginTop: '12px', backgroundColor: 'transparent', color: '#555', border: 'none', fontSize: '12px', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          )}

          {/* Two columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Comp */}
            <div>
              <div style={{ color: '#4A9FE3', fontWeight: 700, fontSize: '13px', marginBottom: '10px', letterSpacing: '0.05em' }}>
                🏆 COMP LEAGUE · {liveComp.length} teams
              </div>
              {liveComp.length === 0 ? (
                <div style={{ color: '#2a4a2a', fontSize: '13px', padding: '16px', border: '1px dashed #1a3a1a', borderRadius: '8px', textAlign: 'center' }}>No teams yet</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {liveComp.map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#111', borderRadius: '8px', padding: '9px 12px', border: '1px solid #1a2a1a' }}>
                      <span style={{ color: '#eee', fontSize: '13px', fontWeight: 600 }}>{t.name}</span>
                      <button onClick={() => deactivate(t)}
                        style={{ backgroundColor: '#2a1a1a', color: '#e74c3c', border: '1px solid #3a1a1a', borderRadius: '4px', padding: '2px 8px', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rec */}
            <div>
              <div style={{ color: '#27AE60', fontWeight: 700, fontSize: '13px', marginBottom: '10px', letterSpacing: '0.05em' }}>
                🏀 REC LEAGUE · {liveRec.length} teams
              </div>
              {liveRec.length === 0 ? (
                <div style={{ color: '#2a4a2a', fontSize: '13px', padding: '16px', border: '1px dashed #1a3a1a', borderRadius: '8px', textAlign: 'center' }}>No teams yet</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {liveRec.map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#111', borderRadius: '8px', padding: '9px 12px', border: '1px solid #1a2a1a' }}>
                      <span style={{ color: '#eee', fontSize: '13px', fontWeight: 600 }}>{t.name}</span>
                      <button onClick={() => deactivate(t)}
                        style={{ backgroundColor: '#2a1a1a', color: '#e74c3c', border: '1px solid #3a1a1a', borderRadius: '4px', padding: '2px 8px', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}>
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Player management ── */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button onClick={() => setShowPlayerForm(!showPlayerForm)}
            style={{ backgroundColor: '#27AE60', color: '#fff', fontWeight: 700, fontSize: '13px', padding: '8px 18px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>
            {showPlayerForm ? 'Cancel' : '+ Add Player'}
          </button>
        </div>

        {showPlayerForm && (
          <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
            <h3 style={{ color: '#fff', fontWeight: 700, marginBottom: '16px' }}>Add New Player</h3>
            <form onSubmit={addPlayer}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={labelS}>Team *</label>
                  <select value={newPlayer.teamId} onChange={e => setNewPlayer({ ...newPlayer, teamId: e.target.value })}
                    style={{ ...inputS, cursor: 'pointer' }} required>
                    <option value="">Select team</option>
                    {teams.filter(t => t.active).map(t => <option key={t.id} value={t.id}>{t.name} ({t.league})</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelS}>Name *</label>
                  <input value={newPlayer.name} onChange={e => setNewPlayer({ ...newPlayer, name: e.target.value })} style={inputS} placeholder="Player Name" required />
                </div>
                <div>
                  <label style={labelS}># (Jersey)</label>
                  <input type="number" min="0" max="99" value={newPlayer.number}
                    onChange={e => setNewPlayer({ ...newPlayer, number: e.target.value })} style={inputS} placeholder="23" required />
                </div>
                <div>
                  <label style={labelS}>Position</label>
                  <select value={newPlayer.position} onChange={e => setNewPlayer({ ...newPlayer, position: e.target.value })}
                    style={{ ...inputS, cursor: 'pointer' }}>
                    {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={saving}
                style={{ backgroundColor: '#27AE60', color: '#fff', fontWeight: 700, fontSize: '13px', padding: '8px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>
                {saving ? 'Saving...' : 'Add Player'}
              </button>
            </form>
          </div>
        )}

        {/* Edit Player Modal */}
        {editingPlayer && (
          <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
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
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
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

        {/* ── All Teams browser ── */}
        <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: '24px', marginTop: '8px' }}>
          <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '16px', marginBottom: '14px' }}>All Teams & Rosters</h2>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              value={teamSearch}
              onChange={e => setTeamSearch(e.target.value)}
              placeholder="Search teams..."
              style={{ ...inputS, flex: '1', minWidth: '160px', width: 'auto' }}
            />
            <button
              onClick={() => setShowActiveOnly(!showActiveOnly)}
              style={{ backgroundColor: showActiveOnly ? '#1a4731' : '#2a2a2a', color: showActiveOnly ? '#27AE60' : '#666', border: `1px solid ${showActiveOnly ? '#27AE60' : '#3a3a3a'}`, borderRadius: '6px', padding: '7px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {showActiveOnly ? '● Active only' : '○ Show all'}
            </button>
            <span style={{ color: '#444', fontSize: '12px' }}>{filteredAll.length} teams</span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', color: '#555', padding: '48px' }}>Loading...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
              {filteredAll.map(team => {
                const teamPlayers = players.filter(p => p.teamId === team.id && !p.isSub)
                return (
                  <div key={team.id} style={{ backgroundColor: '#1a1a1a', border: `1px solid ${team.active ? '#1a3a1a' : '#2a2a2a'}`, borderRadius: '12px', overflow: 'hidden' }}>
                    <div style={{ backgroundColor: team.color + '22', borderBottom: `2px solid ${team.color}`, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {team.logo ? (
                        <img src={team.logo} alt="" style={{ width: '28px', height: '28px', objectFit: 'contain', borderRadius: '4px', flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: '10px', height: '10px', backgroundColor: team.color, borderRadius: '50%', flexShrink: 0 }} />
                      )}
                      <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>{team.name}</h3>
                      <span style={{ color: '#555', fontSize: '11px' }}>{team.league}</span>
                      <span style={{ color: '#444', fontSize: '11px' }}>· {teamPlayers.length} players</span>
                      {team.active && (
                        <span style={{ backgroundColor: '#1a4731', color: '#27AE60', border: '1px solid #27AE60', borderRadius: '4px', padding: '1px 8px', fontSize: '10px', fontWeight: 700 }}>● LIVE</span>
                      )}
                      <label style={{ marginLeft: 'auto', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#2a2a2a', border: '1px solid #3a3a3a', borderRadius: '5px', padding: '3px 8px', fontSize: '11px', color: uploadingLogo === team.id ? '#888' : '#aaa', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {uploadingLogo === team.id ? 'Uploading…' : team.logo ? '🖼 Logo' : '+ Logo'}
                        <input type="file" accept="image/*" style={{ display: 'none' }}
                          onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(team.id, f) }} />
                      </label>
                    </div>
                    {teamPlayers.length === 0 ? (
                      <div style={{ color: '#444', padding: '16px', textAlign: 'center', fontSize: '13px' }}>No players</div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#111' }}>
                            <th style={{ padding: '7px 12px', textAlign: 'left', color: '#555', fontSize: '11px', fontWeight: 700 }}>#</th>
                            <th style={{ padding: '7px 12px', textAlign: 'left', color: '#555', fontSize: '11px', fontWeight: 700 }}>Name</th>
                            <th style={{ padding: '7px 12px', textAlign: 'center', color: '#555', fontSize: '11px', fontWeight: 700 }}>Pos</th>
                            <th style={{ padding: '7px 12px', textAlign: 'right', color: '#555', fontSize: '11px', fontWeight: 700 }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teamPlayers.map((p, i) => (
                            <tr key={p.id} style={{ backgroundColor: i % 2 === 0 ? '#1a1a1a' : '#141414', borderBottom: '1px solid #222' }}>
                              <td style={{ padding: '9px 12px', color: team.color, fontWeight: 700, fontSize: '13px' }}>{p.number}</td>
                              <td style={{ padding: '9px 12px', color: '#ccc', fontSize: '13px' }}>{p.name}</td>
                              <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                                <span style={{ backgroundColor: '#2a2a2a', color: '#888', padding: '1px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: 700 }}>{p.position}</span>
                              </td>
                              <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                  <button onClick={() => setEditingPlayer({ id: p.id, name: p.name, number: String(p.number), position: p.position, teamId: p.teamId })}
                                    style={{ backgroundColor: '#1a3a5c', color: '#4A9FE3', border: 'none', borderRadius: '4px', padding: '3px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                                    Edit
                                  </button>
                                  <button onClick={() => deletePlayer(p.id)}
                                    style={{ backgroundColor: '#4a1919', color: '#e74c3c', border: 'none', borderRadius: '4px', padding: '3px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                                    Remove
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
