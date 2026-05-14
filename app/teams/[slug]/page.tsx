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

export default function TeamPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string
  const seasonParam = searchParams.get('season') || ''

  const [team, setTeam] = useState<TeamDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSeason, setSelectedSeason] = useState<string>('')
  const [rosterLoading, setRosterLoading] = useState(false)

  // Initial load — use URL param if present
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
        // Default to the season from the URL param, or the most recent season
        if (seasonParam) {
          setSelectedSeason(seasonParam)
        } else if (data.seasonRecords.length > 0) {
          setSelectedSeason(data.seasonRecords[0].season)
        }
      })
  }, [slug, seasonParam])

  // Re-fetch roster when user picks a different season pill
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

  const recentGames = team.games.filter(g => g.played && g.season === selectedSeason).slice(0, 5)
  const upcomingGames = team.games.filter(g => !g.played && g.season === selectedSeason).slice(0, 3)

  return (
    <div style={{ backgroundColor: '#111111', minHeight: '100vh' }}>
      {/* Team Header */}
      <div style={{ background: `linear-gradient(135deg, ${team.color}22 0%, #0d0d0d 60%)`, borderBottom: '1px solid #2a2a2a', padding: '48px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/teams" style={{ color: '#4A9FE3', fontSize: '13px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '16px' }}>
            ← All Teams
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            {team.logo
              ? <img src={team.logo} alt={team.name} style={{ width: '80px', height: '80px', objectFit: 'contain', flexShrink: 0 }} />
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

          {/* Season Selector Pills */}
          {team.seasonRecords.length > 1 && (
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
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
          {/* Roster */}
          <div style={{ gridColumn: 'span 2' }}>
            <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 800, marginBottom: '20px' }}>
              Roster
              {rosterLoading && <span style={{ color: '#555', fontSize: '14px', fontWeight: 400, marginLeft: '12px' }}>Loading...</span>}
            </h2>
            {team.players.length === 0 ? (
              <div style={{ color: '#555', textAlign: 'center', padding: '32px', backgroundColor: '#1a1a1a', borderRadius: '10px', border: '1px solid #2a2a2a' }}>
                No players on this roster yet
              </div>
            ) : (
              <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', overflow: 'hidden', overflowX: 'auto', opacity: rosterLoading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                  <thead>
                    <tr style={{ backgroundColor: team.color + '33', borderBottom: `2px solid ${team.color}` }}>
                      {['#', 'Name', 'Pos', 'GP', 'PPG', 'RPG', 'APG', 'SPG'].map(h => (
                        <th key={h} style={{ padding: '12px 14px', textAlign: h === 'Name' ? 'left' : 'center', color: '#ccc', fontWeight: 700, fontSize: '12px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {team.players.map((player, i) => (
                      <tr key={player.id} style={{ backgroundColor: i % 2 === 0 ? '#1a1a1a' : '#141414', borderBottom: '1px solid #222' }}>
                        <td style={{ padding: '12px 14px', textAlign: 'center', color: team.color, fontWeight: 800, fontSize: '14px' }}>{player.number}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 600, fontSize: '14px' }}>
                          <Link href={`/players/${player.id}`} style={{ color: '#4A9FE3', textDecoration: 'none', cursor: 'pointer' }}>
                            {player.name}
                          </Link>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', color: '#888', fontSize: '13px' }}>
                          <span style={{ backgroundColor: '#2a2a2a', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700 }}>{player.position}</span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', color: '#888', fontSize: '13px' }}>{player.gamesPlayed}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', color: '#4A9FE3', fontSize: '14px', fontWeight: 700 }}>{player.ppg}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', color: '#ccc', fontSize: '13px' }}>{player.rpg}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', color: '#ccc', fontSize: '13px' }}>{player.apg}</td>
                        <td style={{ padding: '12px 14px', textAlign: 'center', color: '#ccc', fontSize: '13px' }}>{player.spg}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Games */}
        <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
          {/* Recent Games */}
          <div>
            <h2 style={{ color: '#fff', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>Recent Results</h2>
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
                    <div key={game.id} style={{
                      backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a',
                      borderLeft: `3px solid ${won ? '#27AE60' : '#e74c3c'}`,
                      borderRadius: '8px', padding: '12px 16px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: won ? '#27AE60' : '#e74c3c', fontWeight: 700, fontSize: '12px' }}>{won ? 'W' : 'L'}</span>
                        {opp.logo
                          ? <img src={opp.logo} alt="" style={{ width: '20px', height: '20px', objectFit: 'contain', flexShrink: 0 }} />
                          : <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: opp.color, flexShrink: 0, display: 'inline-block' }} />
                        }
                        <span style={{ color: '#ccc', fontSize: '14px' }}>{opp.name}</span>
                      </div>
                      <div style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>
                        {teamScore}–{oppScore}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Upcoming Games */}
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
                    <div key={game.id} style={{
                      backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '12px 16px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#888', fontWeight: 700, fontSize: '12px' }}>{game.isHome ? 'HOME' : 'AWAY'}</span>
                        {opp.logo
                          ? <img src={opp.logo} alt="" style={{ width: '20px', height: '20px', objectFit: 'contain', flexShrink: 0 }} />
                          : <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: opp.color, flexShrink: 0, display: 'inline-block' }} />
                        }
                        <span style={{ color: '#ccc', fontSize: '14px' }}>{opp.name}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#4A9FE3', fontSize: '13px', fontWeight: 600 }}>
                          {new Date(game.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        <div style={{ color: '#555', fontSize: '11px' }}>Week {game.week}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
