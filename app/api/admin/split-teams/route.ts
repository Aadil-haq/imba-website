import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminAuth } from '@/lib/auth'

/**
 * Undoes the "merge-teams" operation by splitting teams that now have games
 * spanning multiple leagues back into one team per league.
 *
 * Strategy:
 *  1. Build a season → league map from all existing game records.
 *  2. For each team, group their games by the season's league.
 *  3. If a team has games in more than one league, keep the majority-league
 *     games on the existing team and create new team(s) for the other league(s).
 *  4. Move the minority-league game records, player stats, and players to
 *     the newly created team(s).
 */

// GET – dry-run preview
export async function GET(request: Request) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const preview = await analyseTeams()
    return NextResponse.json({ preview })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST – execute the split
export async function POST(request: Request) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const results = await splitAllMixedTeams()
    return NextResponse.json({ ok: true, results })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function buildSeasonLeagueMap(): Promise<Record<string, string>> {
  // Derive the league for each season from the game records themselves
  const rows = await prisma.game.findMany({
    select: { season: true, league: true },
    distinct: ['season', 'league'],
  })
  const map: Record<string, string> = {}
  for (const r of rows) map[r.season] = r.league
  return map
}

interface TeamSplit {
  teamId: string
  teamName: string
  currentLeague: string
  majorityLeague: string
  majorityGameCount: number
  minorityGroups: Array<{ league: string; gameCount: number; gameIds: string[] }>
}

async function analyseTeams(): Promise<TeamSplit[]> {
  const seasonLeague = await buildSeasonLeagueMap()
  const teams = await prisma.team.findMany({ orderBy: { name: 'asc' } })
  const results: TeamSplit[] = []

  for (const team of teams) {
    const games = await prisma.game.findMany({
      where: { OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }] },
      select: { id: true, season: true },
    })
    if (games.length === 0) continue

    // Group game IDs by the league their season belongs to
    const byLeague: Record<string, string[]> = {}
    for (const g of games) {
      const lg = seasonLeague[g.season] ?? 'Unknown'
      if (!byLeague[lg]) byLeague[lg] = []
      byLeague[lg].push(g.id)
    }

    const leagues = Object.entries(byLeague).sort((a, b) => b[1].length - a[1].length)
    if (leagues.length < 2) continue // already pure – skip

    const [majorityLeague, majorityIds] = leagues[0]
    const minority = leagues.slice(1).map(([league, ids]) => ({ league, gameCount: ids.length, gameIds: ids }))

    results.push({
      teamId: team.id,
      teamName: team.name,
      currentLeague: team.league,
      majorityLeague,
      majorityGameCount: majorityIds.length,
      minorityGroups: minority,
    })
  }

  return results
}

async function splitAllMixedTeams(): Promise<string[]> {
  const results: string[] = []
  const mixed = await analyseTeams()

  if (mixed.length === 0) {
    results.push('No mixed-league teams found — nothing to split.')
    return results
  }

  for (const item of mixed) {
    for (const minority of item.minorityGroups) {
      try {
        // 1. Create the new split-off team
        const slug = `${item.teamName.toLowerCase().replace(/\s+/g, '-')}-${minority.league.toLowerCase()}-split-${Date.now()}`
        const newTeam = await prisma.team.create({
          data: {
            name: item.teamName,
            slug,
            league: minority.league,
            // Copy colour/logo from the parent
            color: (await prisma.team.findUnique({ where: { id: item.teamId }, select: { color: true } }))?.color ?? '#4A9FE3',
            logo: (await prisma.team.findUnique({ where: { id: item.teamId }, select: { logo: true } }))?.logo ?? null,
          },
        })

        const gids = minority.gameIds

        // 2. Re-assign home games
        const hg = await prisma.game.updateMany({
          where: { homeTeamId: item.teamId, id: { in: gids } },
          data: { homeTeamId: newTeam.id },
        })
        // 3. Re-assign away games
        const ag = await prisma.game.updateMany({
          where: { awayTeamId: item.teamId, id: { in: gids } },
          data: { awayTeamId: newTeam.id },
        })

        // 4. Re-assign player stats for those games
        const statsUpdated = await prisma.playerGameStat.updateMany({
          where: { teamId: item.teamId, gameId: { in: gids } },
          data: { teamId: newTeam.id },
        })

        // 5. Move players whose ALL stats are now on the new team
        //    (they exclusively played in the minority-league games)
        const allPlayers = await prisma.player.findMany({ where: { teamId: item.teamId } })
        let movedPlayers = 0
        for (const player of allPlayers) {
          const totalStats = await prisma.playerGameStat.count({ where: { playerId: player.id } })
          const newTeamStats = await prisma.playerGameStat.count({
            where: { playerId: player.id, teamId: newTeam.id },
          })
          // If all of this player's stats are on the new team, move them
          if (totalStats > 0 && totalStats === newTeamStats) {
            await prisma.player.update({ where: { id: player.id }, data: { teamId: newTeam.id } })
            movedPlayers++
          }
        }

        results.push(
          `✓ Split "${item.teamName}" — created new ${minority.league} team (${newTeam.id}): ` +
          `${hg.count + ag.count} games, ${movedPlayers} players, ${statsUpdated.count} stats moved`
        )
      } catch (e: any) {
        results.push(`✗ Failed splitting "${item.teamName}" (${minority.league}): ${e.message}`)
      }
    }
  }

  return results
}
