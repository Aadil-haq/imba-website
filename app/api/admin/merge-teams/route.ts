import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminAuth } from '@/lib/auth'

// GET: Preview what would be merged (dry run)
export async function GET(request: Request) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const duplicates = await findDuplicates()
    return NextResponse.json({ duplicates })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST: Execute the merge
export async function POST(request: Request) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const results = await mergeAllDuplicates()
    return NextResponse.json({ ok: true, results })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

interface TeamWithCounts {
  id: string
  name: string
  league: string
  gameCount: number
  playerCount: number
}

async function findDuplicates(): Promise<Record<string, TeamWithCounts[]>> {
  const allTeams = await prisma.team.findMany({ orderBy: { name: 'asc' } })

  // Group by name
  const byName: Record<string, typeof allTeams> = {}
  for (const t of allTeams) {
    if (!byName[t.name]) byName[t.name] = []
    byName[t.name].push(t)
  }

  // Find names with duplicates and count their games
  const dupes: Record<string, TeamWithCounts[]> = {}
  for (const [name, teams] of Object.entries(byName)) {
    if (teams.length < 2) continue

    const withCounts: TeamWithCounts[] = []
    for (const t of teams) {
      const homeGames = await prisma.game.count({ where: { homeTeamId: t.id } })
      const awayGames = await prisma.game.count({ where: { awayTeamId: t.id } })
      const players = await prisma.player.count({ where: { teamId: t.id } })
      withCounts.push({
        id: t.id,
        name: t.name,
        league: t.league,
        gameCount: homeGames + awayGames,
        playerCount: players,
      })
    }
    // Sort by game count descending — the winner (most games) goes first
    withCounts.sort((a, b) => b.gameCount - a.gameCount || b.playerCount - a.playerCount)
    dupes[name] = withCounts
  }

  return dupes
}

async function mergeAllDuplicates(): Promise<string[]> {
  const results: string[] = []
  const duplicates = await findDuplicates()

  for (const [name, teams] of Object.entries(duplicates)) {
    const winner = teams[0]  // most games
    const losers = teams.slice(1)

    for (const loser of losers) {
      try {
        // 1. Reassign home games
        const hg = await prisma.game.updateMany({
          where: { homeTeamId: loser.id },
          data: { homeTeamId: winner.id },
        })
        // 2. Reassign away games
        const ag = await prisma.game.updateMany({
          where: { awayTeamId: loser.id },
          data: { awayTeamId: winner.id },
        })
        // 3. Reassign players
        const pl = await prisma.player.updateMany({
          where: { teamId: loser.id },
          data: { teamId: winner.id },
        })
        // 4. Reassign player stats
        const st = await prisma.playerGameStat.updateMany({
          where: { teamId: loser.id },
          data: { teamId: winner.id },
        })
        // 5. Delete the duplicate team
        await prisma.team.delete({ where: { id: loser.id } })

        results.push(
          `✓ Merged "${name}" (${loser.id} → ${winner.id}): ` +
          `${hg.count + ag.count} games, ${pl.count} players, ${st.count} stats reassigned`
        )
      } catch (e: any) {
        results.push(`✗ Failed merging "${name}" loser ${loser.id}: ${e.message}`)
      }
    }
  }

  if (results.length === 0) results.push('No duplicate teams found — nothing to merge.')
  return results
}
