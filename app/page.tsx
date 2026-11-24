export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { prisma } from '@/lib/db'
import { DEFAULT_SETTINGS } from '@/app/api/admin/homepage/route'
import StatsLeaderboard from '@/components/StatsLeaderboard'
import StandingsWidget from '@/components/StandingsWidget'
import LiveRefresh from '@/components/LiveRefresh'
import { getLiveGames } from '@/lib/liveStats'

function abbrev(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length === 1) return name.slice(0, 4).toUpperCase()
  return words.map(w => w[0]).join('').toUpperCase().slice(0, 4)
}

async function getSiteSettings(): Promise<Record<string, string>> {
  const rows = await prisma.siteSetting.findMany()
  const saved = Object.fromEntries(rows.map(r => [r.key, r.value]))
  return { ...DEFAULT_SETTINGS, ...saved }
}

interface TeamStanding {
  id: string; name: string; slug: string; color: string; logo?: string | null
  wins: number; losses: number
}
interface DivisionStandings { season: string; league: string; teams: TeamStanding[] }

async function getDivisionStandings(activeSeasons: string[]): Promise<DivisionStandings[]> {
  if (activeSeasons.length === 0) return []
  const results = await Promise.all(
    activeSeasons.map(async (seasonLabel) => {
      // Single lean query: fetch only played games for this season with team info
      const games = await prisma.game.findMany({
        where: { season: seasonLabel, played: true, week: { lt: 90 } },
        select: {
          homeScore: true, awayScore: true,
          homeTeam: { select: { id: true, name: true, slug: true, color: true, logo: true, league: true } },
          awayTeam: { select: { id: true, name: true, slug: true, color: true, logo: true } },
        },
        take: 200,
      })
      if (games.length === 0) return null
      const league = games[0].homeTeam.league
      const teamMap = new Map<string, { id: string; name: string; slug: string; color: string; logo: string | null; wins: number; losses: number }>()
      for (const g of games) {
        if (g.homeScore === null || g.awayScore === null) continue
        const homeWon = g.homeScore > g.awayScore
        for (const [team, won] of [[g.homeTeam, homeWon], [g.awayTeam, !homeWon]] as const) {
          const entry = teamMap.get(team.id) ?? { id: team.id, name: team.name, slug: team.slug, color: team.color, logo: team.logo ?? null, wins: 0, losses: 0 }
          won ? entry.wins++ : entry.losses++
          teamMap.set(team.id, entry)
        }
      }
      const standings = [...teamMap.values()]
        .sort((a, b) => b.wins !== a.wins ? b.wins - a.wins : (b.wins / (b.wins + b.losses)) - (a.wins / (a.wins + a.losses)))
      return { season: seasonLabel, league, teams: standings }
    })
  )
  return results.filter(Boolean) as DivisionStandings[]
}

async function getHomeData() {
  const [recentGames, upcomingGames, announcements, seasonRows] = await Promise.all([
    prisma.game.findMany({
      where: { played: true, forfeit: false },
      include: { homeTeam: true, awayTeam: true },
      orderBy: { date: 'desc' },
      take: 8,
    }),
    prisma.game.findMany({
      where: { played: false },
      include: { homeTeam: true, awayTeam: true },
      orderBy: { date: 'asc' },
      take: 5,
    }),
    prisma.announcement.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.game.findMany({
      where: { played: true },
      select: { season: true, date: true },
      orderBy: { date: 'desc' },
      take: 500,
    }),
  ])

  const seen = new Set<string>()
  const availableSeasons = seasonRows.filter(r => seen.has(r.season) ? false : seen.add(r.season)).map(r => r.season)
  return { recentGames, upcomingGames, announcements, availableSeasons }
}

export default async function HomePage() {
  const s = await getSiteSettings()
  const activeSeasons: string[] = s.active_seasons ? JSON.parse(s.active_seasons) : []
  const [{ recentGames, upcomingGames, announcements, availableSeasons }, liveGames] = await Promise.all([
    getHomeData(),
    getLiveGames().catch(() => []),
  ])
  const liveIds = new Set(liveGames.map(g => g.id))

  return (
    <div style={{ backgroundColor: '#0f0f0f', minHeight: '100vh' }}>

      {/* ── Scoreboard Ticker ── */}
      <div style={{ backgroundColor: '#0a0a0a', borderBottom: '1px solid #1a1a1a', overflowX: 'auto', scrollbarWidth: 'none' }}>
        <div style={{ display: 'flex', gap: '0', minWidth: 'max-content', padding: '0 16px' }}>
          {/* Games in progress come first */}
          {liveGames.map(game => {
            const homeUp = game.homeScore > game.awayScore
            const awayUp = game.awayScore > game.homeScore
            return (
              <Link key={game.id} href={`/games/${game.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  borderRight: '1px solid #1a1a1a', borderTop: '2px solid #c0392b', backgroundColor: '#1a0d0d',
                  padding: '12px 20px 14px', display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '190px', cursor: 'pointer',
                }}>
                  {[{ team: game.homeTeam, score: game.homeScore, up: homeUp }, { team: game.awayTeam, score: game.awayScore, up: awayUp }].map(({ team, score, up }) => (
                    <div key={team.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {team.logo
                          ? <img src={team.logo} alt="" style={{ width: '18px', height: '18px', objectFit: 'contain', borderRadius: '50%', backgroundColor: '#fff' }} />
                          : <div style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: team.color, flexShrink: 0 }} />
                        }
                        <span style={{ color: up ? '#fff' : '#aaa', fontSize: '13px', fontWeight: up ? 700 : 500 }}>{abbrev(team.name)}</span>
                      </div>
                      <span style={{ color: up ? '#fff' : '#aaa', fontWeight: 800, fontSize: '15px' }}>{score}</span>
                    </div>
                  ))}
                  <div style={{ color: '#ff6b6b', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>
                    ● Live · P{game.period} {game.clock}
                  </div>
                </div>
              </Link>
            )
          })}
          {[...recentGames.slice(0, 5).reverse(), ...upcomingGames.filter(g => !liveIds.has(g.id)).slice(0, 5)].map((game, i) => {
            const played = game.played
            const homeWon = played && game.homeScore !== null && game.awayScore !== null && game.homeScore! > game.awayScore!
            const awayWon = played && game.homeScore !== null && game.awayScore !== null && game.awayScore! > game.homeScore!
            return (
              <Link key={game.id} href={`/games/${game.id}`} style={{ textDecoration: 'none' }}>
              <div style={{
                borderRight: '1px solid #1a1a1a',
                padding: '14px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                minWidth: '190px',
                cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {(game.homeTeam as any).logo
                      ? <img src={(game.homeTeam as any).logo} alt="" style={{ width: '18px', height: '18px', objectFit: 'contain', borderRadius: '50%', backgroundColor: '#fff' }} />
                      : <div style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: game.homeTeam.color, flexShrink: 0 }} />
                    }
                    <span style={{ color: homeWon ? '#fff' : '#666', fontSize: '13px', fontWeight: homeWon ? 700 : 400 }}>{abbrev(game.homeTeam.name)}</span>
                  </div>
                  <span style={{ color: played ? (homeWon ? '#fff' : '#555') : '#4A9FE3', fontWeight: 700, fontSize: '15px' }}>
                    {played ? game.homeScore : '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {(game.awayTeam as any).logo
                      ? <img src={(game.awayTeam as any).logo} alt="" style={{ width: '18px', height: '18px', objectFit: 'contain', borderRadius: '50%', backgroundColor: '#fff' }} />
                      : <div style={{ width: '9px', height: '9px', borderRadius: '50%', backgroundColor: game.awayTeam.color, flexShrink: 0 }} />
                    }
                    <span style={{ color: awayWon ? '#fff' : '#666', fontSize: '13px', fontWeight: awayWon ? 700 : 400 }}>{abbrev(game.awayTeam.name)}</span>
                  </div>
                  <span style={{ color: played ? (awayWon ? '#fff' : '#555') : '#4A9FE3', fontWeight: 700, fontSize: '15px' }}>
                    {played ? game.awayScore : '—'}
                  </span>
                </div>
                <div style={{ color: played ? '#27AE60' : '#555', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>
                  {played ? 'FINAL' : new Date(game.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
              </Link>
            )
          })}
          <Link href="/schedule" style={{ display: 'flex', alignItems: 'center', padding: '0 20px', color: '#4A9FE3', fontSize: '11px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', letterSpacing: '0.05em' }}>
            Full Schedule →
          </Link>
        </div>
      </div>

      {liveGames.length > 0 && <LiveRefresh intervalMs={15000} />}

      {/* ── Hero ── */}
      <section style={{
        background: 'linear-gradient(160deg, #0a0a14 0%, #0f0f0f 40%, #0a0f1a 100%)',
        padding: 'clamp(18px,2.5vw,32px) 0 clamp(22px,3vw,44px)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background accent */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(ellipse 60% 50% at 80% 50%, rgba(74,159,227,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,320px),1fr))', gap: '40px 60px', alignItems: 'center' }}>

            {/* Left: branding + CTAs */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <img src="/logo.png" alt="IMBA" style={{ width: '64px', height: '64px', objectFit: 'contain' }} />
                <div style={{ color: '#fff', fontSize: '22px', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1 }}>IMBA</div>
              </div>

              <h1 style={{ color: '#fff', fontSize: 'clamp(26px, 5vw, 52px)', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-0.03em', marginBottom: '16px' }}>
                {s.hero_title_line1}<br />
                <span style={{ color: '#4A9FE3' }}>{s.hero_title_line2}</span>
              </h1>
              <p style={{ color: '#666', fontSize: 'clamp(14px,2vw,17px)', lineHeight: 1.6, marginBottom: '32px', maxWidth: '440px' }}>
                {s.hero_subtitle}
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '32px' }}>
                <Link href="/schedule" style={{ backgroundColor: '#4A9FE3', color: '#fff', fontWeight: 800, fontSize: '15px', padding: '13px 28px', borderRadius: '6px', textDecoration: 'none', letterSpacing: '-0.01em' }}>
                  {s.hero_cta_primary}
                </Link>
              </div>

            </div>

            {/* Right: stat leaders */}
            <StatsLeaderboard
              seasons={availableSeasons}
              defaultSeason={activeSeasons[0] ?? availableSeasons[0] ?? ''}
            />
          </div>
        </div>
      </section>

      {/* ── Recent Scores ── */}
      {recentGames.length > 0 && (
        <section style={{ backgroundColor: '#0f0f0f', padding: '48px 0', borderTop: '1px solid #1a1a1a' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
              <div>
                <div style={{ color: '#4A9FE3', fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>Results</div>
                <h2 style={{ color: '#fff', fontSize: 'clamp(20px,4vw,28px)', fontWeight: 900, letterSpacing: '-0.02em' }}>Recent Scores</h2>
              </div>
              <Link href="/schedule" style={{ color: '#555', fontSize: '13px', textDecoration: 'none', fontWeight: 600 }}>All results →</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))', gap: '10px' }}>
              {recentGames.slice(0, 6).map(game => {
                const homeWon = game.homeScore !== null && game.awayScore !== null && game.homeScore! > game.awayScore!
                const awayWon = game.homeScore !== null && game.awayScore !== null && game.awayScore! > game.homeScore!
                return (
                  <Link key={game.id} href={`/games/${game.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      backgroundColor: '#141414', border: '1px solid #1e1e1e', borderRadius: '10px',
                      padding: '14px 16px',
                    }}>
                      {/* Away */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {(game.awayTeam as any).logo
                            ? <img src={(game.awayTeam as any).logo} alt="" style={{ width: '20px', height: '20px', objectFit: 'contain', borderRadius: '50%', backgroundColor: '#fff' }} />
                            : <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: game.awayTeam.color, flexShrink: 0 }} />
                          }
                          <span style={{ color: awayWon ? '#fff' : '#555', fontSize: '13px', fontWeight: awayWon ? 700 : 500 }}>{game.awayTeam.name}</span>
                        </div>
                        <span style={{ color: awayWon ? '#fff' : '#555', fontWeight: 900, fontSize: '16px' }}>{game.awayScore}</span>
                      </div>
                      {/* Home */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {(game.homeTeam as any).logo
                            ? <img src={(game.homeTeam as any).logo} alt="" style={{ width: '20px', height: '20px', objectFit: 'contain', borderRadius: '50%', backgroundColor: '#fff' }} />
                            : <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: game.homeTeam.color, flexShrink: 0 }} />
                          }
                          <span style={{ color: homeWon ? '#fff' : '#555', fontSize: '13px', fontWeight: homeWon ? 700 : 500 }}>{game.homeTeam.name}</span>
                        </div>
                        <span style={{ color: homeWon ? '#fff' : '#555', fontWeight: 900, fontSize: '16px' }}>{game.homeScore}</span>
                      </div>
                      <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#27AE60', fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em' }}>FINAL</span>
                        <span style={{ color: '#333', fontSize: '10px' }}>{new Date(game.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Standings + Stats ── */}
      <section style={{ backgroundColor: '#0a0a0a', padding: '56px 0', borderTop: '1px solid #1a1a1a' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '32px' }}>

            {/* Standings — interactive season dropdown */}
            <StandingsWidget
              seasons={availableSeasons}
              defaultSeason={activeSeasons[0] ?? availableSeasons[0] ?? ''}
            />

            <div />
          </div>
        </div>
      </section>

      {/* ── Upcoming Games ── */}
      {upcomingGames.length > 0 && (
        <section style={{ backgroundColor: '#0f0f0f', padding: '56px 0', borderTop: '1px solid #1a1a1a' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
              <div>
                <div style={{ color: '#4A9FE3', fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '4px' }}>On the Calendar</div>
                <h2 style={{ color: '#fff', fontSize: 'clamp(20px,4vw,28px)', fontWeight: 900, letterSpacing: '-0.02em' }}>Upcoming Games</h2>
              </div>
              <Link href="/schedule" style={{ color: '#555', fontSize: '13px', textDecoration: 'none', fontWeight: 600 }}>Full Schedule →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {upcomingGames.map(game => (
                <div key={game.id} style={{
                  backgroundColor: '#141414', border: '1px solid #1e1e1e', borderRadius: '10px',
                  padding: '16px 20px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px',
                }}>
                  {/* Date pill */}
                  <div style={{ textAlign: 'center', minWidth: '52px', backgroundColor: '#1a1a1a', borderRadius: '8px', padding: '8px 10px' }}>
                    <div style={{ color: '#4A9FE3', fontSize: '16px', fontWeight: 900, lineHeight: 1 }}>
                      {new Date(game.date).toLocaleDateString('en-US', { day: 'numeric' })}
                    </div>
                    <div style={{ color: '#444', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {new Date(game.date).toLocaleDateString('en-US', { month: 'short' })}
                    </div>
                  </div>
                  {/* Teams */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      {(game.awayTeam as any).logo
                        ? <img src={(game.awayTeam as any).logo} alt="" style={{ width: '20px', height: '20px', objectFit: 'contain', borderRadius: '50%', backgroundColor: '#fff' }} />
                        : <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: game.awayTeam.color }} />
                      }
                      <span style={{ color: '#ccc', fontWeight: 700, fontSize: '14px' }}>{game.awayTeam.name}</span>
                    </div>
                    <span style={{ color: '#333', fontWeight: 700, fontSize: '12px' }}>@</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      {(game.homeTeam as any).logo
                        ? <img src={(game.homeTeam as any).logo} alt="" style={{ width: '20px', height: '20px', objectFit: 'contain', borderRadius: '50%', backgroundColor: '#fff' }} />
                        : <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: game.homeTeam.color }} />
                      }
                      <span style={{ color: '#ccc', fontWeight: 700, fontSize: '14px' }}>{game.homeTeam.name}</span>
                    </div>
                  </div>
                  {/* Time + Location */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ color: '#4A9FE3', fontWeight: 700, fontSize: '13px' }}>{game.time}</div>
                    <div style={{ color: '#444', fontSize: '11px', marginTop: '2px' }}>{game.location}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

    </div>
  )
}
