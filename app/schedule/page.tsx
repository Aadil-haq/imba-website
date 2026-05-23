// Server Component — pre-fetches the default season's schedule so the page
// arrives fully rendered with no loading spinner.
// Cached for 2 minutes; stale data is revalidated in the background.
export const revalidate = 120

import { prisma } from '@/lib/db'
import ScheduleClient from '@/components/ScheduleClient'

async function getInitialScheduleData() {
  try {
    // 1. Get all seasons sorted by recency (most recent first)
    const seasonGroups = await prisma.game.groupBy({
      by: ['season', 'league'],
      _max: { date: true },
      orderBy: { _max: { date: 'desc' } },
    })
    const seasonOptions = seasonGroups.map(g => ({ season: g.season, league: g.league }))
    const latestSeason = seasonOptions[0]?.season ?? ''

    if (!latestSeason) return { seasonOptions, games: [], latestSeason: '' }

    // 2. Fetch games for the latest season (runs server-side — no browser round trip)
    const games = await prisma.game.findMany({
      where: { season: latestSeason },
      include: {
        homeTeam: { select: { id: true, name: true, slug: true, color: true, logo: true } },
        awayTeam: { select: { id: true, name: true, slug: true, color: true, logo: true } },
      },
      orderBy: [{ date: 'asc' }, { week: 'asc' }],
    })

    return { seasonOptions, games, latestSeason }
  } catch (err) {
    console.error('Schedule SSR error:', err)
    return { seasonOptions: [], games: [], latestSeason: '' }
  }
}

export default async function SchedulePage() {
  const { seasonOptions, games, latestSeason } = await getInitialScheduleData()

  return (
    <ScheduleClient
      initialSeasonOptions={seasonOptions}
      initialGames={games as any}
      initialSeason={latestSeason}
    />
  )
}
