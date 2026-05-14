'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface SeasonOption {
  season: string
  league: string
}

interface PlayerStat {
  playerId: string
  playerName: string
  teamName: string
  ppg: string
  rpg: string
  apg: string
  gamesPlayed: number
}

const CATEGORIES = [
  { key: 'points',   label: 'PTS', statKey: 'ppg' },
  { key: 'rebounds', label: 'REB', statKey: 'rpg' },
  { key: 'assists',  label: 'AST', statKey: 'apg' },
]

export default function TopScorersWidget() {
  const [seasons, setSeasons] = useState<SeasonOption[]>([])
  const [selectedSeason, setSelectedSeason] = useState<string>('')
  const [category, setCategory] = useState('points')
  const [stats, setStats] = useState<PlayerStat[]>([])
  const [loading, setLoading] = useState(true)

  // Load seasons on mount
  useEffect(() => {
    fetch('/api/seasons')
      .then(r => r.json())
      .then((data: SeasonOption[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setSeasons(data)
          setSelectedSeason(data[0].season)
        } else {
          setLoading(false)
        }
      })
      .catch(() => setLoading(false))
  }, [])

  // Load stats when season or category changes
  useEffect(() => {
    if (!selectedSeason) return
    setLoading(true)
    const params = new URLSearchParams({ category, limit: '5', minGames: '4', season: selectedSeason })
    fetch(`/api/stats?${params}`)
      .then(r => r.json())
      .then(data => { setStats(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => { setStats([]); setLoading(false) })
  }, [selectedSeason, category])

  const cat = CATEGORIES.find(c => c.key === category)!
  const rankColors = ['#F5A623', '#aaaaaa', '#cd7f32', '#555', '#555']

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ color: '#4A9FE3', fontSize: '12px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}>Season Leaders</div>
          <h3 style={{ color: '#fff', fontSize: '22px', fontWeight: 800 }}>Top Performers</h3>
        </div>
        <Link href="/stats" style={{ color: '#4A9FE3', fontWeight: 600, textDecoration: 'none', fontSize: '13px', marginTop: '4px' }}>All Stats →</Link>
      </div>

      {/* Season selector */}
      {seasons.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <select
            value={selectedSeason}
            onChange={e => setSelectedSeason(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#1a1a1a',
              color: '#fff',
              border: '1px solid #2a2a2a',
              borderRadius: '8px',
              padding: '9px 12px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {seasons.map(s => (
              <option key={`${s.season}-${s.league}`} value={s.season}>
                {s.season} · {s.league === 'Comp' ? 'Comp (D1)' : s.league === 'Rec' ? 'Rec (D2/D3)' : s.league}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Category tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
        {CATEGORIES.map(c => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            style={{
              flex: 1,
              padding: '7px 0',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: category === c.key ? '#4A9FE3' : '#1a1a1a',
              color: category === c.key ? '#fff' : '#666',
              fontWeight: 700,
              fontSize: '12px',
              letterSpacing: '0.05em',
              borderBottom: category !== c.key ? '1px solid #2a2a2a' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#555', padding: '32px', backgroundColor: '#1a1a1a', borderRadius: '10px', border: '1px solid #2a2a2a' }}>
          Loading...
        </div>
      ) : stats.length === 0 ? (
        <div style={{ color: '#555', textAlign: 'center', padding: '32px', backgroundColor: '#1a1a1a', borderRadius: '10px', border: '1px solid #2a2a2a', fontSize: '13px' }}>
          No stats recorded for this season yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {stats.map((p, i) => (
            <div key={p.playerId} style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '32px', height: '32px', backgroundColor: rankColors[i] + '22', border: `2px solid ${rankColors[i]}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '13px', color: rankColors[i], flexShrink: 0 }}>
                {i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link href={`/players/${p.playerId}`} style={{ color: '#4A9FE3', fontWeight: 700, fontSize: '14px', textDecoration: 'none', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                  {p.playerName}
                </Link>
                <div style={{ color: '#555', fontSize: '11px' }}>{p.teamName} · {p.gamesPlayed} GP</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ color: '#4A9FE3', fontWeight: 900, fontSize: '22px', lineHeight: 1 }}>{(p as any)[cat.statKey]}</div>
                <div style={{ color: '#555', fontSize: '10px', fontWeight: 700, marginTop: '2px' }}>{cat.label}/G</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
