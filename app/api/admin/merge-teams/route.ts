import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminAuth } from '@/lib/auth'

export async function POST(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 1. Load all teams
    const allTeams = await prisma.team.findMany({ orderBy: { name: 'asc' } })

    // 2. Group by normalised name
    const byName = new Map<string, typeof allTeams>()
    for (const t of allTeams) {
      const key = t.name.trim().toLowerCase()
      if (!byName.has(key)) byName.set(key, [])
      byName.get(key)!.push(t)
    }

    const results: string[] = []
    let merged = 0

    for (const [, group] of byName) {
      if (group.length < 2) continue

      // 3. Pick canonical: most games (home + away), tie-break by most players
      const withCounts = await Promise.all(
        group.map(async (t) => {
          const homeGames = await prisma.game.count({ where: { homeTeamId: t.id } })
          const awayGames = await prisma.game.count({ where: { awayTeamId: t.id } })
          const players = await prisma.player.count({ where: { teamId: t.id } })
          return { ...t, gameCount: homeGames + awayGames, playerCount: players }
        })
      )

      withCounts.sort(
        (a, b) => b.gameCount - a.gameCount || b.playerCount - a.playerCount
      )

      const canonical = withCounts[0]
      const dupes = withCounts.slice(1)

      for (const dupe of dupes) {
        try {
          // 4a. Re-point Players
          await (prisma as unknown as { $executeRawUnsafe: (...args: unknown[]) => Promise<number> })
            .$executeRawUnsafe(
              `UPDATE "Player" SET "teamId" = ? WHERE "teamId" = ?`,
              canonical.id,
              dupe.id
            )

          // 4b. Re-point Game.homeTeamId
          await (prisma as unknown as { $executeRawUnsafe: (...args: unknown[]) => Promise<number> })
            .$executeRawUnsafe(
              `UPDATE "Game" SET "homeTeamId" = ? WHERE "homeTeamId" = ?`,
              canonical.id,
              dupe.id
            )

          // 4c. Re-point Game.awayTeamId
          await (prisma as unknown as { $executeRawUnsafe: (...args: unknown[]) => Promise<number> })
            .$executeRawUnsafe(
              `UPDATE "Game" SET "awayTeamId" = ? WHERE "awayTeamId" = ?`,
              canonical.id,
              dupe.id
            )

          // 4d. Re-point PlayerGameStat.teamId
          await (prisma as unknown as { $executeRawUnsafe: (...args: unknown[]) => Promise<number> })
            .$executeRawUnsafe(
              `UPDATE "PlayerGameStat" SET "teamId" = ? WHERE "teamId" = ?`,
              canonical.id,
              dupe.id
            )

          // 4e. Update season_teams SiteSetting
          const setting = await prisma.siteSetting.findUnique({
            where: { key: 'season_teams' },
          })
          if (setting) {
            const seasonTeams = JSON.parse(setting.value) as Record<string, string[]>
            let changed = false
            for (const season of Object.keys(seasonTeams)) {
              const ids = seasonTeams[season]
              const idx = ids.indexOf(dupe.id)
              if (idx !== -1) {
                // Replace dupe with canonical only if canonical isn't already present
                if (!ids.includes(canonical.id)) {
                  ids[idx] = canonical.id
                } else {
                  ids.splice(idx, 1)
                }
                changed = true
              }
            }
            if (changed) {
              await prisma.siteSetting.update({
                where: { key: 'season_teams' },
                data: { value: JSON.stringify(seasonTeams) },
              })
            }
          }

          // 4f. Delete the duplicate team
          await prisma.team.delete({ where: { id: dupe.id } })

          merged++
          results.push(
            `merged "${dupe.name}" (${dupe.id} → ${canonical.id}): ` +
            `${dupe.gameCount} games, ${dupe.playerCount} players reassigned`
          )
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          results.push(`failed "${dupe.name}" (${dupe.id}): ${msg.slice(0, 120)}`)
        }
      }
    }

    if (results.length === 0) {
      results.push('No duplicate teams found — nothing to merge.')
    }

    return NextResponse.json({ ok: true, merged, results })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
