'use client'

import { useState, useEffect } from 'react'

interface Team { id: string; name: string; slug: string; color: string }
interface Game {
  id: string
  homeTeamId: string
  awayTeamId: string
  homeTeam: Team
  awayTeam: Team
  homeScore: number | null
  awayScore: number | null
  date: string
  time: string
  location: string
  week: number
  season: string
  league: string
  played: boolean
  driveUrl: string | null
}

interface SeasonOption { season: string; league: string }

const selectStyle = {
  backgroundColor: '#1a1a1a',
  color: '#ffffff',
  border: '1px solid #2a2a2a',
  borderRadius: '6px',
  padding: '8px 14px',
  fontSize: '13px',
  fontWeight: 600,
  outline: 'none',
  cursor: 'pointer',
}

export default function SchedulePage() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [seasonOptions, setSeasonOptions] = useState<SeasonOption[]>([])
  const [selectedSeason, setSelectedSeason] = useState<string>('all')
  const [selectedLeague, setSelectedLeague] = useState<string>('all')
  const [filterTeam, setFilterTeam] = useState('all')

  useEffect(() => {
    fetch('/api/seasons')
      .then(r => r.json())
      .then((data: SeasonOption[]) => {
        setSeasonOptions(data)
        if (data.length > 0) setSelectedSeason(data[0].season)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    setFilterTeam('all')
    const params = new URLSearchParams()
    if (selectedSeason !== 'all') params.set('season', selectedSeason)
    if (selectedLeague !== 'all') params.set('league', selectedLeague)

    fetch(`/api/games?${params}`)
      .then(r => r.json())
      .then(data => { setGames(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => { setGames([]); setLoading(false) })
  }, [selectedSeason, selectedLeague])

  const leagues = [...new Set(seasonOptions.map(s => s.league))]
  const filteredSeasons = selectedLeague === 'all'
    ? seasonOptions
    : seasonOptions.filter(s => s.league === selectedLeague)

  // Teams from current games for team filter
  const teamsInView = [...new Map(
    games.flatMap(g => [g.homeTeam, g.awayTeam]).map(t => [t.id, t])
  ).values()].sort((a, b) => a.name.localeCompare(b.name))

  const filtered = filterTeam === 'all'
    ? games
    : games.filter(g => g.homeTeamId === filterTeam || g.awayTeamId === filterTeam)

  // Group by date instead of week (more meaningful for historical data)
  const byDate = filtered.reduce((acc, g) => {
    const d = new Date(g.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    if (!acc[d]) acc[d] = []
    acc[d].push(g)
    return acc
  }, {} as Record<string, Game[]>)

  const dates = Object.keys(byDate).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
  const currentLabel = selectedSeason === 'all' ? 'All Seasons' : selectedSeason

  return (
    <div style={{ backgroundColor: '#111111', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#0d0d0d', borderBottom: '1px solid #2a2a2a', padding: '40px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ color: '#4A9FE3', fontSize: '12px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
            {currentLabel}
          </div>
          <h1 style={{ color: '#ffffff', fontSize: '36px', fontWeight: 900, marginBottom: '24px' }}>Season Schedule</h1>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <label style={{ color: '#555', fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>LEAGUE</label>
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
              <label style={{ color: '#555', fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>SEASON</label>
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
            {teamsInView.length > 0 && (
              <div>
                <label style={{ color: '#555', fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>TEAM</label>
                <select
                  value={filterTeam}
                  onChange={e => setFilterTeam(e.target.value)}
                  style={selectStyle}
                >
                  <option value="all">All Teams</option>
                  {teamsInView.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div style={{ textAlign: 'center', color: '#555', padding: '60px' }}>Loading schedule...</div>
        ) : dates.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#555', padding: '60px', backgroundColor: '#1a1a1a', borderRadius: '12px', border: '1px solid #2a2a2a' }}>
            No games found for this selection
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {dates.map(dateStr => (
              <div key={dateStr}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ backgroundColor: '#4A9FE3', color: '#fff', fontWeight: 700, fontSize: '12px', padding: '4px 12px', borderRadius: '4px' }}>
                    {dateStr}
                  </div>
                  <div style={{ flex: 1, height: '1px', backgroundColor: '#2a2a2a' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {byDate[dateStr].map(game => {
                    const homeWon = game.played && game.homeScore !== null && game.awayScore !== null && game.homeScore > game.awayScore
                    const awayWon = game.played && game.homeScore !== null && game.awayScore !== null && game.awayScore > game.homeScore

                    return (
                      <div key={game.id} style={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #2a2a2a',
                        borderRadius: '10px',
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}>
                        {/* Away Team */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '130px' }}>
                          <div style={{ width: '10px', height: '10px', backgroundColor: game.awayTeam.color, borderRadius: '50%', flexShrink: 0 }} />
                          <span style={{ color: awayWon ? '#ffffff' : '#aaaaaa', fontWeight: awayWon ? 800 : 600, fontSize: '15px' }}>
                            {game.awayTeam.name}
                          </span>
                        </div>

                        {/* Score / VS */}
                        <div style={{ textAlign: 'center', minWidth: '110px' }}>
                          {game.played ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'center' }}>
                              <span style={{ color: awayWon ? '#4A9FE3' : '#cccccc', fontWeight: 900, fontSize: '22px' }}>{game.awayScore}</span>
                              <span style={{ color: '#444', fontSize: '14px' }}>—</span>
                              <span style={{ color: homeWon ? '#4A9FE3' : '#cccccc', fontWeight: 900, fontSize: '22px' }}>{game.homeScore}</span>
                            </div>
                          ) : (
                            <span style={{ color: '#4A9FE3', fontWeight: 700, fontSize: '16px' }}>{game.time}</span>
                          )}
                        </div>

                        {/* Home Team */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '130px', justifyContent: 'flex-end' }}>
                          <span style={{ color: homeWon ? '#ffffff' : '#aaaaaa', fontWeight: homeWon ? 800 : 600, fontSize: '15px' }}>
                            {game.homeTeam.name}
                          </span>
                          <div style={{ width: '10px', height: '10px', backgroundColor: game.homeTeam.color, borderRadius: '50%', flexShrink: 0 }} />
                        </div>

                        {/* Meta */}
                        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                          <div style={{ color: '#555', fontSize: '11px' }}>{game.location}</div>
                          <div style={{
                            display: 'inline-block',
                            marginTop: '4px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            backgroundColor: game.played ? '#1a4731' : '#2a2a2a',
                            color: game.played ? '#27AE60' : '#888',
                          }}>
                            {game.played ? 'FINAL' : 'UPCOMING'}
                          </div>
                          {game.driveUrl && (
                            <a
                              href={game.driveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                marginTop: '5px',
                                marginLeft: '4px',
                                backgroundColor: '#0f2a1a',
                                color: '#27AE60',
                                border: '1px solid #27AE60',
                                borderRadius: '4px',
                                padding: '2px 8px',
                                fontSize: '11px',
                                fontWeight: 700,
                                textDecoration: 'none',
                              }}
                            >
                              📁 Drive
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
