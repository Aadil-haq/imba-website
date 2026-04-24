import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const DEFAULT_SETTINGS: Record<string, string> = {
  hero_tagline:      'Spring 2025 Season',
  hero_title_line1:  'Irving Masjid',
  hero_title_line2:  'Basketball Association',
  hero_subtitle:     'Community. Competition. Brotherhood.',
  hero_cta_primary:  'View Schedule',
  hero_cta_secondary:'Register Now',
  stat_teams:        '4',
  stat_season:       'Spring 2025',
  stat_location:     'Irving Masjid',
  stat_fee:          '$80',
  section_games_title:    'Upcoming Games',
  section_standings_title:'Season Standings',
  section_scorers_title:  'Top Scorers',
  section_news_title:     'Latest News',
  season_label:      'Spring 2025',
  cta_subtitle:      'Join IMBA today — limited spots available.',
  cta_button_text:   'Register Now',
}

export async function GET() {
  const rows = await prisma.siteSetting.findMany()
  const saved = Object.fromEntries(rows.map(r => [r.key, r.value]))
  // Merge defaults with saved (saved wins)
  const merged = { ...DEFAULT_SETTINGS, ...saved }
  return NextResponse.json(merged)
}

export async function POST(request: Request) {
  const body: Record<string, string> = await request.json()

  await Promise.all(
    Object.entries(body).map(([key, value]) =>
      prisma.siteSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    )
  )

  return NextResponse.json({ ok: true })
}
