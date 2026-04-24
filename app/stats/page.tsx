'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Category = 'points' | 'rebounds' | 'assists' | 'steals' | 'blocks'

interface PlayerStat {
  playerId: string
  playerName: string
  playerNumber: number
  teamName: string
  teamSlug: string
  teamColor: string
  gamesPlayed: number
  ppg: string
  rpg: string
  apg: string
  spg: string
  bpg: string
  fgPct: string
  twoPtPct: string
  threePct: string
  ftPct: string
  totalPoints: number
  totalRebounds: number
  totalAssists: number
  totalSteals: number
  totalBlocks: number
}

interface SeasonOption {
  season: string
  league: string
}

const categories: { key: Category; label: string; statKey: string; totalKey: string }[] = [
  { key: 'points',   label: 'Points',   statKey: 'ppg', totalKey: 'totalPoints' },
  { key: 'rebounds', label: 'Rebounds', statKey: 'rpg', totalKey: 'totalRebounds' },
  { key: 'assists',  label: 'Assists',  statKey: 'apg', totalKey: 'totalAssists' },
  { key: 'steals',   label: 'Steals',   statKey: 'spg', totalKey: 'totalSteals' },
  { key: 'blocks',   label: 'Blocks',   statKey: 'bpg', totalKey: 'totalBlocks' },
]

const selectStyle = {
  backgroundColor: '#1a1a1a',
  color: '#fff',
  border: '1px solid #2a2a2a',
  borderRadius: '8px',
  padding: '8px 12px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  outline: 'none',
}

export default function StatsPage() {
  const [category, setCategory] = useState<Category>('points')
  const [stats, setStats] = useState<PlayerStat[]>([])
  const [loading, setLoading] = useState(true)
  const [seasonOptions, setSeasonOptions] = useState<SeasonOption[]>([])
  const [selectedSeason, setSelectedSeason] = useState<string>('all')
  const [selectedLeague, setSelectedLeague] = useState<string>('all')

  // Load available seasons on mount
  useEffect(() => {
    fetch('/api/seasons')
      .then(r => r.json())
      .then((data: SeasonOption[]) => {
        setSeasonOptions(data)
        // Default to the most recent season
        if (data.length > 0) setSelectedSeason(data[0].season)
      })
      .catch(() => {})
  }, [])

  // Load stats when filters change
  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ category, limit: '20', minGames: '4' })
    if (selectedSeason !== 'all') params.set('season', selectedSeason)
    if (selectedLeague !== 'all') params.set('league', selectedLeague)

    fetch(`/api/stats?${params}`)
      .then(r => r.json())
      .then(data => { setStats(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => { setStats([]); setLoading(false) })
  }, [category, selectedSeason, selectedLeague])

  const cat = categories.find(c => c.key === category)!

  // Unique leagues from season options
  const leagues = [...new Set(seasonOptions.map(s => s.league))]
  // Seasons filtered by selected league
  const filteredSeasons = selectedLeague === 'all'
    ? seasonOptions
    : seasonOptions.filter(s => s.league === selectedLeague)

  const currentSeasonLabel = selectedSeason === 'all' ? 'All Seasons' : selectedSeason

  return (
    <div style={{ backgroundColor: '#111111', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#0d0d0d', borderBottom: '1px solid #2a2a2a', padding: '24px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ color: '#4A9FE3', fontSize: '12px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
            {currentSeasonLabel}
          </div>
          <h1 style={{ color: '#ffffff', fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 900 }}>Statistical Leaders</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Filters Row */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <label style={{ color: '#555', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>League</label>
            <select
              value={selectedLeague}
              onChange={e => { setSelectedLeague(e.target.value); setSelectedSeason('all') }}
              style={selectStyle}
            >
              <option value="all">All Leagues</option>
              {leagues.map(l => (
                <option key={l} value={l}>{l === 'Comp' ? 'Comp (D1)' : l === 'Rec' ? 'Rec (D2/D3)' : l}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ color: '#555', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Season</label>
            <select
              value={selectedSeason}
              onChange={e => setSelectedSeason(e.target.value)}
              style={selectStyle}
            >
              <option value="all">All Seasons</option>
              {filteredSeasons.map(s => (
                <option key={`${s.season}-${s.league}`} value={s.season}>{s.season}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Category Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {categories.map(c => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                border: 'none',
                backgroundColor: category === c.key ? '#4A9FE3' : '#1a1a1a',
                color: category === c.key ? '#ffffff' : '#888888',
                borderBottom: category === c.key ? 'none' : '1px solid #2a2a2a',
                transition: 'all 0.2s',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#555', padding: '60px' }}>Loading stats...</div>
        ) : stats.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#555', padding: '60px', backgroundColor: '#1a1a1a', borderRadius: '12px', border: '1px solid #2a2a2a' }}>
            <div style={{ fontSize: '14px', marginBottom: '8px' }}>No qualifying stats for this selection</div>
            <div style={{ fontSize: '12px', color: '#444' }}>Players must appear in 4+ games to show on leaderboards</div>
          </div>
        ) : (
          <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', overflow: 'hidden', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
              <thead>
                <tr style={{ backgroundColor: '#4A9FE3' }}>
                  <th style={{ padding: '14px 16px', textAlign: 'left',   color: '#fff', fontWeight: 700, fontSize: '12px' }}>RANK</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left',   color: '#fff', fontWeight: 700, fontSize: '12px' }}>PLAYER</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left',   color: '#fff', fontWeight: 700, fontSize: '12px' }}>TEAM</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', color: '#fff', fontWeight: 700, fontSize: '12px' }}>GP</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', color: '#fff', fontWeight: 700, fontSize: '12px' }}>TOTAL</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', color: '#fff', fontWeight: 800, fontSize: '13px', backgroundColor: 'rgba(0,0,0,0.15)' }}>{cat.label.toUpperCase()}/G</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', color: '#fff', fontWeight: 700, fontSize: '12px' }}>FG%</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', color: '#fff', fontWeight: 700, fontSize: '12px' }}>2P%</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', color: '#fff', fontWeight: 700, fontSize: '12px' }}>3P%</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', color: '#fff', fontWeight: 700, fontSize: '12px' }}>FT%</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((player, i) => (
                  <tr key={player.playerId} style={{
                    backgroundColor: i % 2 === 0 ? '#1a1a1a' : '#141414',
                    borderBottom: '1px solid #222',
                  }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: '14px', color: i === 0 ? '#F5A623' : i === 1 ? '#888' : i === 2 ? '#cd7f32' : '#555' }}>
                      #{i + 1}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>
                        {player.playerNumber ? `#${player.playerNumber} ` : ''}{player.playerName}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <Link href={`/teams/${player.teamSlug}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', backgroundColor: player.teamColor, borderRadius: '50%' }} />
                        <span style={{ color: '#aaa', fontSize: '13px' }}>{player.teamName}</span>
                      </Link>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#888', fontSize: '14px' }}>{player.gamesPlayed}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#ccc', fontSize: '14px' }}>
                      {(player as any)[cat.totalKey]}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', backgroundColor: 'rgba(74,159,227,0.05)' }}>
                      <span style={{ color: '#4A9FE3', fontWeight: 900, fontSize: '18px' }}>{(player as any)[cat.statKey]}</span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#888', fontSize: '13px' }}>{player.fgPct !== '—' ? `${player.fgPct}%` : '—'}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#888', fontSize: '13px' }}>{player.twoPtPct !== '—' ? `${player.twoPtPct}%` : '—'}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#888', fontSize: '13px' }}>{player.threePct !== '—' ? `${player.threePct}%` : '—'}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', color: '#888', fontSize: '13px' }}>{player.ftPct !== '—' ? `${player.ftPct}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
