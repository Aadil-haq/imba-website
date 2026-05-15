'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface Team { id: string; name: string; slug: string; color: string; logo?: string | null }
interface Game {
  id: string
  homeTeamId: string
  awayTeamId: string
  homeTeam: Team
  awayTeam: Team
  homeScore: number | null
  awayScore: number | null
  date: string
  time: string
  location: string
  week: number
  label: string | null
  season: string
  league: string
  played: boolean
  forfeit: boolean
  driveUrl: string | null
}

interface PlayerStatRow {
  id: string
  player: { name: string; number: number; position: string }
  points: number
  rebounds: number
  assists: number
  steals: number
  blocks: number
  fouls: number
  twoPtMade: number
  twoPtAtt: number
  threeMade: number
  threeAtt: number
  ftMade: number
  ftAtt: number
}

interface BoxScore {
  id: string
  homeTeam: Team
  awayTeam: Team
  homeScore: number
  awayScore: number
  date: string
  homeStats: PlayerStatRow[]
  awayStats: PlayerStatRow[]
}

interface SeasonOption { season: string; league: string }

const selectStyle = {
  backgroundColor: '#1a1a1a',
  color: '#ffffff',
  border: '1px solid #2a2a2a',
  borderRadius: '6px',
  padding: '8px 14px',
  fontSize: '13px',
  fontWeight: 600,
  outline: 'none',
  cursor: 'pointer',
}

function pct(made: number, att: number) {
  if (att === 0) return '—'
  return ((made / att) * 100).toFixed(0) + '%'
}

function StatTable({ stats, teamName, teamColor, teamLogo }: { stats: PlayerStatRow[]; teamName: string; teamColor: string; teamLogo?: string | null }) {
  if (stats.length === 0) return (
    <div style={{ color: '#555', fontSize: '13px', padding: '16px', textAlign: 'center' }}>No stats recorded</div>
  )
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        {teamLogo
          ? <img src={teamLogo} alt="" style={{ width: '20px', height: '20px', objectFit: 'contain', borderRadius: '50%' }} />
          : <div style={{ width: '10px', height: '10px', backgroundColor: teamColor, borderRadius: '50%' }} />
        }
        <span style={{ color: '#fff', fontWeight: 800, fontSize: '15px' }}>{teamName}</span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #2a2a2a' }}>
            {['PLAYER', 'PTS', 'REB', 'AST', 'STL', 'BLK', 'PF', 'FG%', '3P%', 'FT%'].map(h => (
              <th key={h} style={{ padding: '6px 10px', textAlign: h === 'PLAYER' ? 'left' : 'center', color: '#555', fontWeight: 700, fontSize: '11px', letterSpacing: '0.06em' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stats.map((s, i) => (
            <tr key={s.id} style={{ borderBottom: '1px solid #1e1e1e', backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
              <td style={{ padding: '8px 10px', color: '#ccc', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {s.player.number != null ? <span style={{ color: '#555', marginRight: '6px' }}>#{s.player.number}</span> : null}
                {s.player.name}
              </td>
              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#4A9FE3', fontWeight: 900, fontSize: '15px' }}>{s.points}</td>
              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#ccc' }}>{s.rebounds}</td>
              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#ccc' }}>{s.assists}</td>
              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#ccc' }}>{s.steals}</td>
              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#ccc' }}>{s.blocks}</td>
              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#888' }}>{s.fouls}</td>
              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#888' }}>{pct(s.twoPtMade + s.threeMade, s.twoPtAtt + s.threeAtt)}</td>
              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#888' }}>{pct(s.threeMade, s.threeAtt)}</td>
              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#888' }}>{pct(s.ftMade, s.ftAtt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BoxScoreModal({ gameId, onClose }: { gameId: string; onClose: () => void }) {
  const [box, setBox] = useState<BoxScore | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/games/${gameId}`)
      .then(r => r.json())
      .then(data => { setBox(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [gameId])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const homeWon = box && box.homeScore > box.awayScore
  const awayWon = box && box.awayScore > box.homeScore

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)',
        zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '24px 16px', overflowY: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: '#141414', border: '1px solid #2a2a2a', borderRadius: '16px',
          width: '100%', maxWidth: '740px', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ backgroundColor: '#0d0d0d', padding: '20px 24px', borderBottom: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {loading || !box ? (
            <div style={{ color: '#555', fontSize: '14px' }}>Loading box score...</div>
          ) : (
            <div style={{ flex: 1 }}>
              {/* Score header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                {/* Away */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                  {box.awayTeam.logo
                    ? <img src={box.awayTeam.logo} alt="" style={{ width: '22px', height: '22px', objectFit: 'contain', borderRadius: '50%', flexShrink: 0 }} />
                    : <div style={{ width: '10px', height: '10px', backgroundColor: box.awayTeam.color, borderRadius: '50%', flexShrink: 0 }} />
                  }
                  <span style={{ color: awayWon ? '#fff' : '#888', fontWeight: awayWon ? 800 : 600, fontSize: 'clamp(13px, 2vw, 16px)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {box.awayTeam.name}
                  </span>
                </div>
                {/* Score */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, padding: '0 8px' }}>
                  <span style={{ color: awayWon ? '#4A9FE3' : '#ccc', fontWeight: 900, fontSize: '24px' }}>{box.awayScore}</span>
                  <span style={{ color: '#444', fontSize: '14px' }}>—</span>
                  <span style={{ color: homeWon ? '#4A9FE3' : '#ccc', fontWeight: 900, fontSize: '24px' }}>{box.homeScore}</span>
                </div>
                {/* Home */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0, justifyContent: 'flex-end' }}>
                  <span style={{ color: homeWon ? '#fff' : '#888', fontWeight: homeWon ? 800 : 600, fontSize: 'clamp(13px, 2vw, 16px)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right' }}>
                    {box.homeTeam.name}
                  </span>
                  {box.homeTeam.logo
                    ? <img src={box.homeTeam.logo} alt="" style={{ width: '22px', height: '22px', objectFit: 'contain', borderRadius: '50%', flexShrink: 0 }} />
                    : <div style={{ width: '10px', height: '10px', backgroundColor: box.homeTeam.color, borderRadius: '50%', flexShrink: 0 }} />
                  }
                </div>
              </div>
              <div style={{ textAlign: 'center', color: '#555', fontSize: '12px', marginTop: '4px' }}>
                {new Date(box.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          )}
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '20px', padding: '0 0 0 16px', flexShrink: 0, lineHeight: 1 }}
          >✕</button>
        </div>

        {/* Box scores */}
        {!loading && box && (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <StatTable stats={box.awayStats} teamName={box.awayTeam.name} teamColor={box.awayTeam.color} teamLogo={box.awayTeam.logo} />
            <div style={{ height: '1px', backgroundColor: '#2a2a2a' }} />
            <StatTable stats={box.homeStats} teamName={box.homeTeam.name} teamColor={box.homeTeam.color} teamLogo={box.homeTeam.logo} />
          </div>
        )}

        {!loading && box && (box.homeStats.length === 0 && box.awayStats.length === 0) && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#555', fontSize: '14px' }}>
            No player stats recorded for this game
          </div>
        )}
      </div>
    </div>
  )
}

export default function SchedulePage() {
  return (
    <Suspense fallback={<div style={{ backgroundColor: '#111111', minHeight: '100vh' }} />}>
      <SchedulePageContent />
    </Suspense>
  )
}

function SchedulePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [seasonsLoaded, setSeasonsLoaded] = useState(false)
  const [seasonOptions, setSeasonOptions] = useState<SeasonOption[]>([])
  const [selectedSeason, setSelectedSeason] = useState<string>('')
  const [selectedLeague, setSelectedLeague] = useState<string>('all')
  const [filterTeam, setFilterTeam] = useState('all')
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null)

  const updateUrl = (season: string, league: string, team: string) => {
    const p = new URLSearchParams()
    if (season) p.set('season', season)
    if (league !== 'all') p.set('league', league)
    if (team !== 'all') p.set('team', team)
    router.replace(`/schedule${p.toString() ? '?' + p : ''}`, { scroll: false })
  }

  useEffect(() => {
    fetch('/api/seasons')
      .then(r => r.json())
      .then((data: SeasonOption[]) => {
        setSeasonOptions(data)
        const urlSeason = searchParams.get('season')
        const urlLeague = searchParams.get('league') || 'all'
        const urlTeam = searchParams.get('team') || 'all'
        const match = urlSeason && data.find(s => s.season === urlSeason)
        setSelectedLeague(urlLeague)
        setFilterTeam(urlTeam)
        setSelectedSeason(match ? urlSeason : (data[0]?.season ?? ''))
        setSeasonsLoaded(true)
      })
      .catch(() => setSeasonsLoaded(true))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!seasonsLoaded || !selectedSeason) return
    setLoading(true)
    const params = new URLSearchParams()
    params.set('season', selectedSeason)
    if (selectedLeague !== 'all') params.set('league', selectedLeague)

    fetch(`/api/games?${params}`)
      .then(r => r.json())
      .then(data => { setGames(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => { setGames([]); setLoading(false) })
  }, [selectedSeason, selectedLeague, seasonsLoaded])

  const closeModal = useCallback(() => setSelectedGameId(null), [])

  const leagues = [...new Set(seasonOptions.map(s => s.league))]
  const filteredSeasons = selectedLeague === 'all'
    ? seasonOptions
    : seasonOptions.filter(s => s.league === selectedLeague)

  const teamsInView = [...new Map(
    games.flatMap(g => [g.homeTeam, g.awayTeam]).map(t => [t.id, t])
  ).values()].sort((a, b) => a.name.localeCompare(b.name))

  const filtered = filterTeam === 'all'
    ? games
    : games.filter(g => g.homeTeamId === filterTeam || g.awayTeamId === filterTeam)

  // Determine grouping mode: by week# when multiple games share the same week value
  const weekCounts: Record<number, number> = {}
  filtered.forEach(g => { weekCounts[g.week] = (weekCounts[g.week] || 0) + 1 })
  const useWeekGrouping = Object.values(weekCounts).some(c => c > 1)

  // All teams appearing in the filtered set (for bye calculation)
  const allTeamsInView = new Map<string, string>()
  filtered.forEach(g => {
    allTeamsInView.set(g.homeTeam.id, g.homeTeam.name)
    allTeamsInView.set(g.awayTeam.id, g.awayTeam.name)
  })

  // Build groups: key → games[]
  const groups: Record<string, Game[]> = {}
  if (useWeekGrouping) {
    filtered.forEach(g => {
      const key = String(g.week)
      if (!groups[key]) groups[key] = []
      groups[key].push(g)
    })
  } else {
    filtered.forEach(g => {
      const key = g.date.slice(0, 10)
      if (!groups[key]) groups[key] = []
      groups[key].push(g)
    })
  }

  const groupKeys = Object.keys(groups).sort((a, b) => {
    if (useWeekGrouping) return Number(a) - Number(b)
    return a.localeCompare(b)
  })

  // Label each group
  const groupLabelMap: Record<string, { label: string; playoff: boolean; byeTeams: string[] }> = {}
  const hasPlayoffMarkers = groupKeys.some(k => groups[k].some(g => g.week >= 90))

  const labelPlayoffGroups = (playoffKeys: string[]) => {
    playoffKeys.forEach((k, i) => {
      const fromEnd = playoffKeys.length - 1 - i
      const autoLabel = fromEnd === 0 ? 'Finals' : fromEnd === 1 ? 'Semi Finals' : fromEnd === 2 ? 'Quarterfinals' : 'Round 1'
      // Use explicit label from first game if set
      const customLabel = groups[k][0]?.label
      const label = customLabel || autoLabel
      // Show bye teams for early playoff rounds (not Finals/Semis) where not all teams play
      const playing = new Set(groups[k].flatMap(g => [g.homeTeam.name, g.awayTeam.name]))
      const byeTeams = fromEnd >= 2 ? [...allTeamsInView.values()].filter(n => !playing.has(n)).sort() : []
      groupLabelMap[k] = { label, playoff: true, byeTeams }
    })
  }

  if (hasPlayoffMarkers) {
    const regularKeys = groupKeys.filter(k => groups[k].every(g => g.week < 90))
    const playoffKeys = groupKeys.filter(k => groups[k].some(g => g.week >= 90))
    regularKeys.forEach((k, i) => {
      const playing = new Set(groups[k].flatMap(g => [g.homeTeam.name, g.awayTeam.name]))
      const byeTeams = [...allTeamsInView.values()].filter(n => !playing.has(n)).sort()
      // Use explicit label from first game if set (e.g. "Play-in")
      const customLabel = groups[k][0]?.label
      groupLabelMap[k] = {
        label: customLabel || `Week ${i + 1}`,
        playoff: !!customLabel,
        byeTeams,
      }
    })
    labelPlayoffGroups(playoffKeys)
  } else {
    const REGULAR = groupKeys.length > 3 ? groupKeys.length - 3 : 0
    groupKeys.forEach((k, i) => {
      const playing = new Set(groups[k].flatMap(g => [g.homeTeam.name, g.awayTeam.name]))
      const byeTeams = [...allTeamsInView.values()].filter(n => !playing.has(n)).sort()
      const customLabel = groups[k][0]?.label
      if (i < REGULAR) {
        groupLabelMap[k] = { label: customLabel || `Week ${i + 1}`, playoff: !!customLabel, byeTeams }
      } else {
        const fromEnd = (groupKeys.length - REGULAR) - 1 - (i - REGULAR)
        const autoLabel = fromEnd === 0 ? 'Finals' : fromEnd === 1 ? 'Semi Finals' : fromEnd === 2 ? 'Quarterfinals' : 'Round 1'
        groupLabelMap[k] = { label: customLabel || autoLabel, playoff: true, byeTeams: [] }
      }
    })
  }

  // Keep byDate alias for the render loop
  const byDate = groups
  const dates = groupKeys

  const currentLabel = selectedSeason || 'Loading...'

  return (
    <div style={{ backgroundColor: '#111111', minHeight: '100vh' }}>
      {/* Box Score Modal */}
      {selectedGameId && <BoxScoreModal gameId={selectedGameId} onClose={closeModal} />}

      {/* Header */}
      <div style={{ backgroundColor: '#0d0d0d', borderBottom: '1px solid #2a2a2a', padding: '24px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ color: '#4A9FE3', fontSize: '12px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
            {currentLabel}
          </div>
          <h1 style={{ color: '#ffffff', fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 900, marginBottom: '20px' }}>Season Schedule</h1>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <label style={{ color: '#555', fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>LEAGUE</label>
              <select
                value={selectedLeague}
                onChange={e => {
                  const l = e.target.value
                  setSelectedLeague(l)
                  setFilterTeam('all')
                  const matching = l === 'all' ? seasonOptions : seasonOptions.filter(s => s.league === l)
                  const newSeason = matching[0]?.season ?? selectedSeason
                  if (matching.length > 0) setSelectedSeason(newSeason)
                  updateUrl(newSeason, l, 'all')
                }}
                style={selectStyle}
              >
                <option value="all">All Leagues</option>
                {leagues.map(l => (
                  <option key={l} value={l}>{l === 'Comp' ? 'Comp (D1)' : l === 'Rec' ? 'Rec (D2/D3)' : l}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ color: '#555', fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>SEASON</label>
              <select
                value={selectedSeason}
                onChange={e => { setSelectedSeason(e.target.value); setFilterTeam('all'); updateUrl(e.target.value, selectedLeague, 'all') }}
                style={selectStyle}
              >
                {filteredSeasons.map(s => (
                  <option key={`${s.season}-${s.league}`} value={s.season}>{s.season}</option>
                ))}
              </select>
            </div>
            {teamsInView.length > 0 && (
              <div>
                <label style={{ color: '#555', fontSize: '11px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>TEAM</label>
                <select
                  value={filterTeam}
                  onChange={e => { setFilterTeam(e.target.value); updateUrl(selectedSeason, selectedLeague, e.target.value) }}
                  style={selectStyle}
                >
                  <option value="all">All Teams</option>
                  {teamsInView.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div style={{ textAlign: 'center', color: '#555', padding: '60px' }}>Loading schedule...</div>
        ) : dates.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#555', padding: '60px', backgroundColor: '#1a1a1a', borderRadius: '12px', border: '1px solid #2a2a2a' }}>
            No games found for this selection
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {dates.map(dateKey => {
              const { label, playoff, byeTeams } = groupLabelMap[dateKey]
              const gamesInGroup = groups[dateKey]
              // For date-grouped: show the date. For week-grouped: show date range from games
              let dateDisplay = ''
              if (useWeekGrouping) {
                const gameDates = [...new Set(gamesInGroup.map(g => g.date.slice(0, 10)))].sort()
                if (gameDates.length === 1) {
                  dateDisplay = new Date(gameDates[0] + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                } else {
                  const first = new Date(gameDates[0] + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  const last = new Date(gameDates[gameDates.length - 1] + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  dateDisplay = `${first} – ${last}`
                }
              } else {
                dateDisplay = new Date(dateKey + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
              }
              return (
              <div key={dateKey}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: byeTeams.length > 0 ? '8px' : '16px', flexWrap: 'wrap' }}>
                  <div style={{
                    backgroundColor: playoff ? '#3a2800' : '#4A9FE3',
                    color: playoff ? '#F5A623' : '#fff',
                    fontWeight: 700, fontSize: '13px', padding: '5px 14px', borderRadius: '4px',
                    border: playoff ? '1px solid #F5A623' : 'none',
                  }}>
                    {playoff ? '🏆 ' : ''}{label}
                  </div>
                  <div style={{ flex: 1, height: '1px', backgroundColor: playoff ? '#3a2800' : '#2a2a2a' }} />
                  <span style={{ color: '#555', fontSize: '12px', whiteSpace: 'nowrap' }}>{dateDisplay}</span>
                </div>
                {byeTeams.length > 0 && (
                  <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#555', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Bye:</span>
                    {byeTeams.map(t => (
                      <span key={t} style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', color: '#777', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px' }}>{t}</span>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {gamesInGroup.map(game => {
                    const homeWon = game.played && game.homeScore !== null && game.awayScore !== null && game.homeScore > game.awayScore
                    const awayWon = game.played && game.homeScore !== null && game.awayScore !== null && game.awayScore > game.homeScore

                    return (
                      <div
                        key={game.id}
                        onClick={() => game.played ? setSelectedGameId(game.id) : undefined}
                        style={{
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #2a2a2a',
                          borderRadius: '10px',
                          padding: '14px 16px',
                          cursor: game.played ? 'pointer' : 'default',
                          transition: 'border-color 0.15s, background-color 0.15s',
                        }}
                        onMouseEnter={e => { if (game.played) { (e.currentTarget as HTMLElement).style.borderColor = '#3a3a3a'; (e.currentTarget as HTMLElement).style.backgroundColor = '#1e1e1e' } }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#2a2a2a'; (e.currentTarget as HTMLElement).style.backgroundColor = '#1a1a1a' }}
                      >
                        {/* Teams + Score row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          {/* Away Team */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                            {game.awayTeam.logo ? (
                              <img src={game.awayTeam.logo} alt="" style={{ width: '22px', height: '22px', objectFit: 'contain', borderRadius: '50%', flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: '8px', height: '8px', backgroundColor: game.awayTeam.color, borderRadius: '50%', flexShrink: 0 }} />
                            )}
                            <span style={{ color: awayWon ? '#ffffff' : '#aaaaaa', fontWeight: awayWon ? 800 : 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {game.awayTeam.name}
                            </span>
                          </div>

                          {/* Score / VS */}
                          <div style={{ textAlign: 'center', flexShrink: 0, padding: '0 8px' }}>
                            {game.played ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ color: awayWon ? '#4A9FE3' : '#cccccc', fontWeight: 900, fontSize: '18px' }}>{game.awayScore}</span>
                                <span style={{ color: '#444', fontSize: '13px' }}>—</span>
                                <span style={{ color: homeWon ? '#4A9FE3' : '#cccccc', fontWeight: 900, fontSize: '18px' }}>{game.homeScore}</span>
                              </div>
                            ) : (
                              <span style={{ color: '#4A9FE3', fontWeight: 700, fontSize: '14px' }}>{game.time}</span>
                            )}
                          </div>

                          {/* Home Team */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0, justifyContent: 'flex-end' }}>
                            <span style={{ color: homeWon ? '#ffffff' : '#aaaaaa', fontWeight: homeWon ? 800 : 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {game.homeTeam.name}
                            </span>
                            {game.homeTeam.logo ? (
                              <img src={game.homeTeam.logo} alt="" style={{ width: '22px', height: '22px', objectFit: 'contain', borderRadius: '50%', flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: '8px', height: '8px', backgroundColor: game.homeTeam.color, borderRadius: '50%', flexShrink: 0 }} />
                            )}
                          </div>
                        </div>

                        {/* Meta row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          {useWeekGrouping && (
                            <span style={{ color: '#555', fontSize: '11px' }}>
                              {new Date(game.date.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} ·
                            </span>
                          )}
                          <span style={{ color: '#555', fontSize: '11px' }}>{game.location}</span>
                          <span style={{
                            padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                            backgroundColor: game.played ? '#1a4731' : '#2a2a2a',
                            color: game.played ? '#27AE60' : '#888',
                          }}>
                            {game.played ? 'FINAL' : 'UPCOMING'}
                          </span>
                          {game.forfeit && (
                            <span style={{
                              padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                              backgroundColor: '#2a1a1a', color: '#e74c3c',
                            }}>FORFEIT</span>
                          )}
                          {game.played && (
                            <span style={{ color: '#444', fontSize: '11px' }}>· tap for box score</span>
                          )}
                          {game.driveUrl && (
                            <a
                              href={game.driveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '4px',
                                backgroundColor: '#0f2a1a', color: '#27AE60',
                                border: '1px solid #27AE60', borderRadius: '4px',
                                padding: '2px 8px', fontSize: '11px', fontWeight: 700, textDecoration: 'none',
                              }}
                            >
                              📁 Drive
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
