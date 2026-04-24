'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Standing {
  teamId: string
  teamName: string
  teamSlug: string
  teamColor: string
  league: string
  wins: number
  losses: number
  gamesPlayed: number
  pct: string
  pointsFor: number
  pointsAgainst: number
  diff: number
  streak: string
  last5: string
}

interface SeasonOption { season: string; league: string }

const selectStyle: React.CSSProperties = {
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

export default function StandingsPage() {
  const [standings, setStandings] = useState<Standing[]>([])
  const [loading, setLoading] = useState(true)
  const [seasonsLoading, setSeasonsLoading] = useState(true)
  const [seasonOptions, setSeasonOptions] = useState<SeasonOption[]>([])
  const [selectedSeason, setSelectedSeason] = useState<string>('')
  const [selectedLeague, setSelectedLeague] = useState<string>('all')

  // Load available seasons on mount
  useEffect(() => {
    fetch('/api/seasons')
      .then(r => r.json())
      .then((data: SeasonOption[]) => {
        setSeasonOptions(data)
        // Default to most recent season
        if (data.length > 0) setSelectedSeason(data[0].season)
        setSeasonsLoading(false)
      })
      .catch(() => setSeasonsLoading(false))
  }, [])

  // Load standings when season/league changes
  useEffect(() => {
    if (!selectedSeason) return  // wait until we have a season
    setLoading(true)

    const params = new URLSearchParams({ season: selectedSeason })
    if (selectedLeague !== 'all') params.set('league', selectedLeague)

    fetch(`/api/standings?${params}`)
      .then(r => r.json())
      .then(data => { setStandings(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => { setStandings([]); setLoading(false) })
  }, [selectedSeason, selectedLeague])

  // Unique leagues
  const leagues = [...new Set(seasonOptions.map(s => s.league))]

  // Seasons filtered by selected league
  const filteredSeasons = selectedLeague === 'all'
    ? seasonOptions
    : seasonOptions.filter(s => s.league === selectedLeague)

  // When league changes, reset to first matching season
  const handleLeagueChange = (league: string) => {
    setSelectedLeague(league)
    const matching = league === 'all' ? seasonOptions : seasonOptions.filter(s => s.league === league)
    if (matching.length > 0) setSelectedSeason(matching[0].season)
  }

  const currentLabel = selectedSeason || 'Select a Season'

  return (
    <div style={{ backgroundColor: '#111111', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#0d0d0d', borderBottom: '1px solid #2a2a2a', padding: '24px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ color: '#4A9FE3', fontSize: '12px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
            {currentLabel}
          </div>
          <h1 style={{ color: '#ffffff', fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 900 }}>League Standings</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Season / League Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ color: '#555', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>League</label>
            <select value={selectedLeague} onChange={e => handleLeagueChange(e.target.value)} style={selectStyle}>
              <option value="all">All Leagues</option>
              {leagues.map(l => (
                <option key={l} value={l}>{l === 'Comp' ? 'Comp (D1)' : l === 'Rec' ? 'Rec (D2/D3)' : l}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ color: '#555', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Season</label>
            <select value={selectedSeason} onChange={e => setSelectedSeason(e.target.value)} style={selectStyle}>
              {filteredSeasons.map(s => (
                <option key={`${s.season}-${s.league}`} value={s.season}>{s.season}</option>
              ))}
            </select>
          </div>
        </div>

        {(loading || seasonsLoading) ? (
          <div style={{ textAlign: 'center', color: '#555', padding: '60px' }}>Loading standings...</div>
        ) : standings.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#555', padding: '60px', backgroundColor: '#1a1a1a', borderRadius: '12px', border: '1px solid #2a2a2a' }}>
            No standings data for this season
          </div>
        ) : (() => {
          // 12-team seasons: top 8 make playoffs. All other sizes: everyone makes playoffs.
          const playoffCutoff = standings.length === 12 ? 8 : standings.length
          return (
          <>
            {standings.length === 12 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <div style={{ width: '3px', height: '20px', backgroundColor: '#4A9FE3', borderRadius: '2px' }} />
                <span style={{ color: '#4A9FE3', fontSize: '13px', fontWeight: 600 }}>Top 8 teams advance to playoffs</span>
              </div>
            )}

            <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', overflow: 'hidden', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#4A9FE3' }}>
                    {[
                      { label: 'Rank',   align: 'left' },
                      { label: 'Team',   align: 'left' },
                      { label: 'GP',     align: 'center' },
                      { label: 'W',      align: 'center' },
                      { label: 'L',      align: 'center' },
                      { label: 'PCT',    align: 'center' },
                      { label: 'PF',     align: 'center' },
                      { label: 'PA',     align: 'center' },
                      { label: 'DIFF',   align: 'center' },
                      { label: 'STREAK', align: 'center' },
                    ].map(h => (
                      <th key={h.label} style={{ padding: '14px 16px', textAlign: h.align as 'left' | 'center', color: '#fff', fontWeight: 700, fontSize: '12px', letterSpacing: '0.05em' }}>
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {standings.map((team, i) => (
                    <tr key={`${team.teamId}-${i}`} style={{
                      backgroundColor: i % 2 === 0 ? '#1a1a1a' : '#141414',
                      borderBottom: '1px solid #222',
                      borderLeft: i < playoffCutoff ? `3px solid ${team.teamColor}` : '3px solid transparent',
                    }}>
                      <td style={{ padding: '14px 16px', fontWeight: 800, fontSize: '15px', color: i < 2 ? '#4A9FE3' : '#888' }}>
                        #{i + 1}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <Link href={`/teams/${team.teamSlug}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '12px', height: '12px', backgroundColor: team.teamColor, borderRadius: '50%', flexShrink: 0 }} />
                          <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>{team.teamName}</span>
                          {i < playoffCutoff && (
                            <span style={{ backgroundColor: '#1a3a5c', color: '#4A9FE3', fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '3px', marginLeft: '4px' }}>
                              PLAYOFF
                            </span>
                          )}
                        </Link>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', color: '#ccc', fontSize: '14px' }}>{team.gamesPlayed}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', color: '#27AE60', fontWeight: 800, fontSize: '16px' }}>{team.wins}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', color: '#e74c3c', fontWeight: 800, fontSize: '16px' }}>{team.losses}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', color: '#ccc', fontSize: '14px', fontWeight: 600 }}>{team.pct}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', color: '#ccc', fontSize: '14px' }}>{team.pointsFor}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', color: '#ccc', fontSize: '14px' }}>{team.pointsAgainst}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '14px', fontWeight: 700, color: team.diff > 0 ? '#27AE60' : team.diff < 0 ? '#e74c3c' : '#888' }}>
                        {team.diff > 0 ? `+${team.diff}` : team.diff}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 700,
                          backgroundColor: team.streak.startsWith('W') ? '#1a4731' : team.streak.startsWith('L') ? '#4a1919' : '#2a2a2a',
                          color: team.streak.startsWith('W') ? '#27AE60' : team.streak.startsWith('L') ? '#e74c3c' : '#888',
                        }}>
                          {team.streak}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              {standings.length === 12 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '12px', height: '12px', backgroundColor: '#4A9FE3', borderRadius: '2px' }} />
                  <span style={{ color: '#888', fontSize: '12px' }}>Colored border = playoff position</span>
                </div>
              )}
              <span style={{ color: '#888', fontSize: '12px' }}>PF = Points For · PA = Points Against · DIFF = Point Differential</span>
            </div>
          </>
          )
        })()}
      </div>
    </div>
  )
}
