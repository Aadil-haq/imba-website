'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

type View = 'leaders' | 'full'
type LeaderCat = 'points' | 'rebounds' | 'assists' | 'steals' | 'blocks' | 'fg' | 'threePct' | 'ftPct'

interface PlayerStat {
  playerId: string
  playerName: string
  playerNumber: number
  teamName: string
  teamSlug: string
  teamColor: string
  gamesPlayed: number
  ppg: string; rpg: string; apg: string; spg: string; bpg: string
  fgPct: string; twoPtPct: string; threePct: string; ftPct: string
  totalPoints: number; totalRebounds: number; totalAssists: number
  totalSteals: number; totalBlocks: number
  twoPtMade: number; twoPtAtt: number; threeMade: number; threeAtt: number
  ftMade: number; ftAtt: number; fgMade: number; fgAtt: number
}

interface SeasonOption { season: string; league: string }

const LEADER_CATS: { key: LeaderCat; label: string; statKey: string; unit?: string; isPct?: boolean }[] = [
  { key: 'points',   label: 'Points',    statKey: 'ppg' },
  { key: 'rebounds', label: 'Rebounds',  statKey: 'rpg' },
  { key: 'assists',  label: 'Assists',   statKey: 'apg' },
  { key: 'steals',   label: 'Steals',    statKey: 'spg' },
  { key: 'blocks',   label: 'Blocks',    statKey: 'bpg' },
  { key: 'fg',       label: 'FG%',       statKey: 'fgPct',    isPct: true },
  { key: 'threePct', label: '3P%',       statKey: 'threePct', isPct: true },
  { key: 'ftPct',    label: 'FT%',       statKey: 'ftPct',    isPct: true },
]

const FULL_COLS: { key: string; label: string; isPct?: boolean; align?: 'left' }[] = [
  { key: 'playerName',    label: 'PLAYER',  align: 'left' },
  { key: 'teamName',      label: 'TEAM',    align: 'left' },
  { key: 'gamesPlayed',   label: 'GP' },
  { key: 'twoPtMade',     label: '2PM' }, { key: 'twoPtAtt', label: '2PA' }, { key: 'twoPtPct', label: '2P%', isPct: true },
  { key: 'threeMade',     label: '3PM' }, { key: 'threeAtt', label: '3PA' }, { key: 'threePct', label: '3P%', isPct: true },
  { key: 'fgMade',        label: 'FGM' }, { key: 'fgAtt',    label: 'FGA' }, { key: 'fgPct',    label: 'FG%', isPct: true },
  { key: 'ftMade',        label: 'FTM' }, { key: 'ftAtt',    label: 'FTA' }, { key: 'ftPct',    label: 'FT%', isPct: true },
  { key: 'totalPoints',   label: 'PTS' }, { key: 'ppg',      label: 'PTS/G' },
  { key: 'totalRebounds', label: 'REB' }, { key: 'rpg',      label: 'REB/G' },
  { key: 'totalAssists',  label: 'AST' }, { key: 'apg',      label: 'AST/G' },
  { key: 'totalSteals',   label: 'STL' }, { key: 'spg',      label: 'STL/G' },
  { key: 'totalBlocks',   label: 'BLK' }, { key: 'bpg',      label: 'BLK/G' },
]

const selectStyle: React.CSSProperties = {
  backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #2a2a2a',
  borderRadius: '8px', padding: '8px 12px', fontSize: '13px', fontWeight: 600,
  cursor: 'pointer', outline: 'none',
}

function pctVal(s: string) { return (s === '—' || !s) ? -1 : parseFloat(s) || 0 }

function getFullSortVal(p: PlayerStat, col: string): number | string {
  switch (col) {
    case 'playerName': return p.playerName
    case 'teamName': return p.teamName
    case 'gamesPlayed': return p.gamesPlayed
    case 'twoPtMade': return p.twoPtMade; case 'twoPtAtt': return p.twoPtAtt; case 'twoPtPct': return pctVal(p.twoPtPct)
    case 'threeMade': return p.threeMade; case 'threeAtt': return p.threeAtt; case 'threePct': return pctVal(p.threePct)
    case 'fgMade': return p.fgMade; case 'fgAtt': return p.fgAtt; case 'fgPct': return pctVal(p.fgPct)
    case 'ftMade': return p.ftMade; case 'ftAtt': return p.ftAtt; case 'ftPct': return pctVal(p.ftPct)
    case 'totalPoints': return p.totalPoints; case 'ppg': return parseFloat(p.ppg) || 0
    case 'totalRebounds': return p.totalRebounds; case 'rpg': return parseFloat(p.rpg) || 0
    case 'totalAssists': return p.totalAssists; case 'apg': return parseFloat(p.apg) || 0
    case 'totalSteals': return p.totalSteals; case 'spg': return parseFloat(p.spg) || 0
    case 'totalBlocks': return p.totalBlocks; case 'bpg': return parseFloat(p.bpg) || 0
    default: return 0
  }
}

function fmtPct(s: string) { return (s === '—' || !s) ? '—' : `${s}%` }

function getFullCellVal(p: PlayerStat, col: string): string | number {
  switch (col) {
    case 'playerName': return `#${p.playerNumber} ${p.playerName}`
    case 'teamName': return p.teamName
    case 'gamesPlayed': return p.gamesPlayed
    case 'twoPtMade': return p.twoPtMade; case 'twoPtAtt': return p.twoPtAtt; case 'twoPtPct': return fmtPct(p.twoPtPct)
    case 'threeMade': return p.threeMade; case 'threeAtt': return p.threeAtt; case 'threePct': return fmtPct(p.threePct)
    case 'fgMade': return p.fgMade; case 'fgAtt': return p.fgAtt; case 'fgPct': return fmtPct(p.fgPct)
    case 'ftMade': return p.ftMade; case 'ftAtt': return p.ftAtt; case 'ftPct': return fmtPct(p.ftPct)
    case 'totalPoints': return p.totalPoints; case 'ppg': return p.ppg
    case 'totalRebounds': return p.totalRebounds; case 'rpg': return p.rpg
    case 'totalAssists': return p.totalAssists; case 'apg': return p.apg
    case 'totalSteals': return p.totalSteals; case 'spg': return p.spg
    case 'totalBlocks': return p.totalBlocks; case 'bpg': return p.bpg
    default: return ''
  }
}

export default function StatsPage() {
  return (
    <Suspense fallback={<div style={{ backgroundColor: '#111111', minHeight: '100vh' }} />}>
      <StatsPageContent />
    </Suspense>
  )
}

function StatsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [view, setView] = useState<View>('leaders')
  const [leaderCat, setLeaderCat] = useState<LeaderCat>('points')
  const [leaderStats, setLeaderStats] = useState<PlayerStat[]>([])
  const [fullStats, setFullStats] = useState<PlayerStat[]>([])
  const [loading, setLoading] = useState(true)
  const [seasonOptions, setSeasonOptions] = useState<SeasonOption[]>([])
  const [selectedSeason, setSelectedSeason] = useState('all')
  const [selectedLeague, setSelectedLeague] = useState('all')
  const [sortCol, setSortCol] = useState('ppg')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const updateUrl = (season: string, league: string, v: View, cat: LeaderCat) => {
    const p = new URLSearchParams()
    if (season && season !== 'all') p.set('season', season)
    if (league !== 'all') p.set('league', league)
    if (v !== 'leaders') p.set('view', v)
    if (cat !== 'points') p.set('cat', cat)
    router.replace(`/stats${p.toString() ? '?' + p : ''}`, { scroll: false })
  }

  useEffect(() => {
    fetch('/api/seasons').then(r => r.json()).then((data: SeasonOption[]) => {
      setSeasonOptions(data)
      const urlSeason = searchParams.get('season')
      const urlLeague = searchParams.get('league') || 'all'
      const urlView = (searchParams.get('view') as View) || 'leaders'
      const urlCat = (searchParams.get('cat') as LeaderCat) || 'points'
      const match = urlSeason && data.find(s => s.season === urlSeason)
      setSelectedSeason(match ? urlSeason : (data[0]?.season ?? 'all'))
      setSelectedLeague(urlLeague)
      setView(urlView)
      setLeaderCat(urlCat)
    }).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch leaderboard for selected category
  useEffect(() => {
    if (view !== 'leaders') return
    setLoading(true)
    const isPct = ['fg', 'threePct', 'ftPct'].includes(leaderCat)
    const params = new URLSearchParams({ category: leaderCat, limit: '15', minGames: isPct ? '3' : '4' })
    if (selectedSeason !== 'all') params.set('season', selectedSeason)
    if (selectedLeague !== 'all') params.set('league', selectedLeague)
    fetch(`/api/stats?${params}`)
      .then(r => r.json())
      .then(d => { setLeaderStats(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => { setLeaderStats([]); setLoading(false) })
  }, [view, leaderCat, selectedSeason, selectedLeague])

  // Fetch full stats table
  useEffect(() => {
    if (view !== 'full') return
    setLoading(true)
    const params = new URLSearchParams({ category: 'points', limit: '200', minGames: '1' })
    if (selectedSeason !== 'all') params.set('season', selectedSeason)
    if (selectedLeague !== 'all') params.set('league', selectedLeague)
    fetch(`/api/stats?${params}`)
      .then(r => r.json())
      .then(d => { setFullStats(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => { setFullStats([]); setLoading(false) })
  }, [view, selectedSeason, selectedLeague])

  const leagues = [...new Set(seasonOptions.map(s => s.league))]
  const filteredSeasons = selectedLeague === 'all' ? seasonOptions : seasonOptions.filter(s => s.league === selectedLeague)
  const cat = LEADER_CATS.find(c => c.key === leaderCat)!

  function handleSort(col: string) {
    if (col === sortCol) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortCol(col); setSortDir('desc') }
  }

  const sortedFull = [...fullStats].sort((a, b) => {
    const av = getFullSortVal(a, sortCol), bv = getFullSortVal(b, sortCol)
    const mul = sortDir === 'desc' ? -1 : 1
    if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * mul
    return ((av as number) - (bv as number)) * mul
  })

  const rankColor = (i: number) => i === 0 ? '#F5A623' : i === 1 ? '#aaa' : i === 2 ? '#cd7f32' : '#555'

  return (
    <div style={{ backgroundColor: '#111111', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#0d0d0d', borderBottom: '1px solid #2a2a2a', padding: '24px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ color: '#4A9FE3', fontSize: '12px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
            {selectedSeason === 'all' ? 'All Seasons' : selectedSeason}
          </div>
          <h1 style={{ color: '#ffffff', fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 900 }}>Player Stats</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ color: '#555', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>League</label>
            <select value={selectedLeague} onChange={e => { const l = e.target.value; setSelectedLeague(l); setSelectedSeason('all'); updateUrl('all', l, view, leaderCat) }} style={selectStyle}>
              <option value="all">All Leagues</option>
              {leagues.map(l => <option key={l} value={l}>{l === 'Comp' ? 'Comp (D1)' : l === 'Rec' ? 'Rec (D2/D3)' : l}</option>)}
            </select>
          </div>
          <div>
            <label style={{ color: '#555', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Season</label>
            <select value={selectedSeason} onChange={e => { const s = e.target.value; setSelectedSeason(s); updateUrl(s, selectedLeague, view, leaderCat) }} style={selectStyle}>
              <option value="all">All Seasons</option>
              {filteredSeasons.map(s => <option key={`${s.season}-${s.league}`} value={s.season}>{s.season}</option>)}
            </select>
          </div>
          {/* View toggle */}
          <div style={{ display: 'flex', backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', overflow: 'hidden', marginLeft: 'auto' }}>
            {(['leaders', 'full'] as View[]).map(v => (
              <button key={v} onClick={() => { setView(v); updateUrl(selectedSeason, selectedLeague, v, leaderCat) }} style={{
                padding: '8px 18px', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer',
                backgroundColor: view === v ? '#4A9FE3' : 'transparent',
                color: view === v ? '#fff' : '#666',
              }}>
                {v === 'leaders' ? '🏆 Leaders' : '📊 Full Stats'}
              </button>
            ))}
          </div>
        </div>

        {/* ── LEADERS VIEW ── */}
        {view === 'leaders' && (
          <>
            {/* Category tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
              {LEADER_CATS.map(c => (
                <button key={c.key} onClick={() => { setLeaderCat(c.key); updateUrl(selectedSeason, selectedLeague, view, c.key) }} style={{
                  padding: '8px 14px', borderRadius: '6px', fontWeight: 700, fontSize: '14px',
                  cursor: 'pointer', border: 'none',
                  backgroundColor: leaderCat === c.key ? '#4A9FE3' : '#1a1a1a',
                  color: leaderCat === c.key ? '#fff' : '#888',
                  borderBottom: leaderCat === c.key ? 'none' : '1px solid #2a2a2a',
                }}>
                  {c.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', color: '#555', padding: '60px' }}>Loading...</div>
            ) : leaderStats.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#555', padding: '60px', backgroundColor: '#1a1a1a', borderRadius: '12px', border: '1px solid #2a2a2a' }}>
                <div style={{ fontSize: '14px', marginBottom: '8px' }}>No qualifying players for this selection</div>
                <div style={{ fontSize: '12px', color: '#444' }}>
                  {cat.isPct ? 'Players need 3+ games with qualifying attempt minimums' : 'Players need 4+ games to appear on leaderboards'}
                </div>
              </div>
            ) : (
              <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#4A9FE3' }}>
                      <th style={{ padding: '14px 16px', color: '#fff', fontWeight: 700, fontSize: '12px', textAlign: 'left', width: '48px' }}>RANK</th>
                      <th style={{ padding: '14px 16px', color: '#fff', fontWeight: 700, fontSize: '12px', textAlign: 'left' }}>PLAYER</th>
                      <th style={{ padding: '14px 16px', color: '#fff', fontWeight: 700, fontSize: '12px', textAlign: 'left' }}>TEAM</th>
                      <th style={{ padding: '14px 16px', color: '#fff', fontWeight: 700, fontSize: '12px', textAlign: 'center' }}>GP</th>
                      {cat.isPct ? (
                        <>
                          <th style={{ padding: '14px 16px', color: '#fff', fontWeight: 700, fontSize: '12px', textAlign: 'center' }}>ATT</th>
                          <th style={{ padding: '14px 16px', color: '#4A9FE3', fontWeight: 900, fontSize: '14px', textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>{cat.label}</th>
                        </>
                      ) : (
                        <>
                          <th style={{ padding: '14px 16px', color: '#fff', fontWeight: 700, fontSize: '12px', textAlign: 'center' }}>TOTAL</th>
                          <th style={{ padding: '14px 16px', color: '#4A9FE3', fontWeight: 900, fontSize: '14px', textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>{cat.label}/G</th>
                          <th style={{ padding: '14px 16px', color: '#fff', fontWeight: 700, fontSize: '12px', textAlign: 'center' }}>FG%</th>
                          <th style={{ padding: '14px 16px', color: '#fff', fontWeight: 700, fontSize: '12px', textAlign: 'center' }}>3P%</th>
                          <th style={{ padding: '14px 16px', color: '#fff', fontWeight: 700, fontSize: '12px', textAlign: 'center' }}>FT%</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {leaderStats.map((p, i) => (
                      <tr key={p.playerId} style={{ backgroundColor: i % 2 === 0 ? '#1a1a1a' : '#141414', borderBottom: '1px solid #222' }}>
                        <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: '14px', color: rankColor(i) }}>#{i + 1}</td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>
                            {p.playerNumber != null ? `#${p.playerNumber} ` : ''}{p.playerName}
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <Link href={`/teams/${p.teamSlug}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '8px', height: '8px', backgroundColor: p.teamColor, borderRadius: '50%' }} />
                            <span style={{ color: '#aaa', fontSize: '13px' }}>{p.teamName}</span>
                          </Link>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center', color: '#888', fontSize: '14px' }}>{p.gamesPlayed}</td>
                        {cat.isPct ? (
                          <>
                            <td style={{ padding: '14px 16px', textAlign: 'center', color: '#ccc', fontSize: '14px' }}>
                              {cat.key === 'fg' ? p.fgAtt : cat.key === 'threePct' ? p.threeAtt : p.ftAtt}
                            </td>
                            <td style={{ padding: '14px 16px', textAlign: 'center', backgroundColor: 'rgba(74,159,227,0.05)' }}>
                              <span style={{ color: '#4A9FE3', fontWeight: 900, fontSize: '18px' }}>
                                {(p as any)[cat.statKey] !== '—' ? `${(p as any)[cat.statKey]}%` : '—'}
                              </span>
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={{ padding: '14px 16px', textAlign: 'center', color: '#ccc', fontSize: '14px' }}>
                              {(p as any)[cat.key === 'points' ? 'totalPoints' : cat.key === 'rebounds' ? 'totalRebounds' : cat.key === 'assists' ? 'totalAssists' : cat.key === 'steals' ? 'totalSteals' : 'totalBlocks']}
                            </td>
                            <td style={{ padding: '14px 16px', textAlign: 'center', backgroundColor: 'rgba(74,159,227,0.05)' }}>
                              <span style={{ color: '#4A9FE3', fontWeight: 900, fontSize: '18px' }}>{(p as any)[cat.statKey]}</span>
                            </td>
                            <td style={{ padding: '14px 16px', textAlign: 'center', color: '#888', fontSize: '13px' }}>{fmtPct(p.fgPct)}</td>
                            <td style={{ padding: '14px 16px', textAlign: 'center', color: '#888', fontSize: '13px' }}>{fmtPct(p.threePct)}</td>
                            <td style={{ padding: '14px 16px', textAlign: 'center', color: '#888', fontSize: '13px' }}>{fmtPct(p.ftPct)}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── FULL STATS VIEW ── */}
        {view === 'full' && (
          loading ? (
            <div style={{ textAlign: 'center', color: '#555', padding: '60px' }}>Loading...</div>
          ) : fullStats.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#555', padding: '60px', backgroundColor: '#1a1a1a', borderRadius: '12px', border: '1px solid #2a2a2a' }}>
              No stats found for this selection
            </div>
          ) : (
            <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', overflow: 'hidden', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#4A9FE3' }}>
                    <th style={{ padding: '12px 10px', color: '#fff', fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap' }}>#</th>
                    {FULL_COLS.map(col => {
                      const active = sortCol === col.key
                      return (
                        <th key={col.key} onClick={() => handleSort(col.key)} className="sort-th"
                          style={{ padding: 0, whiteSpace: 'nowrap', backgroundColor: active ? 'rgba(0,0,0,0.25)' : 'transparent', cursor: 'pointer', userSelect: 'none' }}>
                          <div style={{ padding: '12px 10px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: col.align === 'left' ? 'flex-start' : 'center', color: '#fff', fontWeight: active ? 900 : 700 }}>
                            {col.label}
                            <span style={{ fontSize: '9px', opacity: active ? 1 : 0.4 }}>{active ? (sortDir === 'desc' ? '▼' : '▲') : '▼'}</span>
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {sortedFull.map((p, i) => (
                    <tr key={p.playerId} style={{ backgroundColor: i % 2 === 0 ? '#1a1a1a' : '#161616', borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '10px', textAlign: 'center', color: rankColor(i), fontWeight: 700 }}>{i + 1}</td>
                      {FULL_COLS.map(col => {
                        const val = getFullCellVal(p, col.key)
                        const active = sortCol === col.key
                        if (col.key === 'playerName') return (
                          <td key={col.key} style={{ padding: '10px 12px', whiteSpace: 'nowrap', backgroundColor: active ? 'rgba(74,159,227,0.06)' : undefined }}>
                            <span style={{ color: '#fff', fontWeight: 700 }}>{val}</span>
                          </td>
                        )
                        if (col.key === 'teamName') return (
                          <td key={col.key} style={{ padding: '10px 12px', whiteSpace: 'nowrap', backgroundColor: active ? 'rgba(74,159,227,0.06)' : undefined }}>
                            <Link href={`/teams/${p.teamSlug}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ width: '7px', height: '7px', backgroundColor: p.teamColor, borderRadius: '50%', display: 'inline-block' }} />
                              <span style={{ color: '#aaa' }}>{val}</span>
                            </Link>
                          </td>
                        )
                        return (
                          <td key={col.key} style={{ padding: '10px', textAlign: 'center', whiteSpace: 'nowrap', backgroundColor: active ? 'rgba(74,159,227,0.08)' : undefined, color: active ? '#4A9FE3' : col.isPct ? '#bbb' : '#888', fontWeight: active ? 700 : 400 }}>
                            {val}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  )
}
