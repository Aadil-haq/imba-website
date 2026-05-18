/**
 * Seeds D2 Comp 2026 Summer schedule:
 *   - 16 new teams
 *   - 64 games across 8 weeks (May 31 – Jul 19, 2026)
 *   - Ensures known_seasons includes this season
 *
 * Run with:  npx tsx scripts/seed-d2-comp-2026-summer.ts
 */
import 'dotenv/config'
import { prisma } from '../lib/db'

const SEASON = 'D2 Comp 2026 Summer'
const LEAGUE = 'Comp'
const LOCATION = 'Irving Masjid Gym'

const TEAMS = [
  { name: 'Lah Bros',        slug: 'lah-bros-d2-comp-2026-summer' },
  { name: 'ATX',             slug: 'atx-d2-comp-2026-summer' },
  { name: 'Seljuks',         slug: 'seljuks-d2-comp-2026-summer' },
  { name: 'Irving OGs',      slug: 'irving-ogs-d2-comp-2026-summer' },
  { name: 'Baitul Ballers',  slug: 'baitul-ballers-d2-comp-2026-summer' },
  { name: 'Easy Money',      slug: 'easy-money-d2-comp-2026-summer' },
  { name: 'Deloaders',       slug: 'deloaders-d2-comp-2026-summer' },
  { name: 'NSG',             slug: 'nsg-d2-comp-2026-summer' },
  { name: 'Fear 1',          slug: 'fear-1-d2-comp-2026-summer' },
  { name: 'Free Sudan',      slug: 'free-sudan-d2-comp-2026-summer' },
  { name: 'Starz',           slug: 'starz-d2-comp-2026-summer' },
  { name: 'The Rich',        slug: 'the-rich-d2-comp-2026-summer' },
  { name: 'Amel Foundation', slug: 'amel-foundation-d2-comp-2026-summer' },
  { name: 'The Dallas Storm',slug: 'the-dallas-storm-d2-comp-2026-summer' },
  { name: 'Net Rippers',     slug: 'net-rippers-d2-comp-2026-summer' },
  { name: 'Top Class',       slug: 'top-class-d2-comp-2026-summer' },
]

// [week, date (YYYY-MM-DD), time, homeName, awayName]
const GAMES: [number, string, string, string, string][] = [
  // ── Week 1 · May 31, 2026 ──────────────────────────────────────────────
  [1, '2026-05-31', '2:30 PM', 'Lah Bros',        'Seljuks'],
  [1, '2026-05-31', '2:30 PM', 'ATX',             'Irving OGs'],
  [1, '2026-05-31', '3:15 PM', 'Baitul Ballers',  'Deloaders'],
  [1, '2026-05-31', '3:15 PM', 'Easy Money',      'NSG'],
  [1, '2026-05-31', '4:10 PM', 'Fear 1',          'Starz'],
  [1, '2026-05-31', '4:10 PM', 'Free Sudan',      'The Rich'],
  [1, '2026-05-31', '5:05 PM', 'Amel Foundation', 'Net Rippers'],
  [1, '2026-05-31', '5:05 PM', 'The Dallas Storm','Top Class'],

  // ── Week 2 · Jun 7, 2026 ───────────────────────────────────────────────
  [2, '2026-06-07', '2:30 PM', 'ATX',             'Baitul Ballers'],
  [2, '2026-06-07', '2:30 PM', 'Amel Foundation', 'Deloaders'],
  [2, '2026-06-07', '3:15 PM', 'Lah Bros',        'Irving OGs'],
  [2, '2026-06-07', '3:15 PM', 'NSG',             'Starz'],
  [2, '2026-06-07', '4:10 PM', 'Fear 1',          'The Dallas Storm'],
  [2, '2026-06-07', '4:10 PM', 'Easy Money',      'Top Class'],
  [2, '2026-06-07', '5:05 PM', 'Free Sudan',      'Seljuks'],
  [2, '2026-06-07', '5:05 PM', 'Net Rippers',     'The Rich'],

  // ── Week 3 · Jun 14, 2026 ──────────────────────────────────────────────
  [3, '2026-06-14', '2:30 PM', 'ATX',             'Fear 1'],
  [3, '2026-06-14', '2:30 PM', 'Amel Foundation', 'NSG'],
  [3, '2026-06-14', '3:15 PM', 'Baitul Ballers',  'Irving OGs'],
  [3, '2026-06-14', '3:15 PM', 'Deloaders',       'The Rich'],
  [3, '2026-06-14', '4:10 PM', 'Easy Money',      'Lah Bros'],
  [3, '2026-06-14', '4:10 PM', 'Seljuks',         'Starz'],
  [3, '2026-06-14', '5:05 PM', 'Free Sudan',      'Top Class'],
  [3, '2026-06-14', '5:05 PM', 'Net Rippers',     'The Dallas Storm'],

  // ── Week 4 · Jun 21, 2026 ──────────────────────────────────────────────
  [4, '2026-06-21', '2:30 PM', 'ATX',             'The Dallas Storm'],
  [4, '2026-06-21', '2:30 PM', 'Amel Foundation', 'Starz'],
  [4, '2026-06-21', '3:15 PM', 'Baitul Ballers',  'Free Sudan'],
  [4, '2026-06-21', '3:15 PM', 'Deloaders',       'Easy Money'],
  [4, '2026-06-21', '4:10 PM', 'Fear 1',          'Lah Bros'],
  [4, '2026-06-21', '4:10 PM', 'Net Rippers',     'Irving OGs'],
  [4, '2026-06-21', '5:05 PM', 'Seljuks',         'The Rich'],
  [4, '2026-06-21', '5:05 PM', 'NSG',             'Top Class'],

  // ── Week 5 · Jun 28, 2026 ──────────────────────────────────────────────
  [5, '2026-06-28', '2:30 PM', 'ATX',             'Starz'],
  [5, '2026-06-28', '2:30 PM', 'Amel Foundation', 'Easy Money'],
  [5, '2026-06-28', '3:15 PM', 'Baitul Ballers',  'Net Rippers'],
  [5, '2026-06-28', '3:15 PM', 'Deloaders',       'Fear 1'],
  [5, '2026-06-28', '4:10 PM', 'Free Sudan',      'Lah Bros'],
  [5, '2026-06-28', '4:10 PM', 'Irving OGs',      'Seljuks'],
  [5, '2026-06-28', '5:05 PM', 'NSG',             'Top Class'],
  [5, '2026-06-28', '5:05 PM', 'The Dallas Storm','The Rich'],

  // ── Week 6 · Jul 5, 2026 ───────────────────────────────────────────────
  [6, '2026-07-05', '2:30 PM', 'ATX',             'NSG'],
  [6, '2026-07-05', '2:30 PM', 'Amel Foundation', 'Irving OGs'],
  [6, '2026-07-05', '3:15 PM', 'Baitul Ballers',  'The Dallas Storm'],
  [6, '2026-07-05', '3:15 PM', 'Deloaders',       'Seljuks'],
  [6, '2026-07-05', '4:10 PM', 'Easy Money',      'Free Sudan'],
  [6, '2026-07-05', '4:10 PM', 'Fear 1',          'Top Class'],
  [6, '2026-07-05', '5:05 PM', 'Lah Bros',        'The Rich'],
  [6, '2026-07-05', '5:05 PM', 'Net Rippers',     'Starz'],

  // ── Week 7 · Jul 12, 2026 ──────────────────────────────────────────────
  [7, '2026-07-12', '2:30 PM', 'ATX',             'Top Class'],
  [7, '2026-07-12', '2:30 PM', 'Amel Foundation', 'Fear 1'],
  [7, '2026-07-12', '3:15 PM', 'Baitul Ballers',  'Lah Bros'],
  [7, '2026-07-12', '3:15 PM', 'Easy Money',      'Seljuks'],
  [7, '2026-07-12', '4:10 PM', 'Free Sudan',      'Irving OGs'],
  [7, '2026-07-12', '4:10 PM', 'Net Rippers',     'NSG'],
  [7, '2026-07-12', '5:05 PM', 'Starz',           'The Rich'],
  [7, '2026-07-12', '5:05 PM', 'The Dallas Storm','Deloaders'],

  // ── Week 8 · Jul 19, 2026 ──────────────────────────────────────────────
  [8, '2026-07-19', '2:30 PM', 'ATX',             'The Rich'],
  [8, '2026-07-19', '2:30 PM', 'Amel Foundation', 'The Dallas Storm'],
  [8, '2026-07-19', '3:15 PM', 'Baitul Ballers',  'Starz'],
  [8, '2026-07-19', '3:15 PM', 'Deloaders',       'Irving OGs'],
  [8, '2026-07-19', '4:10 PM', 'Easy Money',      'Fear 1'],
  [8, '2026-07-19', '4:10 PM', 'Free Sudan',      'NSG'],
  [8, '2026-07-19', '5:05 PM', 'Lah Bros',        'Top Class'],
  [8, '2026-07-19', '5:05 PM', 'Net Rippers',     'Seljuks'],
]

async function main() {
  console.log(`Seeding ${SEASON} …`)

  // 1. Create teams
  console.log('Creating teams …')
  const teamMap: Record<string, string> = {}
  for (const t of TEAMS) {
    const team = await prisma.team.upsert({
      where: { slug: t.slug },
      update: {},
      create: { name: t.name, slug: t.slug, league: LEAGUE, color: '#4A9FE3', active: true },
    })
    teamMap[t.name] = team.id
    console.log(`  ✓ ${t.name} (${team.id})`)
  }

  // 2. Create games
  console.log('Creating games …')
  let count = 0
  for (const [week, dateStr, time, homeName, awayName] of GAMES) {
    const homeTeamId = teamMap[homeName]
    const awayTeamId = teamMap[awayName]
    if (!homeTeamId || !awayTeamId) throw new Error(`Unknown team: ${homeName} or ${awayName}`)

    await prisma.game.create({
      data: {
        season: SEASON,
        league: LEAGUE,
        week,
        date: new Date(`${dateStr}T12:00:00.000Z`),
        time,
        location: LOCATION,
        homeTeamId,
        awayTeamId,
      },
    })
    count++
  }
  console.log(`  ✓ ${count} games created`)

  // 3. Ensure known_seasons includes this season
  const ks = await prisma.siteSetting.findUnique({ where: { key: 'known_seasons' } })
  if (ks) {
    const seasons: Array<{ season: string; league: string }> = JSON.parse(ks.value)
    const already = seasons.some(s => s.season === SEASON && s.league === LEAGUE)
    if (!already) {
      seasons.push({ season: SEASON, league: LEAGUE })
      await prisma.siteSetting.update({
        where: { key: 'known_seasons' },
        data: { value: JSON.stringify(seasons) },
      })
      console.log('✓ Added to known_seasons')
    } else {
      console.log('✓ known_seasons already contains this season')
    }
  } else {
    await prisma.siteSetting.create({
      data: { key: 'known_seasons', value: JSON.stringify([{ season: SEASON, league: LEAGUE }]) },
    })
    console.log('✓ Created known_seasons')
  }

  console.log('\nDone!')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
