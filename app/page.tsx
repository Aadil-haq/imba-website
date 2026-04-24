export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { prisma } from '@/lib/db'
import { DEFAULT_SETTINGS } from '@/app/api/admin/homepage/route'
import TopScorersWidget from '@/components/TopScorersWidget'

async function getSiteSettings(): Promise<Record<string, string>> {
  const rows = await prisma.siteSetting.findMany()
  const saved = Object.fromEntries(rows.map(r => [r.key, r.value]))
  return { ...DEFAULT_SETTINGS, ...saved }
}

interface TeamStanding {
  id: string
  name: string
  slug: string
  color: string
  wins: number
  losses: number
}

interface DivisionStandings {
  season: string
  league: string
  teams: TeamStanding[]
}

async function getDivisionStandings(activeSeasons: string[]): Promise<DivisionStandings[]> {
  if (activeSeasons.length === 0) return []

  const results = await Promise.all(
    activeSeasons.map(async (seasonLabel) => {
      const sampleGame = await prisma.game.findFirst({
        where: { season: seasonLabel, played: true },
        select: { league: true },
      })
      if (!sampleGame) return null

      const league = sampleGame.league

      const teams = await prisma.team.findMany({
        include: {
          homeGames: { where: { played: true, season: seasonLabel } },
          awayGames: { where: { played: true, season: seasonLabel } },
        },
      })

      const standings = teams
        .map(team => {
          let wins = 0, losses = 0
          team.homeGames.forEach(g => {
            if (g.homeScore !== null && g.awayScore !== null) {
              if (g.homeScore > g.awayScore) wins++; else losses++
            }
          })
          team.awayGames.forEach(g => {
            if (g.homeScore !== null && g.awayScore !== null) {
              if (g.awayScore > g.homeScore) wins++; else losses++
            }
          })
          return { id: team.id, name: team.name, slug: team.slug, color: team.color, wins, losses }
        })
        .filter(t => t.wins + t.losses > 0)
        .sort((a, b) => {
          if (b.wins !== a.wins) return b.wins - a.wins
          const bPct = b.wins / (b.wins + b.losses)
          const aPct = a.wins / (a.wins + a.losses)
          return bPct - aPct
        })
        .slice(0, 5)

      return { season: seasonLabel, league, teams: standings }
    })
  )

  return results.filter(Boolean) as DivisionStandings[]
}

interface TopScorer {
  name: string
  team: string
  ppg: string
  ppgNum: number
}

async function getHomeData(activeSeasons: string[]) {
  // Fetch game IDs for active seasons (groupBy doesn't support relation filters)
  const gameIdRows = activeSeasons.length > 0
    ? await prisma.game.findMany({
        where: { played: true, season: { in: activeSeasons } },
        select: { id: true },
      })
    : []
  const activeGameIds = gameIdRows.map(g => g.id)

  const statWhere = activeGameIds.length > 0
    ? { gameId: { in: activeGameIds } }
    : activeSeasons.length === 0
      ? {}           // no filter set — show all
      : { gameId: 'impossible' }  // active seasons set but no games yet

  const [upcomingGames, announcements, statStats] = await Promise.all([
    prisma.game.findMany({
      where: { played: false },
      include: { homeTeam: true, awayTeam: true },
      orderBy: { date: 'asc' },
      take: 3,
    }),
    prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 3,
    }),
    prisma.playerGameStat.groupBy({
      by: ['playerId'],
      where: statWhere,
      _sum: { points: true },
      _count: { gameId: true },
    }),
  ])

  const playerIds = statStats.map(s => s.playerId)
  // Exclude sub players from leaderboards
  const players = playerIds.length > 0 ? await prisma.player.findMany({
    where: { id: { in: playerIds }, isSub: false },
    include: { team: true },
  }) : []
  const playerMap = new Map(players.map(p => [p.id, p]))

  const scorers: TopScorer[] = statStats
    .map(s => {
      const p = playerMap.get(s.playerId)
      const g = s._count.gameId
      if (!p) return null                // sub or unknown — skip
      if (g < 4) return null             // fewer than 4 games — skip
      return {
        name: p.name,
        team: p.team.name,
        ppg: ((s._sum.points ?? 0) / g).toFixed(1),
        ppgNum: (s._sum.points ?? 0) / g,
      }
    })
    .filter((s): s is TopScorer => s !== null)
    .sort((a, b) => b.ppgNum - a.ppgNum)
    .slice(0, 3)

  return { upcomingGames, announcements, scorers }
}

export default async function HomePage() {
  const s = await getSiteSettings()
  const activeSeasons: string[] = s.active_seasons ? JSON.parse(s.active_seasons) : []

  const [{ upcomingGames, announcements, scorers }, divisionStandings] = await Promise.all([
    getHomeData(activeSeasons),
    getDivisionStandings(activeSeasons),
  ])

  return (
    <div>
      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #111111 50%, #1a1a2e 100%)',
        padding: '48px 0 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(74,159,227,0.06) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(74,159,227,0.06) 0%, transparent 50%)',
        }} />
        <div className="relative z-10 px-4" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
            <img
              src="/logo.png"
              alt="IMBA Logo"
              style={{ width: '130px', height: '130px', objectFit: 'contain' }}
            />
          </div>
          <h1 style={{ color: '#ffffff', fontSize: 'clamp(22px, 4vw, 40px)', fontWeight: 900, lineHeight: 1.1, marginBottom: '10px' }}>
            {s.hero_title_line1}<br />
            <span style={{ color: '#4A9FE3' }}>{s.hero_title_line2}</span>
          </h1>
          <p style={{ color: '#aaaaaa', fontSize: 'clamp(14px, 2vw, 17px)', marginBottom: '24px' }}>
            {s.hero_subtitle}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/schedule" style={{ backgroundColor: '#4A9FE3', color: '#fff', fontWeight: 700, fontSize: '15px', padding: '11px 26px', borderRadius: '8px', textDecoration: 'none' }}>
              {s.hero_cta_primary}
            </Link>
            <Link href="/register" style={{ backgroundColor: 'transparent', color: '#4A9FE3', fontWeight: 700, fontSize: '15px', padding: '11px 26px', borderRadius: '8px', textDecoration: 'none', border: '2px solid #4A9FE3' }}>
              {s.hero_cta_secondary}
            </Link>
          </div>

          {/* Instagram */}
          <div style={{ marginTop: '16px' }}>
            <a
              href="https://www.instagram.com/imba_0fficial/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', color: '#888', fontSize: '13px', textDecoration: 'none' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="ig-hero" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f09433" />
                    <stop offset="50%" stopColor="#dc2743" />
                    <stop offset="100%" stopColor="#bc1888" />
                  </linearGradient>
                </defs>
                <rect x="2" y="2" width="20" height="20" rx="5" stroke="url(#ig-hero)" strokeWidth="2" fill="none" />
                <circle cx="12" cy="12" r="4" stroke="url(#ig-hero)" strokeWidth="2" fill="none" />
                <circle cx="17.5" cy="6.5" r="1.2" fill="url(#ig-hero)" />
              </svg>
              @imba_0fficial
            </a>
          </div>

          <div style={{ display: 'flex', gap: 'clamp(18px, 4vw, 36px)', justifyContent: 'center', marginTop: '28px', flexWrap: 'wrap' }}>
            {[
              { label: 'Teams',     value: s.stat_teams },
              { label: 'Divisions', value: s.stat_divisions ?? '2' },
              { label: 'Season',    value: s.stat_season },
              { label: 'Location',  value: s.stat_location },
              { label: 'Fee',       value: s.stat_fee },
            ].map(item => (
              <div key={item.label} style={{ textAlign: 'center' }}>
                <div style={{ color: '#4A9FE3', fontSize: 'clamp(16px, 4vw, 22px)', fontWeight: 900 }}>{item.value}</div>
                <div style={{ color: '#555', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Upcoming Games */}
      <section style={{ backgroundColor: '#111111', padding: '48px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ color: '#4A9FE3', fontSize: '12px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}>{s.season_label}</div>
              <h2 style={{ color: '#ffffff', fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 900 }}>{s.section_games_title}</h2>
            </div>
            <Link href="/schedule" style={{ color: '#4A9FE3', fontWeight: 600, textDecoration: 'none', fontSize: '14px' }}>View Full Schedule →</Link>
          </div>
          {upcomingGames.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#555', padding: '48px', backgroundColor: '#1a1a1a', borderRadius: '12px', border: '1px solid #2a2a2a' }}>
              No upcoming games scheduled. Check back soon!
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {upcomingGames.map(game => (
                <div key={game.id} style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ textAlign: 'center', minWidth: '70px' }}>
                      <div style={{ width: '10px', height: '10px', backgroundColor: game.homeTeam.color, borderRadius: '50%', margin: '0 auto 4px' }} />
                      <div style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>{game.homeTeam.name}</div>
                      <div style={{ color: '#555', fontSize: '11px' }}>HOME</div>
                    </div>
                    <div style={{ color: '#4A9FE3', fontWeight: 900, fontSize: '18px' }}>VS</div>
                    <div style={{ textAlign: 'center', minWidth: '80px' }}>
                      <div style={{ width: '10px', height: '10px', backgroundColor: game.awayTeam.color, borderRadius: '50%', margin: '0 auto 4px' }} />
                      <div style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>{game.awayTeam.name}</div>
                      <div style={{ color: '#555', fontSize: '11px' }}>AWAY</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>
                      {new Date(game.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                    <div style={{ color: '#4A9FE3', fontSize: '13px' }}>{game.time}</div>
                    <div style={{ color: '#555', fontSize: '12px' }}>{game.location}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Division Standings — one card per active season */}
      <section style={{ backgroundColor: '#0d0d0d', padding: '48px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ color: '#4A9FE3', fontSize: '12px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}>Current Season</div>
              <h2 style={{ color: '#ffffff', fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 900 }}>League Standings</h2>
            </div>
            <Link href="/standings" style={{ color: '#4A9FE3', fontWeight: 600, textDecoration: 'none', fontSize: '14px' }}>Full Standings →</Link>
          </div>

          {divisionStandings.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#555', padding: '48px', backgroundColor: '#1a1a1a', borderRadius: '12px', border: '1px solid #2a2a2a' }}>
              No active seasons configured. Go to Admin → Active Seasons to set which seasons appear here.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(340px, 100%), 1fr))', gap: '24px' }}>
              {divisionStandings.map(div => (
                <div key={div.season} style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', overflow: 'hidden' }}>
                  {/* Division header */}
                  <div style={{ padding: '14px 18px', borderBottom: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ color: '#fff', fontWeight: 800, fontSize: '15px' }}>{div.season}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <span style={{
                          backgroundColor: div.league === 'Comp' ? '#1a2a4a' : div.league === 'Rec' ? '#1a3a1a' : '#2a1a3a',
                          color: div.league === 'Comp' ? '#4A9FE3' : div.league === 'Rec' ? '#27AE60' : '#a855f7',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                        }}>
                          {div.league === 'Comp' ? 'Comp (D1)' : div.league === 'Rec' ? 'Rec (D2/D3)' : div.league}
                        </span>
                      </div>
                    </div>
                    <Link href={`/standings`} style={{ color: '#4A9FE3', fontSize: '12px', textDecoration: 'none', fontWeight: 600 }}>
                      Full →
                    </Link>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#141414' }}>
                        {['#', 'Team', 'W', 'L', 'PCT'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Team' || h === '#' ? 'left' : 'center', color: '#555', fontWeight: 700, fontSize: '11px', letterSpacing: '0.05em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {div.teams.map((team, i) => (
                        <tr key={team.id} style={{ backgroundColor: i % 2 === 0 ? '#1a1a1a' : '#161616', borderBottom: '1px solid #222' }}>
                          <td style={{ padding: '12px 14px', color: i < 2 ? '#4A9FE3' : '#555', fontWeight: 700, fontSize: '13px' }}>#{i + 1}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <Link href={`/teams/${team.slug}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '8px', height: '8px', backgroundColor: team.color, borderRadius: '50%', flexShrink: 0 }} />
                              <span style={{ color: '#fff', fontWeight: 600, fontSize: '13px' }}>{team.name}</span>
                              {i < 4 && <span style={{ backgroundColor: '#1a3a5c', color: '#4A9FE3', fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '3px' }}>PO</span>}
                            </Link>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', color: '#27AE60', fontWeight: 700, fontSize: '14px' }}>{team.wins}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', color: '#e74c3c', fontWeight: 700, fontSize: '14px' }}>{team.losses}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>
                            {(team.wins + team.losses) > 0 ? (team.wins / (team.wins + team.losses)).toFixed(3) : '.000'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Stats Leaders & Announcements */}
      <section style={{ backgroundColor: '#111111', padding: '48px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))', gap: '40px' }}>
            {/* Top Performers — client widget with season + category selector */}
            <TopScorersWidget />

            {/* Announcements */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <div style={{ color: '#4A9FE3', fontSize: '12px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '6px' }}>Latest</div>
                  <h3 style={{ color: '#fff', fontSize: '22px', fontWeight: 800 }}>Announcements</h3>
                </div>
              </div>
              {announcements.length === 0 ? (
                <div style={{ color: '#555', textAlign: 'center', padding: '32px', backgroundColor: '#1a1a1a', borderRadius: '10px', border: '1px solid #2a2a2a' }}>
                  No announcements yet
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {announcements.map(ann => (
                    <div key={ann.id} style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderLeft: '3px solid #4A9FE3', borderRadius: '8px', padding: '16px' }}>
                      <div style={{ color: '#fff', fontWeight: 700, fontSize: '14px', marginBottom: '6px' }}>{ann.title}</div>
                      <div style={{ color: '#888', fontSize: '13px', lineHeight: '1.5' }}>{ann.body}</div>
                      <div style={{ color: '#444', fontSize: '11px', marginTop: '8px' }}>
                        {new Date(ann.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section — fully editable via Admin → Homepage */}
      <section style={{ backgroundColor: '#4A9FE3', padding: '48px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#ffffff', fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 900, marginBottom: '16px' }}>
            Ready to Play?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 'clamp(14px, 3vw, 18px)', marginBottom: '24px' }}>
            {s.cta_subtitle}
          </p>
          <Link href="/register" style={{ backgroundColor: '#ffffff', color: '#4A9FE3', fontWeight: 800, fontSize: 'clamp(15px, 3vw, 18px)', padding: '14px 36px', borderRadius: '8px', textDecoration: 'none', display: 'inline-block' }}>
            {s.cta_button_text}
          </Link>
        </div>
      </section>
    </div>
  )
}
