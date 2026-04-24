'use client'

import { useState, useEffect, useCallback } from 'react'

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

interface PlayerStatRow {
  id: string
  player: { name: string; number: number; position: string }
  points: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
  twoPtMade: number
  twoPtAtt: number
  threeMade: number
  threeAtt: number
  ftMade: number
  ftAtt: number
}

interface BoxScore {
  id: string
  homeTeam: Team
  awayTeam: Team
  homeScore: number
  awayScore: number
  date: string
  homeStats: PlayerStatRow[]
  awayStats: PlayerStatRow[]
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

function pct(made: number, att: number) {
  if (att === 0) return '—'
  return ((made / att) * 100).toFixed(0) + '%'
}

function StatTable({ stats, teamName, teamColor }: { stats: PlayerStatRow[]; teamName: string; teamColor: string }) {
  if (stats.length === 0) return (
    <div style={{ color: '#555', fontSize: '13px', padding: '16px', textAlign: 'center' }}>No stats recorded</div>
  )
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <div style={{ width: '10px', height: '10px', backgroundColor: teamColor, borderRadius: '50%' }} />
        <span style={{ color: '#fff', fontWeight: 800, fontSize: '15px' }}>{teamName}</span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
            {['PLAYER', 'PTS', 'REB', 'AST', 'STL', 'BLK', 'FG%', '3P%', 'FT%'].map(h => (
              <th key={h} style={{ padding: '6px 10px', textAlign: h === 'PLAYER' ? 'left' : 'center', color: '#555', fontWeight: 700, fontSize: '11px', letterSpacing: '0.06em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stats.map((s, i) => (
            <tr key={s.id} style={{ borderBottom: '1px solid #1e1e1e', backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
              <td style={{ padding: '8px 10px', color: '#ccc', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {s.player.number ? <span style={{ color: '#555', marginRight: '6px' }}>#{s.player.number}</span> : null}
                {s.player.name}
              </td>
              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#4A9FE3', fontWeight: 900, fontSize: '15px' }}>{s.points}</td>
              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#ccc' }}>{s.rebounds}</td>
              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#ccc' }}>{s.assists}</td>
              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#ccc' }}>{s.steals}</td>
              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#ccc' }}>{s.blocks}</td>
              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#888' }}>{pct(s.twoPtMade + s.threeMade, s.twoPtAtt + s.threeAtt)}</td>
              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#888' }}>{pct(s.threeMade, s.threeAtt)}</td>
              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#888' }}>{pct(s.ftMade, s.ftAtt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BoxScoreModal({ gameId, onClose }: { gameId: string; onClose: () => void }) {
  const [box, setBox] = useState<BoxScore | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/games/${gameId}`)
      .then(r => r.json())
      .then(data => { setBox(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [gameId])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const homeWon = box && box.homeScore > box.awayScore
  const awayWon = box && box.awayScore > box.homeScore

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)',
        zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '24px 16px', overflowY: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: '#141414', border: '1px solid #2a2a2a', borderRadius: '16px',
          width: '100%', maxWidth: '740px', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ backgroundColor: '#0d0d0d', padding: '20px 24px', borderBottom: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {loading || !box ? (
            <div style={{ color: '#555', fontSize: '14px' }}>Loading box score...</div>
          ) : (
            <div style={{ flex: 1 }}>
              {/* Score header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                {/* Away */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                  <div style={{ width: '10px', height: '10px', backgroundColor: box.awayTeam.color, borderRadius: '50%', flexShrink: 0 }} />
                  <span style={{ color: awayWon ? '#fff' : '#888', fontWeight: awayWon ? 800 : 600, fontSize: 'clamp(13px, 2vw, 16px)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {box.awayTeam.name}
                  </span>
                </div>
                {/* Score */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, padding: '0 8px' }}>
                  <span style={{ color: awayWon ? '#4A9FE3' : '#ccc', fontWeight: 900, fontSize: '24px' }}>{box.awayScore}</span>
                  <span style={{ color: '#444', fontSize: '14px' }}>—</span>
                  <span style={{ color: homeWon ? '#4A9FE3' : '#ccc', fontWeight: 900, fontSize: '24px' }}>{box.homeScore}</span>
                </div>
                {/* Home */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0, justifyContent: 'flex-end' }}>
                  <span style={{ color: homeWon ? '#fff' : '#888', fontWeight: homeWon ? 800 : 600, fontSize: 'clamp(13px, 2vw, 16px)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
                    {box.homeTeam.name}
                  </span>
                  <div style={{ width: '10px', height: '10px', backgroundColor: box.homeTeam.color, borderRadius: '50%', flexShrink: 0 }} />
                </div>
              </div>
              <div style={{ textAlign: 'center', color: '#555', fontSize: '12px', marginTop: '4px' }}>
                {new Date(box.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          )}
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '20px', padding: '0 0 0 16px', flexShrink: 0, lineHeight: 1 }}
          >✕</button>
        </div>

        {/* Box scores */}
        {!loading && box && (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <StatTable stats={box.awayStats} teamName={box.awayTeam.name} teamColor={box.awayTeam.color} />
            <div style={{ height: '1px', backgroundColor: '#2a2a2a' }} />
            <StatTable stats={box.homeStats} teamName={box.homeTeam.name} teamColor={box.homeTeam.color} />
          </div>
        )}

        {!loading && box && (box.homeStats.length === 0 && box.awayStats.length === 0) && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#555', fontSize: '14px' }}>
            No player stats recorded for this game
          </div>
        )}
      </div>
    </div>
  )
}

export default function SchedulePage() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [seasonsLoaded, setSeasonsLoaded] = useState(false)
  const [seasonOptions, setSeasonOptions] = useState<SeasonOption[]>([])
  const [selectedSeason, setSelectedSeason] = useState<string>('')
  const [selectedLeague, setSelectedLeague] = useState<string>('all')
  const [filterTeam, setFilterTeam] = useState('all')
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/seasons')
      .then(r => r.json())
      .then((data: SeasonOption[]) => {
        setSeasonOptions(data)
        if (data.length > 0) setSelectedSeason(data[0].season)
        setSeasonsLoaded(true)
      })
      .catch(() => setSeasonsLoaded(true))
  }, [])

  useEffect(() => {
    if (!seasonsLoaded || !selectedSeason) return
    setLoading(true)
    setFilterTeam('all')
    const params = new URLSearchParams()
    params.set('season', selectedSeason)
    if (selectedLeague !== 'all') params.set('league', selectedLeague)

    fetch(`/api/games?${params}`)
      .then(r => r.json())
      .then(data => { setGames(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => { setGames([]); setLoading(false) })
  }, [selectedSeason, selectedLeague, seasonsLoaded])

  const closeModal = useCallback(() => setSelectedGameId(null), [])

  const leagues = [...new Set(seasonOptions.map(s => s.league))]
  const filteredSeasons = selectedLeague === 'all'
    ? seasonOptions
    : seasonOptions.filter(s => s.league === selectedLeague)

  const teamsInView = [...new Map(
    games.flatMap(g => [g.homeTeam, g.awayTeam]).map(t => [t.id, t])
  ).values()].sort((a, b) => a.name.localeCompare(b.name))

  const filtered = filterTeam === 'all'
    ? games
    : games.filter(g => g.homeTeamId === filterTeam || g.awayTeamId === filterTeam)

  const byDate = filtered.reduce((acc, g) => {
    const d = new Date(g.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    if (!acc[d]) acc[d] = []
    acc[d].push(g)
    return acc
  }, {} as Record<string, Game[]>)

  const dates = Object.keys(byDate).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
  const currentLabel = selectedSeason || 'Loading...'

  return (
    <div style={{ backgroundColor: '#111111', minHeight: '100vh' }}>
      {/* Box Score Modal */}
      {selectedGameId && <BoxScoreModal gameId={selectedGameId} onClose={closeModal} />}

      {/* Header */}
      <div style={{ backgroundColor: '#0d0d0d', borderBottom: '1px solid #2a2a2a', padding: '24px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ color: '#4A9FE3', fontSize: '12px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
            {currentLabel}
          </div>
          <h1 style={{ color: '#ffffff', fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 900, marginBottom: '20px' }}>Season Schedule</h1>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <label style={{ color: '#555', fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>LEAGUE</label>
              <select
                value={selectedLeague}
                onChange={e => {
                  const l = e.target.value
                  setSelectedLeague(l)
                  const matching = l === 'all' ? seasonOptions : seasonOptions.filter(s => s.league === l)
                  if (matching.length > 0) setSelectedSeason(matching[0].season)
                }}
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
                      <div
                        key={game.id}
                        onClick={() => game.played ? setSelectedGameId(game.id) : undefined}
                        style={{
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #2a2a2a',
                          borderRadius: '10px',
                          padding: '14px 16px',
                          cursor: game.played ? 'pointer' : 'default',
                          transition: 'border-color 0.15s, background-color 0.15s',
                        }}
                        onMouseEnter={e => { if (game.played) { (e.currentTarget as HTMLElement).style.borderColor = '#3a3a3a'; (e.currentTarget as HTMLElement).style.backgroundColor = '#1e1e1e' } }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2a2a2a'; (e.currentTarget as HTMLElement).style.backgroundColor = '#1a1a1a' }}
                      >
                        {/* Teams + Score row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          {/* Away Team */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                            <div style={{ width: '8px', height: '8px', backgroundColor: game.awayTeam.color, borderRadius: '50%', flexShrink: 0 }} />
                            <span style={{ color: awayWon ? '#ffffff' : '#aaaaaa', fontWeight: awayWon ? 800 : 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {game.awayTeam.name}
                            </span>
                          </div>

                          {/* Score / VS */}
                          <div style={{ textAlign: 'center', flexShrink: 0, padding: '0 8px' }}>
                            {game.played ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ color: awayWon ? '#4A9FE3' : '#cccccc', fontWeight: 900, fontSize: '18px' }}>{game.awayScore}</span>
                                <span style={{ color: '#444', fontSize: '13px' }}>—</span>
                                <span style={{ color: homeWon ? '#4A9FE3' : '#cccccc', fontWeight: 900, fontSize: '18px' }}>{game.homeScore}</span>
                              </div>
                            ) : (
                              <span style={{ color: '#4A9FE3', fontWeight: 700, fontSize: '14px' }}>{game.time}</span>
                            )}
                          </div>

                          {/* Home Team */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0, justifyContent: 'flex-end' }}>
                            <span style={{ color: homeWon ? '#ffffff' : '#aaaaaa', fontWeight: homeWon ? 800 : 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {game.homeTeam.name}
                            </span>
                            <div style={{ width: '8px', height: '8px', backgroundColor: game.homeTeam.color, borderRadius: '50%', flexShrink: 0 }} />
                          </div>
                        </div>

                        {/* Meta row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ color: '#555', fontSize: '11px' }}>{game.location}</span>
                          <span style={{
                            padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                            backgroundColor: game.played ? '#1a4731' : '#2a2a2a',
                            color: game.played ? '#27AE60' : '#888',
                          }}>
                            {game.played ? 'FINAL' : 'UPCOMING'}
                          </span>
                          {game.played && (
                            <span style={{ color: '#444', fontSize: '11px' }}>· tap for box score</span>
                          )}
                          {game.driveUrl && (
                            <a
                              href={game.driveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                backgroundColor: '#0f2a1a', color: '#27AE60',
                                border: '1px solid #27AE60', borderRadius: '4px',
                                padding: '2px 8px', fontSize: '11px', fontWeight: 700, textDecoration: 'none',
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
