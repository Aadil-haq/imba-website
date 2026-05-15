'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface TeamRef { id: string; name: string; color: string; slug: string; logo?: string | null }

interface CareerStats {
  gamesPlayed: number
  points: number; rebounds: number; assists: number; steals: number; blocks: number; turnovers: number
  twoPtMade: number; twoPtAtt: number; threeMade: number; threeAtt: number; ftMade: number; ftAtt: number
  fgMade: number; fgAtt: number
  ppg: string; rpg: string; apg: string; spg: string; bpg: string
  fgPct: string; twoPtPct: string; threePct: string; ftPct: string
}

interface SeasonStat extends CareerStats {
  season: string; league: string
  teamId: string; teamName: string; teamColor: string; teamSlug: string; teamLogo?: string | null
}

interface GameLog {
  gameId: string; date: string; season: string; league: string
  teamName: string; teamColor: string; teamLogo?: string | null
  oppName: string; oppColor: string; oppLogo?: string | null
  result: 'W' | 'L' | null; myScore: number | null; oppScore: number | null
  points: number; rebounds: number; assists: number; steals: number; blocks: number; turnovers: number
  twoPtMade: number; twoPtAtt: number; threeMade: number; threeAtt: number
  ftMade: number; ftAtt: number; fgMade: number; fgAtt: number; fgPct: string
}

interface PlayerProfile {
  id: string; name: string; number: number; position: string
  currentTeam: TeamRef
  teamsHistory: Array<TeamRef & { seasons: string[] }>
  careerStats: CareerStats
  seasonStats: SeasonStat[]
  recentGames: GameLog[]
}

function fmtPct(s: string) { return s === '—' ? '—' : `${s}%` }

const statCard = (label: string, val: string | number, sub?: string) => (
  <div key={label} style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '16px', textAlign: 'center', minWidth: '80px' }}>
    <div style={{ color: '#4A9FE3', fontWeight: 900, fontSize: 'clamp(20px, 4vw, 28px)', lineHeight: 1 }}>{val}</div>
    {sub && <div style={{ color: '#555', fontSize: '10px', fontWeight: 700, marginTop: '2px' }}>{sub}</div>}
    <div style={{ color: '#666', fontSize: '11px', fontWeight: 700, marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
  </div>
)

export default function PlayerProfilePage() {
  return (
    <Suspense fallback={<div style={{ backgroundColor: '#111', minHeight: '100vh' }} />}>
      <PlayerProfile />
    </Suspense>
  )
}

function PlayerProfile() {
  const params = useParams()
  const id = params.id as string

  const [player, setPlayer] = useState<PlayerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'season' | 'career' | 'gamelog'>('season')

  useEffect(() => {
    if (!id) return
    fetch(`/api/players/${id}`)
      .then(r => r.json())
      .then((data: PlayerProfile) => { setPlayer(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div style={{ backgroundColor: '#111', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#555' }}>Loading player...</span>
    </div>
  )

  if (!player) return (
    <div style={{ backgroundColor: '#111', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#e74c3c' }}>Player not found</span>
    </div>
  )

  const c = player.careerStats
  const primaryColor = player.teamsHistory.length > 0 ? player.teamsHistory[0].color : player.currentTeam.color

  return (
    <div style={{ backgroundColor: '#111111', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${primaryColor}22 0%, #0d0d0d 60%)`, borderBottom: '1px solid #2a2a2a', padding: '48px 0 32px' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/stats" style={{ color: '#4A9FE3', fontSize: '13px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '20px' }}>
            ← Back to Stats
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            {/* Jersey number avatar */}
            <div style={{
              width: '88px', height: '88px', borderRadius: '50%', flexShrink: 0,
              background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}99)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '32px', fontWeight: 900, color: '#fff',
              border: `3px solid ${primaryColor}66`,
            }}>
              #{player.number}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
                <h1 style={{ color: '#fff', fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 900, margin: 0 }}>
                  {player.name}
                </h1>
                <span style={{ backgroundColor: '#2a2a2a', color: '#aaa', fontSize: '12px', fontWeight: 700, padding: '3px 10px', borderRadius: '4px' }}>
                  {player.position}
                </span>
              </div>

              {/* Teams history chips */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {player.teamsHistory.map(t => (
                  <Link key={t.id} href={`/teams/${t.slug}`} style={{ textDecoration: 'none' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      backgroundColor: t.color + '22', border: `1px solid ${t.color}55`,
                      color: '#ccc', fontSize: '12px', fontWeight: 600,
                      padding: '4px 10px', borderRadius: '999px',
                    }}>
                      {t.logo
                        ? <img src={t.logo} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain', borderRadius: '50%', flexShrink: 0 }} />
                        : <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: t.color, flexShrink: 0 }} />
                      }
                      {t.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Career seasons count */}
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ color: '#4A9FE3', fontWeight: 900, fontSize: '32px', lineHeight: 1 }}>{player.seasonStats.length}</div>
              <div style={{ color: '#555', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Seasons</div>
            </div>
          </div>

          {/* Career quick stats row */}
          <div style={{ marginTop: '28px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {statCard('PPG', c.ppg)}
            {statCard('RPG', c.rpg)}
            {statCard('APG', c.apg)}
            {statCard('SPG', c.spg)}
            {statCard('BPG', c.bpg)}
            {statCard('GP', c.gamesPlayed)}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Tab nav */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '28px', backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
          {([
            { key: 'season', label: 'Season Stats' },
            { key: 'career', label: 'Career Totals' },
            { key: 'gamelog', label: 'Game Log' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '8px 20px', border: 'none', borderRadius: '8px', cursor: 'pointer',
                fontWeight: 700, fontSize: '13px',
                backgroundColor: activeTab === tab.key ? '#4A9FE3' : 'transparent',
                color: activeTab === tab.key ? '#fff' : '#666',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── SEASON STATS TAB ── */}
        {activeTab === 'season' && (
          player.seasonStats.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#555', padding: '60px', backgroundColor: '#1a1a1a', borderRadius: '12px', border: '1px solid #2a2a2a' }}>
              No season stats recorded
            </div>
          ) : (
            <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', overflow: 'hidden', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '780px', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#4A9FE3' }}>
                    {['Season', 'Team', 'GP', '2PM', '2PA', '2P%', '3PM', '3PA', '3P%', 'FGM', 'FGA', 'FG%', 'FTM', 'FTA', 'FT%', 'PTS', 'PPG', 'REB', 'RPG', 'AST', 'APG', 'STL', 'SPG', 'BLK', 'BPG'].map(h => (
                      <th key={h} style={{ padding: '12px 10px', color: '#fff', fontWeight: 700, fontSize: '11px', textAlign: h === 'Season' || h === 'Team' ? 'left' : 'center', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {player.seasonStats.map((s, i) => (
                    <tr key={`${s.season}-${s.teamId}`} style={{ backgroundColor: i % 2 === 0 ? '#1a1a1a' : '#141414', borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '11px 10px', whiteSpace: 'nowrap' }}>
                        <div style={{ color: '#fff', fontWeight: 700 }}>{s.season}</div>
                        <div style={{ color: '#555', fontSize: '10px' }}>{s.league}</div>
                      </td>
                      <td style={{ padding: '11px 10px', whiteSpace: 'nowrap' }}>
                        <Link href={`/teams/${s.teamSlug}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {s.teamLogo
                            ? <img src={s.teamLogo} alt="" style={{ width: '18px', height: '18px', objectFit: 'contain', borderRadius: '50%', flexShrink: 0 }} />
                            : <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: s.teamColor, flexShrink: 0 }} />
                          }
                          <span style={{ color: '#aaa', fontSize: '12px' }}>{s.teamName}</span>
                        </Link>
                      </td>
                      <td style={{ padding: '11px 10px', textAlign: 'center', color: '#888' }}>{s.gamesPlayed}</td>
                      <td style={{ padding: '11px 10px', textAlign: 'center', color: '#888' }}>{s.twoPtMade}</td>
                      <td style={{ padding: '11px 10px', textAlign: 'center', color: '#555' }}>{s.twoPtAtt}</td>
                      <td style={{ padding: '11px 10px', textAlign: 'center', color: '#bbb' }}>{s.twoPtAtt > 0 ? fmtPct(s.twoPtPct) : ''}</td>
                      <td style={{ padding: '11px 10px', textAlign: 'center', color: '#888' }}>{s.threeMade}</td>
                      <td style={{ padding: '11px 10px', textAlign: 'center', color: '#555' }}>{s.threeAtt}</td>
                      <td style={{ padding: '11px 10px', textAlign: 'center', color: '#bbb' }}>{s.threeAtt > 0 ? fmtPct(s.threePct) : ''}</td>
                      <td style={{ padding: '11px 10px', textAlign: 'center', color: '#888' }}>{s.fgMade}</td>
                      <td style={{ padding: '11px 10px', textAlign: 'center', color: '#555' }}>{s.fgAtt}</td>
                      <td style={{ padding: '11px 10px', textAlign: 'center', color: '#bbb' }}>{s.fgAtt > 0 ? fmtPct(s.fgPct) : ''}</td>
                      <td style={{ padding: '11px 10px', textAlign: 'center', color: '#888' }}>{s.ftMade}</td>
                      <td style={{ padding: '11px 10px', textAlign: 'center', color: '#555' }}>{s.ftAtt}</td>
                      <td style={{ padding: '11px 10px', textAlign: 'center', color: '#bbb' }}>{s.ftAtt > 0 ? fmtPct(s.ftPct) : ''}</td>
                      <td style={{ padding: '11px 10px', textAlign: 'center', color: '#ccc' }}>{s.points}</td>
                      <td style={{ padding: '11px 10px', textAlign: 'center', color: '#4A9FE3', fontWeight: 700 }}>{s.ppg}</td>
                      <td style={{ padding: '11px 10px', textAlign: 'center', color: '#ccc' }}>{s.rebounds}</td>
                      <td style={{ padding: '11px 10px', textAlign: 'center', color: '#888' }}>{s.rpg}</td>
                      <td style={{ padding: '11px 10px', textAlign: 'center', color: '#ccc' }}>{s.assists}</td>
                      <td style={{ padding: '11px 10px', textAlign: 'center', color: '#888' }}>{s.apg}</td>
                      <td style={{ padding: '11px 10px', textAlign: 'center', color: '#ccc' }}>{s.steals}</td>
                      <td style={{ padding: '11px 10px', textAlign: 'center', color: '#888' }}>{s.spg}</td>
                      <td style={{ padding: '11px 10px', textAlign: 'center', color: '#ccc' }}>{s.blocks}</td>
                      <td style={{ padding: '11px 10px', textAlign: 'center', color: '#888' }}>{s.bpg}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* ── CAREER TOTALS TAB ── */}
        {activeTab === 'career' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {/* Scoring */}
            <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ color: '#4A9FE3', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '20px' }}>Scoring</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  ['Points', c.points, c.ppg + '/G'],
                  ['2-Pointers', `${c.twoPtMade}/${c.twoPtAtt}`, ''],
                  ['3-Pointers', `${c.threeMade}/${c.threeAtt}`, ''],
                  ['Field Goals', `${c.fgMade}/${c.fgAtt}`, ''],
                  ['Free Throws', `${c.ftMade}/${c.ftAtt}`, ''],
                ].map(([label, val, sub]) => (
                  <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #222' }}>
                    <span style={{ color: '#888', fontSize: '13px' }}>{label}</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>{val}</span>
                      {sub && <span style={{ color: '#555', fontSize: '11px', marginLeft: '8px' }}>{sub}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Other stats */}
            <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '24px' }}>
              <h3 style={{ color: '#4A9FE3', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '20px' }}>Totals & Averages</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  ['Games Played', c.gamesPlayed, ''],
                  ['Rebounds', c.rebounds, c.rpg + '/G'],
                  ['Assists', c.assists, c.apg + '/G'],
                  ['Steals', c.steals, c.spg + '/G'],
                  ['Blocks', c.blocks, c.bpg + '/G'],
                  ['Turnovers', c.turnovers, ''],
                ].map(([label, val, sub]) => (
                  <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #222' }}>
                    <span style={{ color: '#888', fontSize: '13px' }}>{label}</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>{val}</span>
                      {sub && <span style={{ color: '#555', fontSize: '11px', marginLeft: '8px' }}>{sub}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Teams history */}
            {player.teamsHistory.length > 0 && (
              <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ color: '#4A9FE3', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '20px' }}>Teams</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {player.teamsHistory.map(t => (
                    <Link key={t.id} href={`/teams/${t.slug}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #222' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {t.logo
                          ? <img src={t.logo} alt="" style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '50%', flexShrink: 0 }} />
                          : <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: t.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 900, color: '#fff', flexShrink: 0 }}>{t.name[0]}</div>
                        }
                        <span style={{ color: '#ccc', fontWeight: 600, fontSize: '14px' }}>{t.name}</span>
                      </div>
                      <span style={{ color: '#555', fontSize: '11px' }}>{t.seasons.length} season{t.seasons.length !== 1 ? 's' : ''}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── GAME LOG TAB ── */}
        {activeTab === 'gamelog' && (
          player.recentGames.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#555', padding: '60px', backgroundColor: '#1a1a1a', borderRadius: '12px', border: '1px solid #2a2a2a' }}>
              No game log available
            </div>
          ) : (
            <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', overflow: 'hidden', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '720px', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#4A9FE3' }}>
                    {['Date', 'Season', 'Team', 'Opp', 'W/L', 'Score', 'PTS', 'REB', 'AST', 'STL', 'BLK', 'TO', 'FGM-A', '3PM-A', 'FTM-A', 'FG%'].map(h => (
                      <th key={h} style={{ padding: '12px 10px', color: '#fff', fontWeight: 700, fontSize: '11px', textAlign: h === 'Date' || h === 'Team' || h === 'Opp' || h === 'Season' ? 'left' : 'center', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {player.recentGames.map((game, i) => (
                    <tr key={game.gameId} style={{ backgroundColor: i % 2 === 0 ? '#1a1a1a' : '#141414', borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '11px 10px', color: '#888', whiteSpace: 'nowrap' }}>
                        {new Date(game.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                      </td>
                      <td style={{ padding: '11px 10px', whiteSpace: 'nowrap' }}>
                        <div style={{ color: '#666', fontSize: '11px' }}>{game.season}</div>
                      </td>
                      <td style={{ padding: '11px 10px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          {game.teamLogo
                            ? <img src={game.teamLogo} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain', borderRadius: '50%', flexShrink: 0 }} />
                            : <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: game.teamColor, flexShrink: 0 }} />
                          }
                          <span style={{ color: '#aaa', fontSize: '12px' }}>{game.teamName}</span>
                        </div>
                      </td>
                      <td style={{ padding: '11px 10px', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          {game.oppLogo
                            ? <img src={game.oppLogo} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain', borderRadius: '50%', flexShrink: 0 }} />
                            : <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: game.oppColor, flexShrink: 0 }} />
                          }
                          <span style={{ color: '#666', fontSize: '12px' }}>{game.oppName}</span>
                        </div>
                      </td>
                      <td style={{ padding: '11px 10px', textAlign: 'center' }}>
                        {game.result && (
                          <span style={{ fontWeight: 700, fontSize: '12px', color: game.result === 'W' ? '#27AE60' : '#e74c3c' }}>{game.result}</span>
                        )}
                      </td>
                      <td style={{ padding: '11px 10px', textAlign: 'center', color: '#777', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {game.myScore !== null ? `${game.myScore}–${game.oppScore}` : '—'}
                      </td>
                      <td style={{ padding: '11px 10px', textAlign: 'center', color: '#4A9FE3', fontWeight: 700 }}>{game.points}</td>
                      <td style={{ padding: '11px 10px', textAlign: 'center', color: '#ccc' }}>{game.rebounds}</td>
                      <td style={{ padding: '11px 10px', textAlign: 'center', color: '#ccc' }}>{game.assists}</td>
                      <td style={{ padding: '11px 10px', textAlign: 'center', color: '#888' }}>{game.steals}</td>
                      <td style={{ padding: '11px 10px', textAlign: 'center', color: '#888' }}>{game.blocks}</td>
                      <td style={{ padding: '11px 10px', textAlign: 'center', color: '#888' }}>{game.turnovers}</td>
                      <td style={{ padding: '11px 10px', textAlign: 'center', color: '#777', whiteSpace: 'nowrap' }}>{game.fgMade}-{game.fgAtt}</td>
                      <td style={{ padding: '11px 10px', textAlign: 'center', color: '#777', whiteSpace: 'nowrap' }}>{game.threeMade}-{game.threeAtt}</td>
                      <td style={{ padding: '11px 10px', textAlign: 'center', color: '#777', whiteSpace: 'nowrap' }}>{game.ftMade}-{game.ftAtt}</td>
                      <td style={{ padding: '11px 10px', textAlign: 'center', color: '#bbb' }}>{fmtPct(game.fgPct)}</td>
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
