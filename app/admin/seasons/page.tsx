'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'

interface SeasonRow {
  season: string
  league: string
  active: boolean
}

const inputS: React.CSSProperties = {
  backgroundColor: '#111', color: '#fff', border: '1px solid #2a2a2a',
  borderRadius: '6px', padding: '8px 12px', fontSize: '14px', outline: 'none',
  width: '100%', boxSizing: 'border-box',
}

export default function SeasonsAdminPage() {
  const [seasons, setSeasons] = useState<SeasonRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [showNewForm, setShowNewForm] = useState(false)
  const [newSeason, setNewSeason] = useState({ name: '', league: 'Comp' })
  const [creating, setCreating] = useState(false)

  const load = () => {
    fetch('/api/admin/seasons')
      .then(r => r.json())
      .then(data => { setSeasons(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const toggle = (season: string) => {
    setSeasons(prev =>
      prev.map(s => s.season === season ? { ...s, active: !s.active } : s)
    )
  }

  const handleSave = async () => {
    setSaving(true)
    setMsg('')
    const activeSeasons = seasons.filter(s => s.active).map(s => s.season)
    const res = await fetch('/api/admin/seasons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activeSeasons }),
    })
    setSaving(false)
    setMsg(res.ok ? '✓ Active seasons saved! Homepage now reflects this.' : '✗ Error saving.')
    setTimeout(() => setMsg(''), 5000)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSeason.name.trim()) return
    setCreating(true)
    // Create a placeholder game record to register the season in the DB
    // We use the admin/seasons endpoint with a PUT to register a new season name
    const res = await fetch('/api/admin/seasons', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ season: newSeason.name.trim(), league: newSeason.league }),
    })
    if (res.ok) {
      setMsg('✓ Season created!')
      setNewSeason({ name: '', league: 'Comp' })
      setShowNewForm(false)
      load()
    } else {
      const d = await res.json().catch(() => ({}))
      setMsg(`✗ ${d.error || 'Error creating season'}`)
    }
    setCreating(false)
    setTimeout(() => setMsg(''), 4000)
  }

  const activeCount = seasons.filter(s => s.active).length

  return (
    <AdminLayout>
      <div style={{ padding: '32px', maxWidth: '780px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: '26px', fontWeight: 900, marginBottom: '4px' }}>Seasons</h1>
            <p style={{ color: '#555', fontSize: '13px' }}>
              Toggle which seasons appear on the homepage. Create new seasons to start scheduling.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowNewForm(!showNewForm)}
              style={{ backgroundColor: '#1a2a1a', color: '#27AE60', border: '1px solid #27AE60', borderRadius: '8px', padding: '10px 18px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
            >
              {showNewForm ? 'Cancel' : '+ New Season'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{ backgroundColor: saving ? '#2a2a2a' : '#4A9FE3', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', fontWeight: 700, fontSize: '14px', cursor: saving ? 'not-allowed' : 'pointer' }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {msg && (
          <div style={{
            backgroundColor: msg.startsWith('✓') ? '#0a3a1a' : '#3a0a0a',
            border: `1px solid ${msg.startsWith('✓') ? '#27AE60' : '#e74c3c'}`,
            color: msg.startsWith('✓') ? '#27AE60' : '#e74c3c',
            padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px', fontWeight: 600,
          }}>
            {msg}
          </div>
        )}

        {/* New Season Form */}
        {showNewForm && (
          <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #27AE60', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '16px', marginBottom: '16px' }}>Create New Season</h3>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px auto', gap: '12px', alignItems: 'end' }}>
                <div>
                  <label style={{ color: '#999', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Season Name *</label>
                  <input
                    type="text"
                    value={newSeason.name}
                    onChange={e => setNewSeason(p => ({ ...p, name: e.target.value }))}
                    style={inputS}
                    placeholder="e.g. D1 2025-26 Winter"
                    required
                  />
                </div>
                <div>
                  <label style={{ color: '#999', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>League</label>
                  <select
                    value={newSeason.league}
                    onChange={e => setNewSeason(p => ({ ...p, league: e.target.value }))}
                    style={{ ...inputS, cursor: 'pointer' }}
                  >
                    {['Comp', 'Rec', '35+', 'Rec League', 'U17'].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={creating}
                  style={{ backgroundColor: '#27AE60', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 20px', fontWeight: 700, fontSize: '14px', cursor: creating ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
              <p style={{ color: '#555', fontSize: '12px', marginTop: '10px' }}>
                The season will appear in the Games page and can be used when scheduling games.
              </p>
            </form>
          </div>
        )}

        {/* Info Banner */}
        <div style={{ backgroundColor: '#1a3a5c', border: '1px solid #4A9FE3', borderRadius: '10px', padding: '14px 18px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>ℹ️</span>
          <span style={{ color: '#aaddff', fontSize: '13px' }}>
            <strong style={{ color: '#fff' }}>{activeCount} active season{activeCount !== 1 ? 's' : ''}</strong> will show on the homepage.
            Active seasons appear as separate leaderboard cards on the home page.
          </span>
        </div>

        {/* Seasons List */}
        {loading ? (
          <div style={{ color: '#555', padding: '40px', textAlign: 'center' }}>Loading seasons...</div>
        ) : (
          <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #2a2a2a', backgroundColor: '#0d0d0d' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 80px', gap: '12px' }}>
                {['Season', 'League', 'Active'].map(h => (
                  <span key={h} style={{ color: '#555', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: h === 'Active' ? 'center' : 'left' }}>{h}</span>
                ))}
              </div>
            </div>
            {seasons.length === 0 && (
              <div style={{ padding: '32px', textAlign: 'center', color: '#555' }}>No seasons found.</div>
            )}
            {seasons.map((s, i) => (
              <div
                key={`${s.season}-${s.league}`}
                style={{
                  padding: '16px 20px',
                  borderBottom: i < seasons.length - 1 ? '1px solid #222' : 'none',
                  backgroundColor: s.active ? '#0d1e2e' : 'transparent',
                  transition: 'background-color 0.15s',
                  display: 'grid',
                  gridTemplateColumns: '1fr 120px 80px',
                  gap: '12px',
                  alignItems: 'center',
                }}
              >
                <div>
                  <span style={{ color: s.active ? '#fff' : '#888', fontWeight: s.active ? 700 : 400, fontSize: '14px' }}>
                    {s.season}
                  </span>
                  {s.active && (
                    <span style={{ marginLeft: '10px', backgroundColor: '#1a4731', color: '#27AE60', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
                      ACTIVE
                    </span>
                  )}
                </div>
                <div>
                  <span style={{
                    backgroundColor: s.league === 'Comp' ? '#1a2a4a' : s.league === 'Rec' || s.league === 'Rec League' ? '#1a3a1a' : s.league === 'U17' ? '#2a1a1a' : '#2a1a3a',
                    color: s.league === 'Comp' ? '#4A9FE3' : s.league === 'Rec' || s.league === 'Rec League' ? '#27AE60' : s.league === 'U17' ? '#f97316' : '#a855f7',
                    fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '4px',
                  }}>
                    {s.league}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    onClick={() => toggle(s.season)}
                    style={{ width: '52px', height: '28px', borderRadius: '14px', border: 'none', backgroundColor: s.active ? '#4A9FE3' : '#2a2a2a', cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s', flexShrink: 0 }}
                  >
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#fff', position: 'absolute', top: '4px', left: s.active ? '28px' : '4px', transition: 'left 0.2s' }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: '24px' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ width: '100%', backgroundColor: saving ? '#2a2a2a' : '#4A9FE3', color: '#fff', border: 'none', borderRadius: '8px', padding: '12px', fontWeight: 700, fontSize: '15px', cursor: saving ? 'not-allowed' : 'pointer' }}
          >
            {saving ? 'Saving...' : 'Save Active Seasons'}
          </button>
        </div>
      </div>
    </AdminLayout>
  )
}
