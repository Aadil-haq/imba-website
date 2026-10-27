'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'

interface Player {
  id: string
  name: string
  number: number
  position: string
  gamesPlayed: number
  ppg: string
  rpg: string
  apg: string
  spg: string
  bpg: string
  twoPtMade: number
  twoPtAtt: number
  twoPtPct: string
  threeMade: number
  threeAtt: number
  threePct: string
  ftMade: number
  ftAtt: number
  ftPct: string
  totalPoints: number
}

interface Game {
  id: string
  homeTeam: { name: string; color: string; logo?: string | null }
  awayTeam: { name: string; color: string; logo?: string | null }
  homeScore: number | null
  awayScore: number | null
  date: string
  time: string
  played: boolean
  week: number
  isHome: boolean
  season: string
  court: string | null
}

interface SeasonRecord {
  season: string
  league: string
  wins: number
  losses: number
  pf: number
  pa: number
}

interface TeamDetail {
  id: string
  name: string
  slug: string
  color: string
  logo?: string | null
  wins: number
  losses: number
  pointsFor: number
  pointsAgainst: number
  seasonRecords: SeasonRecord[]
  players: Player[]
  games: Game[]
}

type Tab = 'stats' | 'schedule' | 'roster'

export default function TeamPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const seasonParam = searchParams.get('season') || ''

  const [team, setTeam] = useState<TeamDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSeason, setSelectedSeason] = useState<string>('')
  const [rosterLoading, setRosterLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('stats')

  useEffect(() => {
    if (!slug) return
    const url = seasonParam
      ? `/api/teams/${slug}?season=${encodeURIComponent(seasonParam)}`
      : `/api/teams/${slug}`
    fetch(url)
      .then(r => r.json())
      .then((data: TeamDetail) => {
        setTeam(data)
        setLoading(false)
        if (seasonParam) {
          setSelectedSeason(seasonParam)
        } else if (data.seasonRecords.length > 0) {
          setSelectedSeason(data.seasonRecords[0].season)
        }
      })
  }, [slug, seasonParam])

  const handleSeasonSelect = (season: string) => {
    if (season === selectedSeason) return
    setSelectedSeason(season)
    setRosterLoading(true)
    fetch(`/api/teams/${slug}?season=${encodeURIComponent(season)}`)
      .then(r => r.json())
      .then((data: TeamDetail) => {
        setTeam(prev => prev ? { ...prev, players: data.players, games: data.games } : data)
        setRosterLoading(false)
      })
  }

  if (loading) return (
    <div style={{ backgroundColor: '#111', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#555' }}>Loading team...</span>
    </div>
  )

  if (!team) return (
    <div style={{ backgroundColor: '#111', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#e74c3c' }}>Team not found</span>
    </div>
  )

  const currentRecord = team.seasonRecords.find(r => r.season === selectedSeason) ?? team.seasonRecords[0]
  const gp = currentRecord ? currentRecord.wins + currentRecord.losses : 0
  const pct = gp > 0 ? (currentRecord.wins / gp).toFixed(3) : '.000'

  const seasonGames = team.games.filter(g => g.season === selectedSeason)
  const recentGames = seasonGames.filter(g => g.played).slice(0, 10)
  const upcomingGames = seasonGames.filter(g => !g.played).slice(0, 5)

  const tabStyle = (tab: Tab): React.CSSProperties => ({
    padding: '10px 24px',
    border: 'none',
    borderBottom: `3px solid ${activeTab === tab ? team.color : 'transparent'}`,
    backgroundColor: 'transparent',
    color: activeTab === tab ? '#fff' : '#666',
    fontSize: '14px',
    fontWeight: activeTab === tab ? 700 : 500,
    cursor: 'pointer',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    transition: 'all 0.15s ease',
  })

  return (
    <div style={{ backgroundColor: '#111111', minHeight: '100vh' }}>
      {/* Team Header */}
      <div style={{ background: `linear-gradient(135deg, ${team.color}22 0%, #0d0d0d 60%)`, borderBottom: '1px solid #2a2a2a', padding: '48px 0 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/teams" style={{ color: '#4A9FE3', fontSize: '13px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '16px' }}>
            ← All Teams
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            {team.logo
              ? <img src={team.logo} alt={team.name} style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '50%', backgroundColor: '#fff', flexShrink: 0 }} />
              : <div style={{
                  width: '80px', height: '80px',
                  backgroundColor: team.color,
                  borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '32px', fontWeight: 900, color: '#fff',
                  flexShrink: 0,
                }}>
                  {team.name[0]}
                </div>
            }
            <div>
              <h1 style={{ color: '#fff', fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, marginBottom: '6px' }}>
                {team.name}
              </h1>
              {currentRecord && (
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ color: '#555', fontSize: '13px' }}>{currentRecord.season} · {currentRecord.league}</span>
                  <span style={{ color: '#27AE60', fontWeight: 800, fontSize: '18px' }}>{currentRecord.wins}W</span>
                  <span style={{ color: '#e74c3c', fontWeight: 800, fontSize: '18px' }}>{currentRecord.losses}L</span>
                  <span style={{ color: '#4A9FE3', fontWeight: 700, fontSize: '15px' }}>{pct}</span>
                </div>
              )}
            </div>
          </div>

          {/* Season Selector */}
          {team.seasonRecords.length > 0 && (
            <div style={{ marginTop: '24px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {team.seasonRecords.map(record => {
                const isActive = record.season === selectedSeason
                return (
                  <button
                    key={`${record.season}-${record.league}`}
                    onClick={() => handleSeasonSelect(record.season)}
                    style={{
                      padding: '6px 16px',
                      borderRadius: '999px',
                      border: `1px solid ${isActive ? team.color : '#3a3a3a'}`,
                      backgroundColor: isActive ? team.color : 'transparent',
                      color: isActive ? '#fff' : '#888',
                      fontSize: '13px',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {record.season}
                  </button>
                )
              })}
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0', marginTop: '24px', borderBottom: '1px solid #2a2a2a' }}>
            <button style={tabStyle('stats')} onClick={() => setActiveTab('stats')}>Stats</button>
            <button style={tabStyle('roster')} onClick={() => setActiveTab('roster')}>Roster</button>
            <button style={tabStyle('schedule')} onClick={() => setActiveTab('schedule')}>Schedule</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
              <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 800, margin: 0 }}>
                {selectedSeason || 'All Seasons'} Roster
                {rosterLoading && <span style={{ color: '#555', fontSize: '14px', fontWeight: 400, marginLeft: '12px' }}>Loading...</span>}
              </h2>
              <span style={{ color: '#555', fontSize: '13px' }}>{team.players.length} player{team.players.length !== 1 ? 's' : ''}</span>
            </div>

            {team.players.length === 0 ? (
              <div style={{ color: '#555', textAlign: 'center', padding: '48px', backgroundColor: '#1a1a1a', borderRadius: '10px', border: '1px solid #2a2a2a' }}>
                No players found for this season
              </div>
            ) : (
              <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', overflow: 'hidden', overflowX: 'auto', opacity: rosterLoading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                  <thead>
                    <tr style={{ backgroundColor: team.color + '22', borderBottom: `2px solid ${team.color}55` }}>
                      {[
                        { label: '#', align: 'center' },
                        { label: 'Name', align: 'left' },
                        { label: 'Pos', align: 'center' },
                        { label: 'GP', align: 'center' },
                        { label: 'PTS', align: 'center' },
                        { label: 'PPG', align: 'center' },
                        { label: 'RPG', align: 'center' },
                        { label: 'APG', align: 'center' },
                        { label: 'SPG', align: 'center' },
                      ].map(h => (
                        <th key={h.label} style={{ padding: '11px 10px', textAlign: h.align as 'left' | 'center', color: '#aaa', fontWeight: 700, fontSize: '11px', whiteSpace: 'nowrap' }}>{h.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {team.players.map((player, i) => (
                      <tr key={player.id} style={{ backgroundColor: i % 2 === 0 ? '#1a1a1a' : '#161616', borderBottom: '1px solid #222' }}>
                        <td style={{ padding: '11px 10px', textAlign: 'center', color: team.color, fontWeight: 800, fontSize: '14px' }}>{player.number}</td>
                        <td style={{ padding: '11px 10px', fontWeight: 600, fontSize: '14px', whiteSpace: 'nowrap' }}>
                          <Link href={`/players/${player.id}`} style={{ color: '#4A9FE3', textDecoration: 'none' }}>
                            {player.name}
                          </Link>
                        </td>
                        <td style={{ padding: '11px 10px', textAlign: 'center' }}>
                          <span style={{ backgroundColor: '#2a2a2a', padding: '2px 7px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, color: '#888' }}>{player.position}</span>
                        </td>
                        <td style={{ padding: '11px 10px', textAlign: 'center', color: '#888', fontSize: '13px' }}>{player.gamesPlayed}</td>
                        <td style={{ padding: '11px 10px', textAlign: 'center', color: '#fff', fontSize: '14px', fontWeight: 700 }}>{player.totalPoints}</td>
                        <td style={{ padding: '11px 10px', textAlign: 'center', color: '#4A9FE3', fontSize: '14px', fontWeight: 700 }}>{player.ppg}</td>
                        <td style={{ padding: '11px 10px', textAlign: 'center', color: '#ccc', fontSize: '13px' }}>{player.rpg}</td>
                        <td style={{ padding: '11px 10px', textAlign: 'center', color: '#ccc', fontSize: '13px' }}>{player.apg}</td>
                        <td style={{ padding: '11px 10px', textAlign: 'center', color: '#ccc', fontSize: '13px' }}>{player.spg}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Roster Tab */}
        {activeTab === 'roster' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '8px' }}>
              <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 800, margin: 0 }}>
                {selectedSeason} Roster
                {rosterLoading && <span style={{ color: '#555', fontSize: '14px', fontWeight: 400, marginLeft: '12px' }}>Loading...</span>}
              </h2>
              <span style={{ color: '#555', fontSize: '13px' }}>{team.players.length} player{team.players.length !== 1 ? 's' : ''}</span>
            </div>
            {team.players.length === 0 ? (
              <div style={{ color: '#555', textAlign: 'center', padding: '48px', backgroundColor: '#1a1a1a', borderRadius: '10px', border: '1px solid #2a2a2a' }}>
                No players found for this season
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', opacity: rosterLoading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                {team.players.map(player => (
                  <Link key={player.id} href={`/players/${player.id}`} style={{ textDecoration: 'none' }}>
                    <div
                      style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#3a3a3a'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#2a2a2a'}
                    >
                      <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: team.color + '22', border: `2px solid ${team.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ color: team.color, fontWeight: 900, fontSize: '16px' }}>#{player.number}</span>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{player.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                          <span style={{ backgroundColor: '#2a2a2a', padding: '1px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, color: '#888' }}>{player.position}</span>
                          {player.gamesPlayed > 0 && <span style={{ color: '#555', fontSize: '11px' }}>{player.gamesPlayed} GP</span>}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
              <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 800, margin: 0 }}>{selectedSeason} Schedule</h2>
              <Link
                href={`/schedule?season=${encodeURIComponent(selectedSeason)}&team=${team.id}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  backgroundColor: team.color, color: '#fff',
                  padding: '8px 18px', borderRadius: '8px',
                  fontSize: '13px', fontWeight: 700, textDecoration: 'none',
                }}
              >
                View Full Schedule →
              </Link>
            </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
            {/* Results */}
            <div>
              <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>
                {selectedSeason} Results
              </h2>
              {recentGames.length === 0 ? (
                <div style={{ color: '#555', textAlign: 'center', padding: '24px', backgroundColor: '#1a1a1a', borderRadius: '10px', border: '1px solid #2a2a2a' }}>
                  No games played yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {recentGames.map(game => {
                    const teamScore = game.isHome ? game.homeScore : game.awayScore
                    const oppScore = game.isHome ? game.awayScore : game.homeScore
                    const opp = game.isHome ? game.awayTeam : game.homeTeam
                    const won = teamScore !== null && oppScore !== null && teamScore > oppScore

                    return (
                      <Link key={game.id} href={`/games/${game.id}`} style={{
                        backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a',
                        borderLeft: `3px solid ${won ? '#27AE60' : '#e74c3c'}`,
                        borderRadius: '8px', padding: '12px 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        textDecoration: 'none', cursor: 'pointer',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: won ? '#27AE60' : '#e74c3c', fontWeight: 700, fontSize: '12px', minWidth: '12px' }}>{won ? 'W' : 'L'}</span>
                          {opp.logo
                            ? <img src={opp.logo} alt="" style={{ width: '20px', height: '20px', objectFit: 'contain', borderRadius: '50%', backgroundColor: '#fff', flexShrink: 0 }} />
                            : <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: opp.color, flexShrink: 0, display: 'inline-block' }} />
                          }
                          <span style={{ color: '#ccc', fontSize: '14px' }}>{opp.name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ color: '#555', fontSize: '12px' }}>
                            {new Date(game.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>
                            {teamScore}–{oppScore}
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Upcoming */}
            <div>
              <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>Upcoming Games</h2>
              {upcomingGames.length === 0 ? (
                <div style={{ color: '#555', textAlign: 'center', padding: '24px', backgroundColor: '#1a1a1a', borderRadius: '10px', border: '1px solid #2a2a2a' }}>
                  No upcoming games scheduled
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {upcomingGames.map(game => {
                    const opp = game.isHome ? game.awayTeam : game.homeTeam
                    return (
                      <Link key={game.id} href={`/games/${game.id}`} style={{
                        backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '12px 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        textDecoration: 'none', cursor: 'pointer',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: '#888', fontWeight: 700, fontSize: '12px' }}>{game.isHome ? 'HOME' : 'AWAY'}</span>
                          {opp.logo
                            ? <img src={opp.logo} alt="" style={{ width: '20px', height: '20px', objectFit: 'contain', borderRadius: '50%', backgroundColor: '#fff', flexShrink: 0 }} />
                            : <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: opp.color, flexShrink: 0, display: 'inline-block' }} />
                          }
                          <span style={{ color: '#ccc', fontSize: '14px' }}>{opp.name}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: '#4A9FE3', fontSize: '13px', fontWeight: 600 }}>
                            {new Date(game.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                          <div style={{ color: '#555', fontSize: '11px' }}>{game.time} · Week {game.week}{game.court ? ` · ${game.court}` : ''}</div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
          </div>
        )}
      </div>
    </div>
  )
}
