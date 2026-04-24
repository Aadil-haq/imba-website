'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'

interface Game {
  id: string
  week: number
  season: string
  league: string
  played: boolean
  driveUrl: string | null
  homeTeam: { name: string }
  awayTeam: { name: string }
  date: string
}

const SEASONS = [
  'D1 2025-26 Winter',
  'D2 2025-26 Winter',
  'D4 2025-26 Winter',
  'D3 2025 Fall',
  'D2 2025 Summer',
  '2025 Summer Tournament',
  'D4 2024 Winter',
  'D3 2024 Winter',
  'D2 2024 Winter',
  'D1 2024 Winter',
  'D1 2024 Summer',
  'D1 2023-24 Winter',
  'D1 2023 Summer',
  'Fall 2022',
]

export default function DriveLinksPage() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSeason, setSelectedSeason] = useState(SEASONS[0])
  const [bulkUrl, setBulkUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editUrl, setEditUrl] = useState('')

  const load = async () => {
    const data = await fetch('/api/admin/games').then(r => r.json())
    setGames(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const showMsg = (text: string) => { setMsg(text); setTimeout(() => setMsg(''), 3000) }

  const seasonGames = games
    .filter(g => g.season === selectedSeason && g.played)
    .sort((a, b) => a.week - b.week)

  const applyBulk = async () => {
    if (!bulkUrl.trim()) return
    setSaving(true)
    await Promise.all(
      seasonGames.map(g =>
        fetch('/api/admin/games', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: g.id, driveUrl: bulkUrl.trim() }),
        })
      )
    )
    showMsg(`Drive link applied to all ${seasonGames.length} games in ${selectedSeason}`)
    setBulkUrl('')
    setSaving(false)
    load()
  }

  const saveGameUrl = async (id: string) => {
    setSaving(true)
    await fetch('/api/admin/games', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, driveUrl: editUrl.trim() }),
    })
    showMsg('Drive link saved')
    setEditingId(null)
    setEditUrl('')
    setSaving(false)
    load()
  }

  const clearGameUrl = async (id: string) => {
    await fetch('/api/admin/games', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, driveUrl: '' }),
    })
    load()
  }

  const seasonLinkedCount = seasonGames.filter(g => g.driveUrl).length

  const inputS = {
    backgroundColor: '#111', color: '#fff', border: '1px solid #2a2a2a',
    borderRadius: '6px', padding: '9px 12px', fontSize: '13px', outline: 'none',
    width: '100%', boxSizing: 'border-box' as const,
  }

  return (
    <AdminLayout>
      <div style={{ padding: '32px', maxWidth: '860px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ color: '#fff', fontSize: '26px', fontWeight: 900 }}>Google Drive Links</h1>
          <p style={{ color: '#555', fontSize: '14px' }}>Link game footage / box score folders to each game</p>
        </div>

        {msg && (
          <div style={{ backgroundColor: '#1a4731', border: '1px solid #27AE60', color: '#27AE60', padding: '10px 16px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>
            {msg}
          </div>
        )}

        {/* Season selector */}
        <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ color: '#999', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>SELECT SEASON</label>
              <select
                value={selectedSeason}
                onChange={e => setSelectedSeason(e.target.value)}
                style={{ ...inputS, cursor: 'pointer' }}
              >
                {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ color: '#999', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  APPLY ONE LINK TO ALL {seasonGames.length} GAMES IN THIS SEASON
                </label>
                <input
                  value={bulkUrl}
                  onChange={e => setBulkUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  style={inputS}
                />
              </div>
              <button
                onClick={applyBulk}
                disabled={saving || !bulkUrl.trim()}
                style={{ backgroundColor: '#27AE60', color: '#fff', border: 'none', borderRadius: '6px', padding: '9px 18px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                Apply to All
              </button>
            </div>
          </div>

          {/* Status bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ flex: 1, height: '6px', backgroundColor: '#2a2a2a', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${seasonGames.length > 0 ? (seasonLinkedCount / seasonGames.length) * 100 : 0}%`, backgroundColor: '#27AE60', borderRadius: '3px', transition: 'width 0.3s' }} />
            </div>
            <span style={{ color: '#555', fontSize: '12px', whiteSpace: 'nowrap' }}>
              {seasonLinkedCount} / {seasonGames.length} games linked
            </span>
          </div>
        </div>

        {/* Games list */}
        {loading ? (
          <div style={{ textAlign: 'center', color: '#555', padding: '48px' }}>Loading...</div>
        ) : seasonGames.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#555', padding: '48px', backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px' }}>
            No played games found for {selectedSeason}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {seasonGames.map(game => (
              <div key={game.id} style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: '32px', color: '#555', fontSize: '12px', fontWeight: 700 }}>W{game.week}</div>
                  <div style={{ flex: 1, color: '#fff', fontSize: '14px', fontWeight: 600 }}>
                    {game.awayTeam.name} <span style={{ color: '#555' }}>vs</span> {game.homeTeam.name}
                  </div>

                  {editingId === game.id ? (
                    <>
                      <input
                        value={editUrl}
                        onChange={e => setEditUrl(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        style={{ ...inputS, flex: 2, minWidth: '200px' }}
                        autoFocus
                      />
                      <button
                        onClick={() => saveGameUrl(game.id)}
                        disabled={saving}
                        style={{ backgroundColor: '#27AE60', color: '#fff', border: 'none', borderRadius: '5px', padding: '7px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        style={{ backgroundColor: '#2a2a2a', color: '#888', border: 'none', borderRadius: '5px', padding: '7px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : game.driveUrl ? (
                    <>
                      <a href={game.driveUrl} target="_blank" rel="noopener noreferrer"
                        style={{ color: '#27AE60', fontSize: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        📁 Drive linked
                      </a>
                      <button
                        onClick={() => { setEditingId(game.id); setEditUrl(game.driveUrl || '') }}
                        style={{ backgroundColor: '#1a3a5c', color: '#4A9FE3', border: 'none', borderRadius: '5px', padding: '5px 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => clearGameUrl(game.id)}
                        style={{ backgroundColor: '#4a1919', color: '#e74c3c', border: 'none', borderRadius: '5px', padding: '5px 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => { setEditingId(game.id); setEditUrl('') }}
                      style={{ backgroundColor: '#1a1a1a', color: '#555', border: '1px dashed #333', borderRadius: '5px', padding: '5px 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      + Add link
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
