'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type StatKey = 'ppg' | 'rpg' | 'apg'

interface Leader {
  playerId: string
  playerName: string
  teamName: string
  teamColor: string
  gamesPlayed: number
  ppg: string | number
  rpg: string | number
  apg: string | number
}

interface Props {
  seasons: string[]
  defaultSeason?: string
}

const STAT_LABELS: Record<StatKey, string> = {
  ppg: 'Points',
  rpg: 'Rebounds',
  apg: 'Assists',
}

export default function StatsLeaderboard({ seasons, defaultSeason }: Props) {
  const [stat, setStat] = useState<StatKey>('ppg')
  const initial = defaultSeason && seasons.includes(defaultSeason) ? defaultSeason : (seasons[0] ?? '')
  const [season, setSeason] = useState<string>(initial)
  const [leaders, setLeaders] = useState<Leader[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qs = season ? `?season=${encodeURIComponent(season)}` : ''
      const res = await fetch(`/api/stats/leaders${qs}`)
      const data = await res.json()
      const key = stat === 'ppg' ? 'scorers' : stat === 'rpg' ? 'rebounders' : 'assisters'
      setLeaders(data[key] ?? [])
    } catch {
      setLeaders([])
    } finally {
      setLoading(false)
    }
  }, [stat, season])

  useEffect(() => { load() }, [load])

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ color: '#4A9FE3', fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>Leaders</div>
          <h2 style={{ color: '#fff', fontSize: 'clamp(20px,4vw,26px)', fontWeight: 900, letterSpacing: '-0.02em', margin: 0 }}>Stat Leaders</h2>
        </div>

        {/* Season selector */}
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
      </div>

      {/* Stat toggle */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', backgroundColor: '#0f0f0f', borderRadius: '8px', padding: '4px', border: '1px solid #1a1a1a' }}>
        {(Object.keys(STAT_LABELS) as StatKey[]).map(key => (
          <button
            key={key}
            onClick={() => setStat(key)}
            style={{
              flex: 1, padding: '8px 0', border: 'none', borderRadius: '6px', cursor: 'pointer',
              fontSize: '12px', fontWeight: 700, transition: 'all 0.15s',
              backgroundColor: stat === key ? '#4A9FE3' : 'transparent',
              color: stat === key ? '#fff' : '#555',
              letterSpacing: '0.03em',
            }}
          >
            {STAT_LABELS[key]}
          </button>
        ))}
      </div>

      {/* Leaders list */}
      {loading ? (
        <div style={{ backgroundColor: '#141414', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '32px', textAlign: 'center', color: '#333', fontSize: '13px' }}>
          Loading…
        </div>
      ) : leaders.length === 0 ? (
        <div style={{ backgroundColor: '#141414', border: '1px solid #1e1e1e', borderRadius: '10px', padding: '32px', textAlign: 'center', color: '#333', fontSize: '13px' }}>
          No stats yet for this season
        </div>
      ) : (
        <div style={{ backgroundColor: '#141414', border: '1px solid #1e1e1e', borderRadius: '10px', overflow: 'hidden' }}>
          {leaders.map((leader, i) => (
            <div key={leader.playerId} style={{
              display: 'flex', alignItems: 'center', padding: '12px 16px',
              borderBottom: i < leaders.length - 1 ? '1px solid #1a1a1a' : 'none',
            }}>
              <span style={{ color: i === 0 ? '#4A9FE3' : '#333', fontWeight: 700, fontSize: '14px', width: '20px', flexShrink: 0 }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link href={`/players/${leader.playerId}`} style={{ color: '#4A9FE3', fontWeight: 700, fontSize: '14px', textDecoration: 'none', cursor: 'pointer' }}>
                  {leader.playerName}
                </Link>
                <div style={{ color: '#444', fontSize: '11px' }}>{leader.teamName}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span style={{ color: i === 0 ? '#4A9FE3' : '#ccc', fontWeight: 900, fontSize: '20px', letterSpacing: '-0.02em' }}>
                  {String(leader[stat])}
                </span>
                <div style={{ color: '#333', fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{stat}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
