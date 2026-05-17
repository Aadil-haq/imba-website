'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface TeamRow {
  teamId: string
  teamName: string
  teamSlug: string
  teamColor: string
  teamLogo?: string | null
  wins: number
  losses: number
  pct: string
  streak: string
}

interface Props {
  seasons: string[]
  defaultSeason: string
}

export default function StandingsWidget({ seasons, defaultSeason }: Props) {
  const initial = seasons.includes(defaultSeason) ? defaultSeason : (seasons[0] ?? '')
  const [season, setSeason] = useState(initial)
  const [rows, setRows] = useState<TeamRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/standings?season=${encodeURIComponent(season)}`)
      const data = await res.json()
      setRows(data.standings ?? [])
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [season])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ color: '#4A9FE3', fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>League</div>
          <h2 style={{ color: '#fff', fontSize: 'clamp(20px,4vw,26px)', fontWeight: 900, letterSpacing: '-0.02em', margin: 0 }}>Standings</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select
            value={season}
            onChange={e => setSeason(e.target.value)}
            style={{
              backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '6px',
              color: '#ccc', fontSize: '12px', fontWeight: 600, padding: '6px 10px',
              cursor: 'pointer', outline: 'none',
            }}
          >
            {seasons.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <Link href="/standings" style={{ color: '#555', fontSize: '13px', textDecoration: 'none', fontWeight: 600, whiteSpace: 'nowrap' }}>Full →</Link>
        </div>
      </div>

      {loading ? (
        <div style={{ backgroundColor: '#141414', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '40px', textAlign: 'center', color: '#333', fontSize: '13px' }}>
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div style={{ backgroundColor: '#141414', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '40px', textAlign: 'center', color: '#333', fontSize: '13px' }}>
          No standings for this season yet
        </div>
      ) : (
        <div style={{ backgroundColor: '#141414', border: '1px solid #1e1e1e', borderRadius: '10px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f0f0f' }}>
                {['#', 'Team', 'W', 'L', 'PCT', 'STK'].map(h => (
                  <th key={h} style={{
                    padding: '8px 10px', textAlign: h === 'Team' || h === '#' ? 'left' : 'center',
                    color: '#333', fontWeight: 700, fontSize: '10px', letterSpacing: '0.08em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((team, i) => (
                <tr key={team.teamId} style={{ borderBottom: '1px solid #181818' }}>
                  <td style={{ padding: '10px 10px', color: i < 2 ? '#4A9FE3' : '#333', fontWeight: 700, fontSize: '11px', width: '24px' }}>{i + 1}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <Link href={`/teams/${team.teamSlug}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '7px' }}>
                      {team.teamLogo
                        ? <img src={team.teamLogo} alt="" style={{ width: '18px', height: '18px', objectFit: 'contain', borderRadius: '50%', backgroundColor: '#fff', flexShrink: 0 }} />
                        : <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: team.teamColor, flexShrink: 0 }} />
                      }
                      <span style={{ color: '#ccc', fontSize: '12px', fontWeight: 600 }}>{team.teamName}</span>
                    </Link>
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'center', color: '#27AE60', fontWeight: 700, fontSize: '12px', width: '28px' }}>{team.wins}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'center', color: '#e74c3c', fontWeight: 700, fontSize: '12px', width: '28px' }}>{team.losses}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'center', color: '#666', fontSize: '11px', width: '44px' }}>{team.pct}</td>
                  <td style={{ padding: '10px 10px', textAlign: 'center', fontSize: '11px', fontWeight: 700, width: '36px', color: team.streak.startsWith('W') ? '#27AE60' : '#e74c3c' }}>
                    {team.streak}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
