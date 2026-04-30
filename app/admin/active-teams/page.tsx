'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'

interface Team {
  id: string
  name: string
  color: string
  logo?: string | null
  league: string
  active: boolean
}

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

function TeamRow({
  team,
  side,
  onMove,
}: {
  team: Team
  side: 'inactive' | 'active'
  onMove: (team: Team) => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        borderBottom: '1px solid #1e1e1e',
        backgroundColor: 'transparent',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#1a1a1a' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {team.logo
          ? <img src={team.logo} alt="" style={{ width: '22px', height: '22px', objectFit: 'contain', borderRadius: '3px' }} />
          : <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: team.color, flexShrink: 0 }} />
        }
        <span style={{ color: '#ddd', fontSize: '14px', fontWeight: 500 }}>{team.name}</span>
      </div>

      <button
        onClick={() => onMove(team)}
        title={side === 'inactive' ? 'Make active in this season' : 'Remove from this season'}
        style={{
          width: '32px', height: '32px', borderRadius: '50%', border: 'none',
          backgroundColor: side === 'inactive' ? '#1a4a2a' : '#4a1a1a',
          color: side === 'inactive' ? '#27AE60' : '#e74c3c',
          fontSize: '18px', fontWeight: 900, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          lineHeight: 1, flexShrink: 0, transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.75' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
      >
        {side === 'inactive' ? '→' : '←'}
      </button>
    </div>
  )
}

export default function ActiveTeamsPage() {
  const [seasons, setSeasons] = useState<SeasonRow[]>([])
  const [selectedSeason, setSelectedSeason] = useState('')
  const [activeTeams, setActiveTeams] = useState<Team[]>([])
  const [inactiveTeams, setInactiveTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingTeams, setLoadingTeams] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'ok' | 'err'>('ok')
  const [searchInactive, setSearchInactive] = useState('')
  const [searchActive, setSearchActive] = useState('')

  const showMsg = (text: string, type: 'ok' | 'err' = 'ok') => {
    setMsg(text); setMsgType(type)
    setTimeout(() => setMsg(''), 4000)
  }

  // Load seasons
  useEffect(() => {
    fetch('/api/admin/seasons')
      .then(r => r.json())
      .then((data: SeasonRow[]) => {
        if (!Array.isArray(data) || data.length === 0) { setLoading(false); return }
        setSeasons(data)
        const first = data.find(s => s.active) ?? data[0]
        setSelectedSeason(first.season)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Load teams for selected season
  useEffect(() => {
    if (!selectedSeason) return
    setLoadingTeams(true)
    setSearchInactive(''); setSearchActive('')
    fetch(`/api/admin/season-teams?season=${encodeURIComponent(selectedSeason)}`)
      .then(r => r.json())
      .then(data => {
        setActiveTeams(Array.isArray(data.active) ? data.active : [])
        setInactiveTeams(Array.isArray(data.inactive) ? data.inactive : [])
      })
      .catch(() => { setActiveTeams([]); setInactiveTeams([]) })
      .finally(() => setLoadingTeams(false))
  }, [selectedSeason])

  const moveToActive = (team: Team) => {
    setInactiveTeams(prev => prev.filter(t => t.id !== team.id))
    setActiveTeams(prev => [...prev, team].sort((a, b) => a.name.localeCompare(b.name)))
  }

  const moveToInactive = (team: Team) => {
    setActiveTeams(prev => prev.filter(t => t.id !== team.id))
    setInactiveTeams(prev => [...prev, team].sort((a, b) => a.name.localeCompare(b.name)))
  }

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch('/api/admin/season-teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer imba-admin-2025' },
      body: JSON.stringify({ season: selectedSeason, activeTeamIds: activeTeams.map(t => t.id) }),
    })
    setSaving(false)
    if (res.ok) showMsg(`✓ Active teams for "${selectedSeason}" saved!`)
    else showMsg('✗ Error saving active teams', 'err')
  }

  const filteredInactive = inactiveTeams.filter(t =>
    t.name.toLowerCase().includes(searchInactive.toLowerCase())
  )
  const filteredActive = activeTeams.filter(t =>
    t.name.toLowerCase().includes(searchActive.toLowerCase())
  )

  return (
    <AdminLayout>
      <div style={{ padding: '32px', maxWidth: '1100px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: '26px', fontWeight: 900, marginBottom: '4px' }}>Active Teams</h1>
            <p style={{ color: '#555', fontSize: '13px' }}>
              Select which teams are participating in each season.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {seasons.length > 0 && (
              <>
                <label style={{ color: '#666', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>Season</label>
                <select
                  value={selectedSeason}
                  onChange={e => setSelectedSeason(e.target.value)}
                  style={{ ...inputS, width: 'auto', minWidth: '220px', fontWeight: 700, cursor: 'pointer' }}
                >
                  {seasons.map(s => (
                    <option key={`${s.season}-${s.league}`} value={s.season}>
                      {s.season}{s.active ? ' ●' : ''}
                    </option>
                  ))}
                </select>
              </>
            )}

            <button
              onClick={handleSave}
              disabled={saving || !selectedSeason}
              style={{
                backgroundColor: saving ? '#2a2a2a' : '#27AE60',
                color: '#fff', border: 'none', borderRadius: '8px',
                padding: '10px 24px', fontWeight: 700, fontSize: '14px',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Status message */}
        {msg && (
          <div style={{
            backgroundColor: msgType === 'ok' ? '#0a3a1a' : '#3a0a0a',
            border: `1px solid ${msgType === 'ok' ? '#27AE60' : '#e74c3c'}`,
            color: msgType === 'ok' ? '#27AE60' : '#e74c3c',
            padding: '10px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', fontWeight: 600,
          }}>
            {msg}
          </div>
        )}

        {/* Info banner */}
        {selectedSeason && (
          <div style={{ backgroundColor: '#1a3a5c', border: '1px solid #4A9FE3', borderRadius: '10px', padding: '12px 18px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '18px' }}>ℹ️</span>
            <span style={{ color: '#aaddff', fontSize: '13px' }}>
              You are currently working in <strong style={{ color: '#fff' }}>{selectedSeason}</strong>. Use the arrows to move teams between columns, then click <strong style={{ color: '#fff' }}>Save Changes</strong>.
            </span>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', color: '#555', padding: '60px' }}>Loading seasons...</div>
        ) : !selectedSeason ? (
          <div style={{ textAlign: 'center', color: '#555', padding: '60px' }}>No seasons available. Create one first.</div>
        ) : loadingTeams ? (
          <div style={{ textAlign: 'center', color: '#555', padding: '60px' }}>Loading teams...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

            {/* Inactive column */}
            <div style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a', borderRadius: '12px', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{
                backgroundColor: '#0d0d0d', borderBottom: '2px solid #2a2a2a',
                padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#888', fontWeight: 800, fontSize: '14px', letterSpacing: '0.03em' }}>
                    {selectedSeason} – Inactive teams
                  </span>
                </div>
                <span style={{ backgroundColor: '#2a2a2a', color: '#666', fontSize: '12px', fontWeight: 700, padding: '2px 10px', borderRadius: '10px' }}>
                  {inactiveTeams.length}
                </span>
              </div>

              {/* Search */}
              <div style={{ padding: '10px 14px', borderBottom: '1px solid #1e1e1e' }}>
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchInactive}
                  onChange={e => setSearchInactive(e.target.value)}
                  style={{ ...inputS, padding: '6px 10px', fontSize: '13px' }}
                />
              </div>

              {/* List */}
              <div style={{ maxHeight: '520px', overflowY: 'auto' }}>
                {filteredInactive.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#555', fontSize: '13px' }}>
                    {inactiveTeams.length === 0 ? 'All teams are active' : 'No matches'}
                  </div>
                ) : (
                  filteredInactive.map(team => (
                    <TeamRow key={team.id} team={team} side="inactive" onMove={moveToActive} />
                  ))
                )}
              </div>
            </div>

            {/* Active column */}
            <div style={{ backgroundColor: '#141414', border: '1px solid #27AE60', borderRadius: '12px', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{
                backgroundColor: '#0d2a1a', borderBottom: '2px solid #27AE60',
                padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#27AE60' }} />
                  <span style={{ color: '#fff', fontWeight: 800, fontSize: '14px', letterSpacing: '0.03em' }}>
                    {selectedSeason} – Active Teams
                  </span>
                </div>
                <span style={{ backgroundColor: '#1a4731', color: '#27AE60', fontSize: '12px', fontWeight: 700, padding: '2px 10px', borderRadius: '10px' }}>
                  {activeTeams.length}
                </span>
              </div>

              {/* Search */}
              <div style={{ padding: '10px 14px', borderBottom: '1px solid #1e2e1e' }}>
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchActive}
                  onChange={e => setSearchActive(e.target.value)}
                  style={{ ...inputS, padding: '6px 10px', fontSize: '13px' }}
                />
              </div>

              {/* List */}
              <div style={{ maxHeight: '520px', overflowY: 'auto' }}>
                {filteredActive.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#444', fontSize: '13px' }}>
                    {activeTeams.length === 0
                      ? 'No active teams yet — use the → arrows to add teams'
                      : 'No matches'}
                  </div>
                ) : (
                  filteredActive.map(team => (
                    <TeamRow key={team.id} team={team} side="active" onMove={moveToInactive} />
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* Bottom save button */}
        {!loading && selectedSeason && !loadingTeams && (
          <div style={{ marginTop: '24px' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                width: '100%', backgroundColor: saving ? '#2a2a2a' : '#27AE60',
                color: '#fff', border: 'none', borderRadius: '8px',
                padding: '13px', fontWeight: 700, fontSize: '15px',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving...' : `Save Active Teams for "${selectedSeason}"`}
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
