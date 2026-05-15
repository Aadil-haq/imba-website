'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

interface TeamEntry {
  id: string
  name: string
  slug: string
  color: string
  logo?: string | null
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
  return (
    <Suspense fallback={<div style={{ backgroundColor: '#111111', minHeight: '100vh' }} />}>
      <TeamsPageContent />
    </Suspense>
  )
}

function TeamsPageContent() {
  const [seasons, setSeasons] = useState<SeasonGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSeason, setActiveSeason] = useState<string>('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabBarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/teams/by-season')
      .then(r => r.json())
      .then((data: SeasonGroup[]) => {
        if (!Array.isArray(data)) { setLoading(false); return }
        setSeasons(data)
        const urlSeason = searchParams.get('season')
        const match = urlSeason && data.find(s => s.season === urlSeason)
        setActiveSeason(match ? urlSeason : (data[0]?.season ?? ''))
        setLoading(false)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll active tab into view when season changes
  useEffect(() => {
    if (!tabBarRef.current || !activeSeason) return
    const el = tabBarRef.current.querySelector(`[data-season-tab]`) as HTMLElement | null
    const active = tabBarRef.current.querySelector(`[data-active-tab="true"]`) as HTMLElement | null
    if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeSeason])

  const selectSeason = (season: string) => {
    setActiveSeason(season)
    router.replace(`/teams?season=${encodeURIComponent(season)}`, { scroll: false })
  }

  const activeSeasonsData = seasons.filter(s => s.isActive)
  const historySeasonsData = seasons.filter(s => !s.isActive)
  const selectedGroup = seasons.find(s => s.season === activeSeason)

  return (
    <div style={{ backgroundColor: '#111111', minHeight: '100vh' }}>
      {/* suppress scrollbar on tab bar */}
      <style>{`.teams-tabbar::-webkit-scrollbar{display:none}`}</style>

      {/* Header */}
      <div style={{ backgroundColor: '#0d0d0d', borderBottom: '1px solid #1e1e1e', padding: '24px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ color: '#4A9FE3', fontSize: '12px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}>
            Irving Masjid Basketball Association
          </div>
          <h1 style={{ color: '#fff', fontSize: 'clamp(22px, 5vw, 36px)', fontWeight: 900 }}>Teams</h1>
        </div>
      </div>

      {/* Horizontal scrollable season tab bar */}
      <div style={{ backgroundColor: '#0d0d0d', borderBottom: '1px solid #1e1e1e', position: 'sticky', top: 0, zIndex: 20 }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            ref={tabBarRef}
            className="teams-tabbar"
            style={{ display: 'flex', overflowX: 'auto', scrollbarWidth: 'none', gap: '0', alignItems: 'stretch' }}
          >
            {/* Current seasons */}
            {activeSeasonsData.length > 0 && (
              <>
                <div style={{ display: 'flex', alignSelf: 'center', paddingRight: '12px', paddingLeft: '2px', flexShrink: 0 }}>
                  <span style={{ color: '#27AE60', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap', padding: '4px 8px', backgroundColor: '#0a2a0a', borderRadius: '4px', border: '1px solid #27AE6033' }}>
                    Active
                  </span>
                </div>
                {activeSeasonsData.map(s => (
                  <SeasonTabButton
                    key={s.season}
                    group={s}
                    isSelected={activeSeason === s.season}
                    onClick={() => selectSeason(s.season)}
                  />
                ))}
                {historySeasonsData.length > 0 && (
                  <div style={{ width: '1px', backgroundColor: '#2a2a2a', margin: '10px 12px', flexShrink: 0 }} />
                )}
              </>
            )}

            {/* History seasons */}
            {historySeasonsData.length > 0 && (
              <>
                {activeSeasonsData.length === 0 && (
                  <div style={{ display: 'flex', alignSelf: 'center', paddingRight: '12px', flexShrink: 0 }}>
                    <span style={{ color: '#555', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                      History
                    </span>
                  </div>
                )}
                {historySeasonsData.map(s => (
                  <SeasonTabButton
                    key={s.season}
                    group={s}
                    isSelected={activeSeason === s.season}
                    onClick={() => selectSeason(s.season)}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div style={{ textAlign: 'center', color: '#555', padding: '80px' }}>Loading teams...</div>
        ) : seasons.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#555', padding: '80px' }}>No seasons found.</div>
        ) : !selectedGroup ? (
          <div style={{ color: '#555', fontSize: '14px' }}>Select a season to view teams.</div>
        ) : (
          <>
            {/* Season header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <h2 style={{ color: '#fff', fontWeight: 900, fontSize: 'clamp(18px, 4vw, 22px)', margin: 0 }}>
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
            {selectedGroup.teams.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#555', padding: '48px', backgroundColor: '#1a1a1a', borderRadius: '12px', border: '1px solid #2a2a2a' }}>
                No teams registered for this season yet.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))', gap: '14px' }}>
                {selectedGroup.teams.map(team => {
                  const gp = team.wins + team.losses
                  const pct = gp > 0 ? (team.wins / gp).toFixed(3) : '.000'
                  return (
                    <Link key={team.id} href={`/teams/${team.slug}?season=${encodeURIComponent(selectedGroup.season)}`} style={{ textDecoration: 'none' }}>
                      <div
                        style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', overflow: 'hidden', transition: 'border-color 0.18s, transform 0.18s', cursor: 'pointer', height: '100%' }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.borderColor = team.color
                          ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.borderColor = '#2a2a2a'
                          ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
                        }}
                      >
                        <div style={{ height: '5px', backgroundColor: team.color }} />
                        <div style={{ padding: '16px' }}>
                          {/* Name row */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                            {team.logo
                              ? <img src={team.logo} alt="" style={{ width: '38px', height: '38px', objectFit: 'contain', flexShrink: 0 }} />
                              : <div style={{ width: '38px', height: '38px', backgroundColor: team.color, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '16px', color: '#fff', flexShrink: 0 }}>{team.name[0]}</div>
                            }
                            <div style={{ color: '#fff', fontWeight: 800, fontSize: '15px', lineHeight: '1.2' }}>{team.name}</div>
                          </div>

                          {/* Record */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '12px' }}>
                            <div style={{ textAlign: 'center', backgroundColor: '#111', borderRadius: '6px', padding: '7px 4px' }}>
                              <div style={{ color: '#27AE60', fontWeight: 900, fontSize: '18px' }}>{team.wins}</div>
                              <div style={{ color: '#444', fontSize: '10px', fontWeight: 700 }}>WINS</div>
                            </div>
                            <div style={{ textAlign: 'center', backgroundColor: '#111', borderRadius: '6px', padding: '7px 4px' }}>
                              <div style={{ color: '#e74c3c', fontWeight: 900, fontSize: '18px' }}>{team.losses}</div>
                              <div style={{ color: '#444', fontSize: '10px', fontWeight: 700 }}>LOSSES</div>
                            </div>
                          </div>

                          {/* Win % bar */}
                          <div style={{ marginBottom: '10px' }}>
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
            )}
          </>
        )}
      </div>
    </div>
  )
}

function SeasonTabButton({ group, isSelected, onClick }: { group: SeasonGroup; isSelected: boolean; onClick: () => void }) {
  const leagueColor = LEAGUE_COLORS[group.league] ?? '#888'
  return (
    <button
      onClick={onClick}
      data-season-tab
      data-active-tab={isSelected ? 'true' : 'false'}
      style={{
        flexShrink: 0,
        background: 'transparent',
        border: 'none',
        borderBottom: isSelected ? `2px solid ${leagueColor}` : '2px solid transparent',
        padding: '12px 14px 10px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        textAlign: 'left',
      }}
    >
      <div style={{ color: isSelected ? '#fff' : '#666', fontWeight: isSelected ? 700 : 500, fontSize: '13px', whiteSpace: 'nowrap', marginBottom: '2px' }}>
        {group.season}
      </div>
      <div style={{ color: isSelected ? leagueColor : '#444', fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap' }}>
        {group.league} · {group.teams.length}
      </div>
    </button>
  )
}
