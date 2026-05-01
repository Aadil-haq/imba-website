'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface TeamEntry {
  id: string
  name: string
  slug: string
  color: string
  wins: number
  losses: number
  playerCount: number
}

interface SeasonGroup {
  season: string
  league: string
  isActive: boolean
  teams: TeamEntry[]
}

const LEAGUE_COLORS: Record<string, string> = {
  Comp: '#4A9FE3',
  Rec: '#27AE60',
  '35+': '#F5A623',
  'Rec League': '#27AE60',
  U17: '#f97316',
  Unknown: '#888',
}

export default function TeamsPage() {
  const [seasons, setSeasons] = useState<SeasonGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSeason, setActiveSeason] = useState<string>('')

  useEffect(() => {
    fetch('/api/teams/by-season')
      .then(r => r.json())
      .then((data: SeasonGroup[]) => {
        setSeasons(Array.isArray(data) ? data : [])
        // Default to first (most recent/active) season
        if (Array.isArray(data) && data.length > 0) setActiveSeason(data[0].season)
        setLoading(false)
      })
  }, [])

  const activeSeasonsData = seasons.filter(s => s.isActive)
  const historySeasonsData = seasons.filter(s => !s.isActive)
  const selectedGroup = seasons.find(s => s.season === activeSeason)

  return (
    <div style={{ backgroundColor: '#111111', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#0d0d0d', borderBottom: '1px solid #1e1e1e', padding: '24px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ color: '#4A9FE3', fontSize: '12px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}>
            Irving Masjid Basketball Association
          </div>
          <h1 style={{ color: '#fff', fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 900 }}>Teams</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {loading ? (
          <div style={{ textAlign: 'center', color: '#555', padding: '80px' }}>Loading teams...</div>
        ) : seasons.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#555', padding: '80px' }}>No seasons found.</div>
        ) : (
          <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>

            {/* ── Left sidebar: season list ── */}
            <div style={{ width: '220px', flexShrink: 0 }}>
              {/* Active seasons */}
              {activeSeasonsData.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ color: '#555', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px', paddingLeft: '4px' }}>
                    Current
                  </div>
                  {activeSeasonsData.map(s => (
                    <SeasonTab
                      key={s.season}
                      group={s}
                      isSelected={activeSeason === s.season}
                      onClick={() => setActiveSeason(s.season)}
                    />
                  ))}
                </div>
              )}

              {/* History */}
              {historySeasonsData.length > 0 && (
                <div>
                  <div style={{ color: '#555', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '8px', paddingLeft: '4px' }}>
                    History
                  </div>
                  {historySeasonsData.map(s => (
                    <SeasonTab
                      key={s.season}
                      group={s}
                      isSelected={activeSeason === s.season}
                      onClick={() => setActiveSeason(s.season)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── Right panel: teams for selected season ── */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {selectedGroup ? (
                <>
                  {/* Season header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                    <h2 style={{ color: '#fff', fontWeight: 900, fontSize: '22px', margin: 0 }}>
                      {selectedGroup.season}
                    </h2>
                    <span style={{
                      backgroundColor: (LEAGUE_COLORS[selectedGroup.league] ?? '#888') + '22',
                      color: LEAGUE_COLORS[selectedGroup.league] ?? '#888',
                      border: `1px solid ${LEAGUE_COLORS[selectedGroup.league] ?? '#888'}`,
                      borderRadius: '6px',
                      padding: '3px 10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                    }}>
                      {selectedGroup.league}
                    </span>
                    {selectedGroup.isActive && (
                      <span style={{ backgroundColor: '#0a3a1a', color: '#27AE60', border: '1px solid #27AE60', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', fontWeight: 700 }}>
                        ACTIVE
                      </span>
                    )}
                    <span style={{ color: '#444', fontSize: '13px', marginLeft: 'auto' }}>
                      {selectedGroup.teams.length} team{selectedGroup.teams.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Team cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px, 100%), 1fr))', gap: '16px' }}>
                    {selectedGroup.teams.map(team => {
                      const gp = team.wins + team.losses
                      const pct = gp > 0 ? (team.wins / gp).toFixed(3) : '.000'
                      return (
                        <Link key={team.id} href={`/teams/${team.slug}?season=${encodeURIComponent(selectedGroup.season)}`} style={{ textDecoration: 'none' }}>
                          <div
                            style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', overflow: 'hidden', transition: 'border-color 0.18s, transform 0.18s', cursor: 'pointer' }}
                            onMouseEnter={e => {
                              (e.currentTarget as HTMLElement).style.borderColor = team.color;
                              (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'
                            }}
                            onMouseLeave={e => {
                              (e.currentTarget as HTMLElement).style.borderColor = '#2a2a2a';
                              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                            }}
                          >
                            <div style={{ height: '5px', backgroundColor: team.color }} />
                            <div style={{ padding: '18px' }}>
                              {/* Name row */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                                <div style={{ width: '40px', height: '40px', backgroundColor: team.color, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '17px', color: '#fff', flexShrink: 0 }}>
                                  {team.name[0]}
                                </div>
                                <div style={{ color: '#fff', fontWeight: 800, fontSize: '16px', lineHeight: '1.2' }}>{team.name}</div>
                              </div>

                              {/* Record */}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                                <div style={{ textAlign: 'center', backgroundColor: '#111', borderRadius: '6px', padding: '8px 4px' }}>
                                  <div style={{ color: '#27AE60', fontWeight: 900, fontSize: '20px' }}>{team.wins}</div>
                                  <div style={{ color: '#444', fontSize: '10px', fontWeight: 700 }}>WINS</div>
                                </div>
                                <div style={{ textAlign: 'center', backgroundColor: '#111', borderRadius: '6px', padding: '8px 4px' }}>
                                  <div style={{ color: '#e74c3c', fontWeight: 900, fontSize: '20px' }}>{team.losses}</div>
                                  <div style={{ color: '#444', fontSize: '10px', fontWeight: 700 }}>LOSSES</div>
                                </div>
                                <div style={{ textAlign: 'center', backgroundColor: '#111', borderRadius: '6px', padding: '8px 4px' }}>
                                  <div style={{ color: '#4A9FE3', fontWeight: 900, fontSize: '20px' }}>{team.playerCount}</div>
                                  <div style={{ color: '#444', fontSize: '10px', fontWeight: 700 }}>PLAYERS</div>
                                </div>
                              </div>

                              {/* Win % bar */}
                              <div style={{ marginBottom: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                  <span style={{ color: '#555', fontSize: '11px' }}>Win %</span>
                                  <span style={{ color: '#fff', fontSize: '11px', fontWeight: 700 }}>{pct}</span>
                                </div>
                                <div style={{ height: '3px', backgroundColor: '#2a2a2a', borderRadius: '2px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${parseFloat(pct) * 100}%`, backgroundColor: team.color, borderRadius: '2px' }} />
                                </div>
                              </div>

                              <div style={{ color: '#4A9FE3', fontSize: '12px', fontWeight: 600, textAlign: 'right' }}>
                                View Roster →
                              </div>
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </>
              ) : (
                <div style={{ color: '#555', fontSize: '14px' }}>Select a season to view teams.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SeasonTab({ group, isSelected, onClick }: { group: SeasonGroup; isSelected: boolean; onClick: () => void }) {
  const leagueColor = LEAGUE_COLORS[group.league] ?? '#888'
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        background: isSelected ? '#1e1e1e' : 'transparent',
        border: isSelected ? `1px solid ${leagueColor}44` : '1px solid transparent',
        borderLeft: isSelected ? `3px solid ${leagueColor}` : '3px solid transparent',
        borderRadius: '6px',
        padding: '10px 12px',
        cursor: 'pointer',
        marginBottom: '4px',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ color: isSelected ? '#fff' : '#888', fontWeight: isSelected ? 700 : 500, fontSize: '13px', lineHeight: '1.3', marginBottom: '4px' }}>
        {group.season}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ color: leagueColor, fontSize: '10px', fontWeight: 700 }}>{group.league}</span>
        <span style={{ color: '#444', fontSize: '10px' }}>· {group.teams.length} teams</span>
      </div>
    </button>
  )
}
