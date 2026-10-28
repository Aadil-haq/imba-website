import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { getGameEvents, replayEvents, fmtClock, CLOCK_TYPES, EVENT_LABELS, type EventType } from '@/lib/liveStats'
import LiveRefresh from '@/components/LiveRefresh'

export const dynamic = 'force-dynamic'

function weekLabel(week: number) {
  if (week === 96) return 'Round 1'
  if (week === 97) return 'Quarterfinals'
  if (week === 98) return 'Semifinals'
  if (week === 99) return 'Finals'
  return `Week ${week}`
}

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      homeTeam: true,
      awayTeam: true,
      playerStats: {
        include: { player: true, team: true },
        orderBy: { points: 'desc' },
      },
    },
  })

  if (!game) notFound()

  // A game is live once the scorer has logged anything and it isn't final yet
  const events = await getGameEvents(id)
  const isLive = !game.played && events.length > 0
  const showScore = game.played || isLive
  // Minutes, +/- and the game clock come from replaying the scorer's events
  const live = events.length ? replayEvents(events, game.homeTeamId, game.awayTeamId) : null
  const period = live?.period ?? 1
  const timeOfDay = (d: Date) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })
  const playerNames: Record<string, string> = {}
  for (const s of game.playerStats) playerNames[s.playerId] = s.player.name
  const teamColor = (teamId: string) => teamId === game.homeTeamId ? game.homeTeam.color : game.awayTeam.color

  // Play-by-play, newest first; subs are logged as an OUT+IN pair in one batch
  const plays: { key: string; period: number; clock: string; time: string; teamId: string | null; text: string; isSub: boolean }[] = []
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i]
    const batch = events.filter(x => x.batchId === e.batchId)
    if (batch[batch.length - 1].id !== e.id || batch.every(x => CLOCK_TYPES.includes(x.type))) continue
    const at = live?.eventClock[batch[0].id] ?? { period: e.period, periodSec: 0 }
    const stamp = { period: at.period, clock: fmtClock(at.periodSec), time: timeOfDay(new Date(batch[0].createdAt)) }
    if (e.type === 'PERIOD') { plays.push({ key: e.id, ...stamp, teamId: null, text: `Start of period ${e.period}`, isSub: false }); continue }
    const inE = batch.find(x => x.type === 'IN'), outE = batch.find(x => x.type === 'OUT')
    const ins = batch.filter(x => x.type === 'IN')
    if (ins.length > 1) {
      plays.push({ key: e.id, ...stamp, teamId: null, text: `Tip-off. Starters: ${ins.map(x => playerNames[x.playerId!] ?? '?').join(', ')}`, isSub: true })
      continue
    }
    const text = inE && outE
      ? `Sub: ${playerNames[inE.playerId!] ?? '?'} in for ${playerNames[outE.playerId!] ?? '?'}`
      : `${playerNames[e.playerId!] ?? 'Unknown'} ${EVENT_LABELS[e.type as EventType] ?? e.type}`
    plays.push({ key: e.id, ...stamp, teamId: e.teamId, text, isSub: !!(inE || outE) })
  }

  // Players checked in by the live scorer played even if they never recorded a stat
  const checkedIn = new Set(events.filter(e => e.type === 'IN').map(e => e.playerId))
  const isDnp = (s: typeof game.playerStats[0]) =>
    !checkedIn.has(s.playerId) &&
    s.points === 0 && s.rebounds === 0 && s.assists === 0 &&
    s.steals === 0 && s.blocks === 0 && s.twoPtMade === 0 &&
    s.threeMade === 0 && s.ftMade === 0 && (s.fouls ?? 0) === 0

  const homeStats = game.playerStats.filter(s => s.teamId === game.homeTeamId && !isDnp(s))
  const awayStats = game.playerStats.filter(s => s.teamId === game.awayTeamId && !isDnp(s))
  const homeDnp  = game.playerStats.filter(s => s.teamId === game.homeTeamId && isDnp(s) && !s.player.isSub)
  const awayDnp  = game.playerStats.filter(s => s.teamId === game.awayTeamId && isDnp(s) && !s.player.isSub)

  const homeWon = game.played && game.homeScore !== null && game.awayScore !== null && game.homeScore! > game.awayScore!
  const awayWon = game.played && game.homeScore !== null && game.awayScore !== null && game.awayScore! > game.homeScore!

  const statCols = [
    { key: 'points',    label: 'PTS' },
    { key: 'rebounds',  label: 'REB' },
    { key: 'assists',   label: 'AST' },
    { key: 'steals',    label: 'STL' },
    { key: 'blocks',    label: 'BLK' },
    { key: 'twoPtMade', label: '2PM' },
    { key: 'twoPtAtt',  label: '2PA' },
    { key: 'threeMade', label: '3PM' },
    { key: 'threeAtt',  label: '3PA' },
    { key: 'ftMade',    label: 'FTM' },
    { key: 'ftAtt',     label: 'FTA' },
  ]

  function StatTable({ stats, dnpPlayers, teamName, teamColor }: {
    stats: typeof homeStats
    dnpPlayers: typeof homeDnp
    teamName: string
    teamColor: string
  }) {
    if (stats.length === 0) return (
      <div style={{ color: '#444', fontSize: '13px', padding: '24px 0' }}>No stats recorded for this game.</div>
    )

    // Calculate team totals
    const totals = stats.reduce((acc, s) => ({
      points: acc.points + (s.points ?? 0),
      rebounds: acc.rebounds + (s.rebounds ?? 0),
      assists: acc.assists + (s.assists ?? 0),
      steals: acc.steals + (s.steals ?? 0),
      blocks: acc.blocks + (s.blocks ?? 0),
      twoPtMade: acc.twoPtMade + (s.twoPtMade ?? 0),
      twoPtAtt: acc.twoPtAtt + (s.twoPtAtt ?? 0),
      threeMade: acc.threeMade + (s.threeMade ?? 0),
      threeAtt: acc.threeAtt + (s.threeAtt ?? 0),
      ftMade: acc.ftMade + (s.ftMade ?? 0),
      ftAtt: acc.ftAtt + (s.ftAtt ?? 0),
    }), { points:0, rebounds:0, assists:0, steals:0, blocks:0, twoPtMade:0, twoPtAtt:0, threeMade:0, threeAtt:0, ftMade:0, ftAtt:0 })

    return (
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '12px 16px', backgroundColor: '#111', borderRadius: '8px 8px 0 0',
          borderBottom: `2px solid ${teamColor}`,
        }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: teamColor }} />
          <span style={{ color: '#fff', fontWeight: 800, fontSize: '15px' }}>{teamName}</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0d0d0d' }}>
                <th style={{ padding: '9px 14px', textAlign: 'left', color: '#444', fontWeight: 700, fontSize: '10px', letterSpacing: '0.08em' }}>#</th>
                <th style={{ padding: '9px 14px', textAlign: 'left', color: '#444', fontWeight: 700, fontSize: '10px', letterSpacing: '0.08em' }}>PLAYER</th>
                {live && <th style={{ padding: '9px 10px', textAlign: 'center', color: '#444', fontWeight: 700, fontSize: '10px', letterSpacing: '0.08em' }}>MIN</th>}
                {live && <th style={{ padding: '9px 10px', textAlign: 'center', color: '#444', fontWeight: 700, fontSize: '10px', letterSpacing: '0.08em' }}>+/-</th>}
                {statCols.map(c => (
                  <th key={c.key} style={{ padding: '9px 10px', textAlign: 'center', color: '#444', fontWeight: 700, fontSize: '10px', letterSpacing: '0.08em' }}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.map((s, i) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #1a1a1a', backgroundColor: i % 2 === 0 ? 'transparent' : '#0d0d0d' }}>
                  <td style={{ padding: '10px 14px', color: '#555', fontSize: '12px' }}>{s.player.number ?? '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <Link href={`/players/${s.player.id}`} style={{ color: '#4A9FE3', fontSize: '13px', fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>
                      {s.player.name}
                    </Link>
                  </td>
                  {live && <td style={{ padding: '10px', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>{fmtClock(live.lines[s.playerId]?.seconds ?? 0)}</td>}
                  {live && (() => {
                    const pm = live.lines[s.playerId]?.plusMinus ?? 0
                    return <td style={{ padding: '10px', textAlign: 'center', color: pm > 0 ? '#27AE60' : pm < 0 ? '#e74c3c' : '#aaa', fontSize: '13px', fontWeight: 700 }}>{pm > 0 ? `+${pm}` : pm}</td>
                  })()}
                  <td style={{ padding: '10px', textAlign: 'center', color: '#fff', fontWeight: 700, fontSize: '13px' }}>{s.points ?? 0}</td>
                  <td style={{ padding: '10px', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>{s.rebounds ?? 0}</td>
                  <td style={{ padding: '10px', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>{s.assists ?? 0}</td>
                  <td style={{ padding: '10px', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>{s.steals ?? 0}</td>
                  <td style={{ padding: '10px', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>{s.blocks ?? 0}</td>
                  <td style={{ padding: '10px', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>{s.twoPtMade ?? 0}</td>
                  <td style={{ padding: '10px', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>{s.twoPtAtt ?? 0}</td>
                  <td style={{ padding: '10px', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>{s.threeMade ?? 0}</td>
                  <td style={{ padding: '10px', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>{s.threeAtt ?? 0}</td>
                  <td style={{ padding: '10px', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>{s.ftMade ?? 0}</td>
                  <td style={{ padding: '10px', textAlign: 'center', color: '#aaa', fontSize: '13px' }}>{s.ftAtt ?? 0}</td>
                </tr>
              ))}
              {/* Totals row */}
              <tr style={{ backgroundColor: '#0a0a0a', borderTop: '2px solid #222' }}>
                <td style={{ padding: '10px 14px' }} />
                <td style={{ padding: '10px 14px', color: '#666', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em' }}>TOTALS</td>
                {live && <td />}
                {live && <td />}
                <td style={{ padding: '10px', textAlign: 'center', color: '#4A9FE3', fontWeight: 800, fontSize: '13px' }}>{totals.points}</td>
                <td style={{ padding: '10px', textAlign: 'center', color: '#4A9FE3', fontWeight: 700, fontSize: '13px' }}>{totals.rebounds}</td>
                <td style={{ padding: '10px', textAlign: 'center', color: '#4A9FE3', fontWeight: 700, fontSize: '13px' }}>{totals.assists}</td>
                <td style={{ padding: '10px', textAlign: 'center', color: '#4A9FE3', fontWeight: 700, fontSize: '13px' }}>{totals.steals}</td>
                <td style={{ padding: '10px', textAlign: 'center', color: '#4A9FE3', fontWeight: 700, fontSize: '13px' }}>{totals.blocks}</td>
                <td style={{ padding: '10px', textAlign: 'center', color: '#666', fontSize: '13px' }}>{totals.twoPtMade}</td>
                <td style={{ padding: '10px', textAlign: 'center', color: '#666', fontSize: '13px' }}>{totals.twoPtAtt}</td>
                <td style={{ padding: '10px', textAlign: 'center', color: '#666', fontSize: '13px' }}>{totals.threeMade}</td>
                <td style={{ padding: '10px', textAlign: 'center', color: '#666', fontSize: '13px' }}>{totals.threeAtt}</td>
                <td style={{ padding: '10px', textAlign: 'center', color: '#666', fontSize: '13px' }}>{totals.ftMade}</td>
                <td style={{ padding: '10px', textAlign: 'center', color: '#666', fontSize: '13px' }}>{totals.ftAtt}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {/* DNP row */}
        {dnpPlayers.length > 0 && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ color: '#444', fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', flexShrink: 0 }}>DNP —</span>
            <span style={{ color: '#444', fontSize: '12px' }}>
              {dnpPlayers.map(s => s.player.name).join(', ')}
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: '#0f0f0f', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#0d0d0d', borderBottom: '1px solid #1a1a1a', padding: '16px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/" style={{ color: '#555', fontSize: '12px', textDecoration: 'none', fontWeight: 600 }}>
            ← Back
          </Link>
        </div>
      </div>

      {/* Score Banner */}
      <div style={{ backgroundColor: '#111', borderBottom: '1px solid #1a1a1a', padding: '32px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <span style={{ color: '#555', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {game.season} · {weekLabel(game.week)} · {new Date(game.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          {/* Single row — never wraps on mobile */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            {/* Away team */}
            <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
              <Link href={`/teams/${game.awayTeam.slug}`} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '8px' }}>
                  {(game.awayTeam as any).logo
                    ? <img src={(game.awayTeam as any).logo} alt="" style={{ width: '24px', height: '24px', objectFit: 'contain', borderRadius: '50%', backgroundColor: '#fff', flexShrink: 0 }} />
                    : <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: game.awayTeam.color, flexShrink: 0 }} />
                  }
                  <span style={{ color: awayWon ? '#fff' : '#888', fontWeight: 700, fontSize: 'clamp(13px, 3.5vw, 18px)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{game.awayTeam.name}</span>
                </div>
              </Link>
              <div style={{ color: awayWon ? '#fff' : '#555', fontSize: 'clamp(40px, 12vw, 64px)', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em' }}>
                {showScore ? (game.awayScore ?? 0) : '—'}
              </div>
            </div>

            {/* Divider */}
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              {game.played ? (
                <div style={{ backgroundColor: '#27AE60', color: '#fff', fontSize: '9px', fontWeight: 800, padding: '4px 8px', borderRadius: '4px', letterSpacing: '0.08em' }}>FINAL</div>
              ) : isLive ? (
                <div>
                  <div style={{ backgroundColor: '#c0392b', color: '#fff', fontSize: '9px', fontWeight: 800, padding: '4px 8px', borderRadius: '4px', letterSpacing: '0.08em' }}>● LIVE</div>
                  <div style={{ color: '#888', fontSize: '11px', fontWeight: 700, marginTop: '4px' }}>Period {period}{live && ` · ${fmtClock(live.clock.periodSec)}`}</div>
                </div>
              ) : (
                <div style={{ color: '#4A9FE3', fontSize: '13px', fontWeight: 700 }}>{game.time}</div>
              )}
            </div>

            {/* Home team */}
            <div style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
              <Link href={`/teams/${game.homeTeam.slug}`} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '8px' }}>
                  {(game.homeTeam as any).logo
                    ? <img src={(game.homeTeam as any).logo} alt="" style={{ width: '24px', height: '24px', objectFit: 'contain', borderRadius: '50%', backgroundColor: '#fff', flexShrink: 0 }} />
                    : <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: game.homeTeam.color, flexShrink: 0 }} />
                  }
                  <span style={{ color: homeWon ? '#fff' : '#888', fontWeight: 700, fontSize: 'clamp(13px, 3.5vw, 18px)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{game.homeTeam.name}</span>
                </div>
              </Link>
              <div style={{ color: homeWon ? '#fff' : '#555', fontSize: 'clamp(40px, 12vw, 64px)', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em' }}>
                {showScore ? (game.homeScore ?? 0) : '—'}
              </div>
            </div>
          </div>

          {game.location && (
            <div style={{ textAlign: 'center', marginTop: '16px', color: '#444', fontSize: '12px' }}>{game.location}</div>
          )}
        </div>
      </div>

      {/* Box Score */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ padding: '40px 16px' }}>
        {game.playerStats.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#444', padding: '60px 0', fontSize: '15px' }}>
            No box score available for this game.
          </div>
        ) : (
          <>
            <div style={{ color: '#4A9FE3', fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '20px' }}>Box Score</div>
            <div style={{ backgroundColor: '#141414', border: '1px solid #1e1e1e', borderRadius: '12px', overflow: 'hidden', padding: '20px' }}>
              <StatTable stats={awayStats} dnpPlayers={awayDnp} teamName={game.awayTeam.name} teamColor={game.awayTeam.color} />
              <StatTable stats={homeStats} dnpPlayers={homeDnp} teamName={game.homeTeam.name} teamColor={game.homeTeam.color} />
            </div>
          </>
        )}

        {plays.length > 0 && (
          <div style={{ marginTop: '32px' }}>
            <div style={{ color: '#4A9FE3', fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '12px' }}>Play-by-Play</div>
            <div style={{ backgroundColor: '#141414', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '8px 20px', maxHeight: '480px', overflowY: 'auto' }}>
              {plays.map(p => (
                <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 0', borderBottom: '1px solid #1a1a1a' }}>
                  <span style={{ color: '#666', fontSize: '11px', fontWeight: 700, width: '64px', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>P{p.period} {p.clock}</span>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: p.teamId ? teamColor(p.teamId) : '#444', flexShrink: 0 }} />
                  <span style={{ color: p.isSub ? '#fff' : '#ccc', fontSize: '13px', fontWeight: p.isSub ? 700 : 400, flex: 1 }}>{p.text}</span>
                  <span style={{ color: '#555', fontSize: '11px', flexShrink: 0 }}>{p.time}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {isLive && <LiveRefresh />}
    </div>
  )
}
