export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { prisma } from '@/lib/db'
import { DEFAULT_SETTINGS } from '@/app/api/admin/homepage/route'
import StatsLeaderboard from '@/components/StatsLeaderboard'
import StandingsWidget from '@/components/StandingsWidget'

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
      const sampleGame = await prisma.game.findFirst({
        where: { season: seasonLabel, played: true },
        select: { league: true },
      })
      if (!sampleGame) return null
      const teams = await prisma.team.findMany({
        include: {
          homeGames: { where: { played: true, season: seasonLabel } },
          awayGames: { where: { played: true, season: seasonLabel } },
        },
      })
      const standings = teams
        .map(team => {
          let wins = 0, losses = 0
          team.homeGames.forEach(g => { if (g.homeScore !== null && g.awayScore !== null) { if (g.homeScore > g.awayScore) wins++; else losses++ } })
          team.awayGames.forEach(g => { if (g.homeScore !== null && g.awayScore !== null) { if (g.awayScore > g.homeScore) wins++; else losses++ } })
          return { id: team.id, name: team.name, slug: team.slug, color: team.color, logo: team.logo ?? null, wins, losses }
        })
        .filter(t => t.wins + t.losses > 0)
        .sort((a, b) => b.wins !== a.wins ? b.wins - a.wins : (b.wins / (b.wins + b.losses)) - (a.wins / (a.wins + a.losses)))
        .slice(0, 6)
      return { season: seasonLabel, league: sampleGame.league, teams: standings }
    })
  )
  return results.filter(Boolean) as DivisionStandings[]
}

async function getHomeData() {
  const [recentGames, upcomingGames, announcements, seasonRows] = await Promise.all([
    prisma.game.findMany({
      where: { played: true },
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
    prisma.announcement.findMany({ orderBy: { createdAt: 'desc' }, take: 3 }),
    prisma.game.findMany({
      where: { played: true },
      select: { season: true },
      distinct: ['season'],
      orderBy: { date: 'desc' },
    }),
  ])

  const availableSeasons = seasonRows.map(r => r.season)
  return { recentGames, upcomingGames, announcements, availableSeasons }
}

export default async function HomePage() {
  const s = await getSiteSettings()
  const activeSeasons: string[] = s.active_seasons ? JSON.parse(s.active_seasons) : []
  const [{ recentGames, upcomingGames, announcements, availableSeasons }, divisionStandings] = await Promise.all([
    getHomeData(),
    getDivisionStandings(activeSeasons),
  ])

  return (
    <div style={{ backgroundColor: '#0f0f0f', minHeight: '100vh' }}>

      {/* ── Scoreboard Ticker ── */}
      <div style={{ backgroundColor: '#0a0a0a', borderBottom: '1px solid #1a1a1a', overflowX: 'auto', scrollbarWidth: 'none' }}>
        <div style={{ display: 'flex', gap: '0', minWidth: 'max-content', padding: '0 16px' }}>
          {[...recentGames.slice(0, 5).reverse(), ...upcomingGames.slice(0, 5)].map((game, i) => {
            const played = game.played
            const homeWon = played && game.homeScore !== null && game.awayScore !== null && game.homeScore! > game.awayScore!
            const awayWon = played && game.homeScore !== null && game.awayScore !== null && game.awayScore! > game.homeScore!
            return (
              <Link key={game.id} href={`/games/${game.id}`} style={{ textDecoration: 'none' }}>
              <div style={{
                borderRight: '1px solid #1a1a1a',
                padding: '10px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                minWidth: '160px',
                cursor: 'pointer',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {(game.homeTeam as any).logo
                      ? <img src={(game.homeTeam as any).logo} alt="" style={{ width: '14px', height: '14px', objectFit: 'contain', borderRadius: '50%', backgroundColor: '#fff' }} />
                      : <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: game.homeTeam.color, flexShrink: 0 }} />
                    }
                    <span style={{ color: homeWon ? '#fff' : '#666', fontSize: '11px', fontWeight: homeWon ? 700 : 400 }}>{abbrev(game.homeTeam.name)}</span>
                  </div>
                  <span style={{ color: played ? (homeWon ? '#fff' : '#555') : '#4A9FE3', fontWeight: 700, fontSize: '12px' }}>
                    {played ? game.homeScore : '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {(game.awayTeam as any).logo
                      ? <img src={(game.awayTeam as any).logo} alt="" style={{ width: '14px', height: '14px', objectFit: 'contain', borderRadius: '50%', backgroundColor: '#fff' }} />
                      : <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: game.awayTeam.color, flexShrink: 0 }} />
                    }
                    <span style={{ color: awayWon ? '#fff' : '#666', fontSize: '11px', fontWeight: awayWon ? 700 : 400 }}>{abbrev(game.awayTeam.name)}</span>
                  </div>
                  <span style={{ color: played ? (awayWon ? '#fff' : '#555') : '#4A9FE3', fontWeight: 700, fontSize: '12px' }}>
                    {played ? game.awayScore : '—'}
                  </span>
                </div>
                <div style={{ color: played ? '#27AE60' : '#555', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>
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

      {/* ── Hero ── */}
      <section style={{
        background: 'linear-gradient(160deg, #0a0a14 0%, #0f0f0f 40%, #0a0f1a 100%)',
        padding: 'clamp(28px,4vw,48px) 0 clamp(32px,5vw,64px)',
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

              <h1 style={{ color: '#fff', fontSize: 'clamp(32px, 6vw, 64px)', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-0.03em', marginBottom: '16px' }}>
                {s.hero_title_line1}<br />
                <span style={{ color: '#4A9FE3' }}>{s.hero_title_line2}</span>
              </h1>
              <p style={{ color: '#666', fontSize: 'clamp(14px,2vw,17px)', lineHeight: 1.6, marginBottom: '32px', maxWidth: '440px' }}>
                {s.hero_subtitle}
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '32px' }}>
                <Link href="/register" style={{ backgroundColor: '#4A9FE3', color: '#fff', fontWeight: 800, fontSize: '15px', padding: '13px 28px', borderRadius: '6px', textDecoration: 'none', letterSpacing: '-0.01em' }}>
                  {s.hero_cta_secondary}
                </Link>
                <Link href="/schedule" style={{ backgroundColor: 'transparent', color: '#fff', fontWeight: 700, fontSize: '15px', padding: '13px 28px', borderRadius: '6px', textDecoration: 'none', border: '1px solid #2a2a2a' }}>
                  {s.hero_cta_primary}
                </Link>
              </div>

              <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
                {[
                  { label: 'Teams', value: s.stat_teams },
                  { label: 'Divisions', value: s.stat_divisions ?? '2' },
                  { label: 'Fee', value: s.stat_fee },
                  { label: 'Location', value: s.stat_location },
                ].map(item => (
                  <div key={item.label} style={{ textAlign: 'center' }}>
                    <div style={{ color: '#fff', fontSize: 'clamp(18px,3vw,26px)', fontWeight: 900, letterSpacing: '-0.02em' }}>{item.value}</div>
                    <div style={{ color: '#444', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: leading standings card */}
            {divisionStandings.length > 0 && (
              <div style={{ backgroundColor: '#141414', border: '1px solid #1e1e1e', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #1e1e1e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: '#4A9FE3', fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Current Season</div>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: '15px', marginTop: '2px' }}>{divisionStandings[0].season}</div>
                  </div>
                  <Link href="/standings" style={{ color: '#4A9FE3', fontSize: '12px', fontWeight: 700, textDecoration: 'none' }}>Full →</Link>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#0f0f0f' }}>
                      {['#', 'Team', 'W', 'L', 'PCT'].map(h => (
                        <th key={h} style={{ padding: '8px 14px', textAlign: h === 'Team' || h === '#' ? 'left' : 'center', color: '#333', fontWeight: 700, fontSize: '10px', letterSpacing: '0.08em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {divisionStandings[0].teams.map((team, i) => (
                      <tr key={team.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                        <td style={{ padding: '11px 14px', color: i < 2 ? '#4A9FE3' : '#444', fontWeight: 700, fontSize: '12px' }}>{i + 1}</td>
                        <td style={{ padding: '11px 14px' }}>
                          <Link href={`/teams/${team.slug}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '7px' }}>
                            {team.logo
                              ? <img src={team.logo} alt="" style={{ width: '18px', height: '18px', objectFit: 'contain', borderRadius: '50%', backgroundColor: '#fff' }} />
                              : <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: team.color }} />
                            }
                            <span style={{ color: '#ddd', fontSize: '13px', fontWeight: 600 }}>{team.name}</span>
                          </Link>
                        </td>
                        <td style={{ padding: '11px 14px', textAlign: 'center', color: '#27AE60', fontWeight: 700, fontSize: '13px' }}>{team.wins}</td>
                        <td style={{ padding: '11px 14px', textAlign: 'center', color: '#e74c3c', fontWeight: 700, fontSize: '13px' }}>{team.losses}</td>
                        <td style={{ padding: '11px 14px', textAlign: 'center', color: '#666', fontSize: '12px' }}>
                          {(team.wins + team.losses) > 0 ? (team.wins / (team.wins + team.losses)).toFixed(3) : '.000'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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

            {/* Stats leaders + Announcements */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {/* Interactive Stat Leaderboard */}
              <StatsLeaderboard
                seasons={availableSeasons}
                defaultSeason={activeSeasons[0] ?? availableSeasons[0] ?? ''}
              />

              {/* Announcements */}
              {announcements.length > 0 && (
                <div>
                  <div style={{ color: '#4A9FE3', fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '14px' }}>Announcements</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {announcements.map(ann => (
                      <div key={ann.id} style={{ backgroundColor: '#141414', border: '1px solid #1e1e1e', borderLeft: '3px solid #4A9FE3', borderRadius: '8px', padding: '14px 16px' }}>
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>{ann.title}</div>
                        <div style={{ color: '#555', fontSize: '12px', lineHeight: 1.5 }}>{ann.body}</div>
                        <div style={{ color: '#333', fontSize: '10px', marginTop: '8px' }}>
                          {new Date(ann.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
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

      {/* ── Register CTA ── */}
      <section style={{
        background: 'linear-gradient(135deg, #0a1628 0%, #0d1f3c 50%, #0a1628 100%)',
        padding: 'clamp(48px,8vw,80px) 0',
        borderTop: '1px solid #1a2a3a',
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ textAlign: 'center' }}>
          <div style={{ color: '#4A9FE3', fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '16px' }}>
            {s.season_label}
          </div>
          <h2 style={{ color: '#fff', fontSize: 'clamp(28px,5vw,52px)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '14px', lineHeight: 1.1 }}>
            Ready to Play?
          </h2>
          <p style={{ color: '#555', fontSize: 'clamp(14px,2vw,17px)', marginBottom: '32px' }}>
            {s.cta_subtitle}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/register" style={{ backgroundColor: '#4A9FE3', color: '#fff', fontWeight: 800, fontSize: 'clamp(14px,2vw,17px)', padding: '14px 36px', borderRadius: '6px', textDecoration: 'none' }}>
              {s.cta_button_text}
            </Link>
            <a href="https://www.instagram.com/imba_0fficial/" target="_blank" rel="noopener noreferrer"
              style={{ backgroundColor: 'transparent', color: '#fff', fontWeight: 700, fontSize: 'clamp(14px,2vw,17px)', padding: '14px 28px', borderRadius: '6px', textDecoration: 'none', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <defs><linearGradient id="ig" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#f09433" /><stop offset="50%" stopColor="#dc2743" /><stop offset="100%" stopColor="#bc1888" /></linearGradient></defs>
                <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#ig)" strokeWidth="2" fill="none" />
                <circle cx="12" cy="12" r="4" stroke="url(#ig)" strokeWidth="2" fill="none" />
                <circle cx="17.5" cy="6.5" r="1.2" fill="url(#ig)" />
              </svg>
              Follow @imba_0fficial
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
