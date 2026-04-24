'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Team {
  id: string
  name: string
  slug: string
  color: string
  playerCount: number
  wins: number
  losses: number
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/teams')
      .then(r => r.json())
      .then(data => { setTeams(data); setLoading(false) })
  }, [])

  return (
    <div style={{ backgroundColor: '#111111', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#0d0d0d', borderBottom: '1px solid #2a2a2a', padding: '40px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ color: '#4A9FE3', fontSize: '12px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>Spring 2025</div>
          <h1 style={{ color: '#ffffff', fontSize: '36px', fontWeight: 900 }}>Teams</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div style={{ textAlign: 'center', color: '#555', padding: '60px' }}>Loading teams...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
            {teams.map(team => {
              const gp = team.wins + team.losses
              const pct = gp > 0 ? (team.wins / gp).toFixed(3) : '.000'
              return (
                <Link
                  key={team.id}
                  href={`/teams/${team.slug}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    transition: 'border-color 0.2s, transform 0.2s',
                    cursor: 'pointer',
                  }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement
                      el.style.borderColor = team.color
                      el.style.transform = 'translateY(-4px)'
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement
                      el.style.borderColor = '#2a2a2a'
                      el.style.transform = 'translateY(0)'
                    }}
                  >
                    {/* Team Color Banner */}
                    <div style={{
                      height: '8px',
                      backgroundColor: team.color,
                    }} />

                    <div style={{ padding: '24px' }}>
                      {/* Team color circle + name */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          backgroundColor: team.color,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 900,
                          fontSize: '20px',
                          color: '#ffffff',
                          flexShrink: 0,
                        }}>
                          {team.name[0]}
                        </div>
                        <div>
                          <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '20px' }}>{team.name}</div>
                          <div style={{ color: '#555', fontSize: '12px' }}>Spring 2025</div>
                        </div>
                      </div>

                      {/* Stats row */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ textAlign: 'center', backgroundColor: '#111', borderRadius: '6px', padding: '10px' }}>
                          <div style={{ color: '#27AE60', fontWeight: 900, fontSize: '22px' }}>{team.wins}</div>
                          <div style={{ color: '#444', fontSize: '11px', fontWeight: 700 }}>WINS</div>
                        </div>
                        <div style={{ textAlign: 'center', backgroundColor: '#111', borderRadius: '6px', padding: '10px' }}>
                          <div style={{ color: '#e74c3c', fontWeight: 900, fontSize: '22px' }}>{team.losses}</div>
                          <div style={{ color: '#444', fontSize: '11px', fontWeight: 700 }}>LOSSES</div>
                        </div>
                        <div style={{ textAlign: 'center', backgroundColor: '#111', borderRadius: '6px', padding: '10px' }}>
                          <div style={{ color: '#4A9FE3', fontWeight: 900, fontSize: '22px' }}>{team.playerCount}</div>
                          <div style={{ color: '#444', fontSize: '11px', fontWeight: 700 }}>PLAYERS</div>
                        </div>
                      </div>

                      {/* Win % bar */}
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ color: '#666', fontSize: '12px' }}>Win Percentage</span>
                          <span style={{ color: '#fff', fontSize: '12px', fontWeight: 700 }}>{pct}</span>
                        </div>
                        <div style={{ height: '4px', backgroundColor: '#2a2a2a', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${parseFloat(pct) * 100}%`,
                            backgroundColor: team.color,
                            borderRadius: '2px',
                            transition: 'width 0.5s ease',
                          }} />
                        </div>
                      </div>

                      <div style={{ color: '#4A9FE3', fontSize: '13px', fontWeight: 600, textAlign: 'right' }}>
                        View Roster →
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
