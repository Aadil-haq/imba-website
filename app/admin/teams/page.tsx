'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'

interface Team { id: string; name: string; slug: string; color: string }
interface Player { id: string; name: string; number: number; position: string; teamId: string; isSub: boolean; team: Team }

interface EditingPlayer {
  id: string; name: string; number: string; position: string; teamId: string
}

const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F']

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [showTeamForm, setShowTeamForm] = useState(false)
  const [showPlayerForm, setShowPlayerForm] = useState(false)
  const [newTeam, setNewTeam] = useState({ name: '', slug: '', color: '#4A9FE3' })
  const [newPlayer, setNewPlayer] = useState({ name: '', number: '', position: 'G', teamId: '' })
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<EditingPlayer | null>(null)
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

  const showMsg = (text: string) => {
    setMsg(text)
    setTimeout(() => setMsg(''), 3000)
  }

  const addTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newTeam, slug: newTeam.slug || newTeam.name.toLowerCase().replace(/\s+/g, '-') }),
    })
    if (res.ok) {
      showMsg('Team added!')
      setShowTeamForm(false)
      setNewTeam({ name: '', slug: '', color: '#4A9FE3' })
      load()
    } else { showMsg('Error adding team') }
    setSaving(false)
  }

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/admin/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPlayer),
    })
    if (res.ok) {
      showMsg('Player added!')
      setShowPlayerForm(false)
      setNewPlayer({ name: '', number: '', position: 'G', teamId: '' })
      load()
    } else { showMsg('Error adding player') }
    setSaving(false)
  }

  const startEdit = (p: Player) => {
    setEditingPlayer({ id: p.id, name: p.name, number: String(p.number), position: p.position, teamId: p.teamId })
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
    if (res.ok) {
      showMsg('Player updated!')
      setEditingPlayer(null)
      load()
    } else { showMsg('Error updating player') }
    setEditSaving(false)
  }

  const deletePlayer = async (id: string) => {
    if (!confirm('Remove this player? All their stats will also be removed.')) return
    await fetch(`/api/admin/players?id=${id}`, { method: 'DELETE' })
    load()
  }

  const inputS = {
    backgroundColor: '#111', color: '#fff', border: '1px solid #2a2a2a',
    borderRadius: '6px', padding: '8px 12px', fontSize: '14px', outline: 'none',
    width: '100%', boxSizing: 'border-box' as const,
  }
  const labelS = { color: '#999', fontSize: '12px', fontWeight: 600 as const, display: 'block', marginBottom: '4px' }

  return (
    <AdminLayout>
      <div style={{ padding: '32px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ color: '#fff', fontSize: '26px', fontWeight: 900 }}>Teams & Rosters</h1>
          <p style={{ color: '#555', fontSize: '14px' }}>Manage teams and players · Click a player row to edit</p>
        </div>

        {msg && (
          <div style={{ backgroundColor: '#1a3a5c', border: '1px solid #4A9FE3', color: '#4A9FE3', padding: '10px 16px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>
            {msg}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <button onClick={() => { setShowTeamForm(!showTeamForm); setShowPlayerForm(false) }}
            style={{ backgroundColor: '#4A9FE3', color: '#fff', fontWeight: 700, fontSize: '13px', padding: '8px 18px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>
            {showTeamForm ? 'Cancel' : '+ Add Team'}
          </button>
          <button onClick={() => { setShowPlayerForm(!showPlayerForm); setShowTeamForm(false) }}
            style={{ backgroundColor: '#27AE60', color: '#fff', fontWeight: 700, fontSize: '13px', padding: '8px 18px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>
            {showPlayerForm ? 'Cancel' : '+ Add Player'}
          </button>
        </div>

        {/* Add Team Form */}
        {showTeamForm && (
          <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
            <h3 style={{ color: '#fff', fontWeight: 700, marginBottom: '16px' }}>Add New Team</h3>
            <form onSubmit={addTeam}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={labelS}>Team Name *</label>
                  <input value={newTeam.name} onChange={e => setNewTeam({ ...newTeam, name: e.target.value })} style={inputS} placeholder="Thunder" required />
                </div>
                <div>
                  <label style={labelS}>Slug (URL)</label>
                  <input value={newTeam.slug} onChange={e => setNewTeam({ ...newTeam, slug: e.target.value })} style={inputS} placeholder="auto-generated" />
                </div>
                <div>
                  <label style={labelS}>Team Color</label>
                  <input type="color" value={newTeam.color} onChange={e => setNewTeam({ ...newTeam, color: e.target.value })}
                    style={{ ...inputS, height: '38px', cursor: 'pointer' }} />
                </div>
              </div>
              <button type="submit" disabled={saving}
                style={{ backgroundColor: '#4A9FE3', color: '#fff', fontWeight: 700, fontSize: '13px', padding: '8px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>
                {saving ? 'Saving...' : 'Add Team'}
              </button>
            </form>
          </div>
        )}

        {/* Add Player Form */}
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
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
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
                    <input value={editingPlayer.name}
                      onChange={e => setEditingPlayer({ ...editingPlayer, name: e.target.value })}
                      style={inputS} placeholder="Player Name" required />
                  </div>
                  <div>
                    <label style={labelS}>Jersey #</label>
                    <input type="number" min="0" max="99" value={editingPlayer.number}
                      onChange={e => setEditingPlayer({ ...editingPlayer, number: e.target.value })}
                      style={inputS} placeholder="23" />
                  </div>
                  <div>
                    <label style={labelS}>Position</label>
                    <select value={editingPlayer.position}
                      onChange={e => setEditingPlayer({ ...editingPlayer, position: e.target.value })}
                      style={{ ...inputS, cursor: 'pointer' }}>
                      {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelS}>Team</label>
                    <select value={editingPlayer.teamId}
                      onChange={e => setEditingPlayer({ ...editingPlayer, teamId: e.target.value })}
                      style={{ ...inputS, cursor: 'pointer' }}>
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

        {/* Team Roster Lists */}
        {loading ? (
          <div style={{ textAlign: 'center', color: '#555', padding: '48px' }}>Loading...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
            {teams.map(team => {
              const teamPlayers = players.filter(p => p.teamId === team.id && !p.isSub)
              return (
                <div key={team.id} style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ backgroundColor: team.color + '22', borderBottom: `2px solid ${team.color}`, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '10px', height: '10px', backgroundColor: team.color, borderRadius: '50%' }} />
                    <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>{team.name}</h3>
                    <span style={{ marginLeft: 'auto', color: '#555', fontSize: '12px' }}>{teamPlayers.length} players</span>
                  </div>
                  {teamPlayers.length === 0 ? (
                    <div style={{ color: '#444', padding: '20px', textAlign: 'center', fontSize: '13px' }}>No players yet</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#111' }}>
                          <th style={{ padding: '8px 12px', textAlign: 'left', color: '#555', fontSize: '11px', fontWeight: 700 }}>#</th>
                          <th style={{ padding: '8px 12px', textAlign: 'left', color: '#555', fontSize: '11px', fontWeight: 700 }}>Name</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center', color: '#555', fontSize: '11px', fontWeight: 700 }}>Pos</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right', color: '#555', fontSize: '11px', fontWeight: 700 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamPlayers.map((p, i) => (
                          <tr key={p.id} style={{ backgroundColor: i % 2 === 0 ? '#1a1a1a' : '#141414', borderBottom: '1px solid #222' }}>
                            <td style={{ padding: '10px 12px', color: team.color, fontWeight: 700, fontSize: '13px' }}>{p.number}</td>
                            <td style={{ padding: '10px 12px', color: '#ccc', fontSize: '13px' }}>{p.name}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <span style={{ backgroundColor: '#2a2a2a', color: '#888', padding: '1px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: 700 }}>{p.position}</span>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                <button
                                  onClick={() => startEdit(p)}
                                  style={{ backgroundColor: '#1a3a5c', color: '#4A9FE3', border: 'none', borderRadius: '4px', padding: '3px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => deletePlayer(p.id)}
                                  style={{ backgroundColor: '#4a1919', color: '#e74c3c', border: 'none', borderRadius: '4px', padding: '3px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                                >
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
    </AdminLayout>
  )
}
