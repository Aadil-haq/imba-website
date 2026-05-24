/**
 * Wipes all D2 Comp 2026 Summer games + teams from production,
 * then re-seeds cleanly with the correct adjusted times.
 *
 * Run with:  npx tsx scripts/cleanup-and-reseed-d2-comp-2026.ts
 */
import 'dotenv/config'
import { prisma } from '../lib/db'

const SEASON = 'D2 Comp 2026 Summer'
const LEAGUE = 'Comp'
const LOCATION = 'Irving Masjid Gym'

const TEAMS = [
  { name: 'Lah Bros',         slug: 'lah-bros-d2-comp-2026-summer' },
  { name: 'ATX',              slug: 'atx-d2-comp-2026-summer' },
  { name: 'Seljuks',          slug: 'seljuks-d2-comp-2026-summer' },
  { name: 'Irving OGs',       slug: 'irving-ogs-d2-comp-2026-summer' },
  { name: 'Baitul Ballers',   slug: 'baitul-ballers-d2-comp-2026-summer' },
  { name: 'Easy Money',       slug: 'easy-money-d2-comp-2026-summer' },
  { name: 'Deloaders',        slug: 'deloaders-d2-comp-2026-summer' },
  { name: 'NSG',              slug: 'nsg-d2-comp-2026-summer' },
  { name: 'Fear 1',           slug: 'fear-1-d2-comp-2026-summer' },
  { name: 'Free Sudan',       slug: 'free-sudan-d2-comp-2026-summer' },
  { name: 'Starz',            slug: 'starz-d2-comp-2026-summer' },
  { name: 'The Rich',         slug: 'the-rich-d2-comp-2026-summer' },
  { name: 'Amel Foundation',  slug: 'amel-foundation-d2-comp-2026-summer' },
  { name: 'The Dallas Storm', slug: 'the-dallas-storm-d2-comp-2026-summer' },
  { name: 'Net Rippers',      slug: 'net-rippers-d2-comp-2026-summer' },
  { name: 'Top Class',        slug: 'top-class-d2-comp-2026-summer' },
]

// [week, date, time, home, away]
// Rules baked in:
//   NSG       → 5:05 PM every week
//   Easy Money → 5:05 PM every week  (both take the two 5:05 slots)
//   The Rich   → 4:10 PM every week
//   Lah Bros   → not the opening slot of the season (Week 1 at 3:15)
const GAMES: [number, string, string, string, string][] = [
  // ── Week 1 · May 31 ─────────────────────────────────────────────────────
  [1, '2026-05-31', '2:30 PM', 'ATX',             'Irving OGs'],
  [1, '2026-05-31', '2:30 PM', 'Baitul Ballers',  'Deloaders'],
  [1, '2026-05-31', '3:15 PM', 'Lah Bros',        'Seljuks'],
  [1, '2026-05-31', '3:15 PM', 'Amel Foundation', 'Net Rippers'],
  [1, '2026-05-31', '4:10 PM', 'Fear 1',          'Starz'],
  [1, '2026-05-31', '4:10 PM', 'Free Sudan',      'The Rich'],       // The Rich 4:10 ✓
  [1, '2026-05-31', '5:05 PM', 'Easy Money',      'NSG'],            // both at 5:05 ✓
  [1, '2026-05-31', '5:05 PM', 'The Dallas Storm','Top Class'],

  // ── Week 2 · Jun 7 ──────────────────────────────────────────────────────
  [2, '2026-06-07', '2:30 PM', 'ATX',             'Baitul Ballers'],
  [2, '2026-06-07', '2:30 PM', 'Amel Foundation', 'Deloaders'],
  [2, '2026-06-07', '3:15 PM', 'Lah Bros',        'Irving OGs'],
  [2, '2026-06-07', '3:15 PM', 'Fear 1',          'The Dallas Storm'],
  [2, '2026-06-07', '4:10 PM', 'Free Sudan',      'Seljuks'],
  [2, '2026-06-07', '4:10 PM', 'Net Rippers',     'The Rich'],       // The Rich 4:10 ✓
  [2, '2026-06-07', '5:05 PM', 'NSG',             'Starz'],          // NSG 5:05 ✓
  [2, '2026-06-07', '5:05 PM', 'Easy Money',      'Top Class'],      // Easy Money 5:05 ✓

  // ── Week 3 · Jun 14 ─────────────────────────────────────────────────────
  [3, '2026-06-14', '2:30 PM', 'ATX',             'Fear 1'],
  [3, '2026-06-14', '2:30 PM', 'Seljuks',         'Starz'],
  [3, '2026-06-14', '3:15 PM', 'Baitul Ballers',  'Irving OGs'],
  [3, '2026-06-14', '3:15 PM', 'Net Rippers',     'The Dallas Storm'],
  [3, '2026-06-14', '4:10 PM', 'Free Sudan',      'Top Class'],
  [3, '2026-06-14', '4:10 PM', 'Deloaders',       'The Rich'],       // The Rich 4:10 ✓
  [3, '2026-06-14', '5:05 PM', 'Easy Money',      'Lah Bros'],       // Easy Money 5:05 ✓
  [3, '2026-06-14', '5:05 PM', 'Amel Foundation', 'NSG'],            // NSG 5:05 ✓

  // ── Week 4 · Jun 21 ─────────────────────────────────────────────────────
  [4, '2026-06-21', '2:30 PM', 'ATX',             'The Dallas Storm'],
  [4, '2026-06-21', '2:30 PM', 'Amel Foundation', 'Starz'],
  [4, '2026-06-21', '3:15 PM', 'Baitul Ballers',  'Free Sudan'],
  [4, '2026-06-21', '3:15 PM', 'Net Rippers',     'Irving OGs'],
  [4, '2026-06-21', '4:10 PM', 'Seljuks',         'The Rich'],       // The Rich 4:10 ✓
  [4, '2026-06-21', '4:10 PM', 'Fear 1',          'Lah Bros'],
  [4, '2026-06-21', '5:05 PM', 'Deloaders',       'Easy Money'],     // Easy Money 5:05 ✓
  [4, '2026-06-21', '5:05 PM', 'NSG',             'Top Class'],      // NSG 5:05 ✓

  // ── Week 5 · Jun 28 ─────────────────────────────────────────────────────
  [5, '2026-06-28', '2:30 PM', 'ATX',             'Starz'],
  [5, '2026-06-28', '2:30 PM', 'Irving OGs',      'Seljuks'],
  [5, '2026-06-28', '3:15 PM', 'Baitul Ballers',  'Net Rippers'],
  [5, '2026-06-28', '3:15 PM', 'Deloaders',       'Fear 1'],
  [5, '2026-06-28', '4:10 PM', 'The Dallas Storm','The Rich'],       // The Rich 4:10 ✓
  [5, '2026-06-28', '4:10 PM', 'Free Sudan',      'Lah Bros'],
  [5, '2026-06-28', '5:05 PM', 'NSG',             'Top Class'],      // NSG 5:05 ✓
  [5, '2026-06-28', '5:05 PM', 'Amel Foundation', 'Easy Money'],     // Easy Money 5:05 ✓

  // ── Week 6 · Jul 5 ──────────────────────────────────────────────────────
  [6, '2026-07-05', '2:30 PM', 'Fear 1',          'Top Class'],
  [6, '2026-07-05', '2:30 PM', 'Amel Foundation', 'Irving OGs'],
  [6, '2026-07-05', '3:15 PM', 'Baitul Ballers',  'The Dallas Storm'],
  [6, '2026-07-05', '3:15 PM', 'Deloaders',       'Seljuks'],
  [6, '2026-07-05', '4:10 PM', 'Lah Bros',        'The Rich'],       // The Rich 4:10 ✓
  [6, '2026-07-05', '4:10 PM', 'Net Rippers',     'Starz'],
  [6, '2026-07-05', '5:05 PM', 'ATX',             'NSG'],            // NSG 5:05 ✓
  [6, '2026-07-05', '5:05 PM', 'Easy Money',      'Free Sudan'],     // Easy Money 5:05 ✓

  // ── Week 7 · Jul 12 ─────────────────────────────────────────────────────
  [7, '2026-07-12', '2:30 PM', 'ATX',             'Top Class'],
  [7, '2026-07-12', '2:30 PM', 'Amel Foundation', 'Fear 1'],
  [7, '2026-07-12', '3:15 PM', 'Baitul Ballers',  'Lah Bros'],
  [7, '2026-07-12', '3:15 PM', 'Free Sudan',      'Irving OGs'],
  [7, '2026-07-12', '4:10 PM', 'Starz',           'The Rich'],       // The Rich 4:10 ✓
  [7, '2026-07-12', '4:10 PM', 'The Dallas Storm','Deloaders'],
  [7, '2026-07-12', '5:05 PM', 'Easy Money',      'Seljuks'],        // Easy Money 5:05 ✓
  [7, '2026-07-12', '5:05 PM', 'Net Rippers',     'NSG'],            // NSG 5:05 ✓

  // ── Week 8 · Jul 19 ─────────────────────────────────────────────────────
  [8, '2026-07-19', '2:30 PM', 'Lah Bros',        'Top Class'],
  [8, '2026-07-19', '2:30 PM', 'Amel Foundation', 'The Dallas Storm'],
  [8, '2026-07-19', '3:15 PM', 'Baitul Ballers',  'Starz'],
  [8, '2026-07-19', '3:15 PM', 'Deloaders',       'Irving OGs'],
  [8, '2026-07-19', '4:10 PM', 'ATX',             'The Rich'],       // The Rich 4:10 ✓
  [8, '2026-07-19', '4:10 PM', 'Net Rippers',     'Seljuks'],
  [8, '2026-07-19', '5:05 PM', 'Easy Money',      'Fear 1'],         // Easy Money 5:05 ✓
  [8, '2026-07-19', '5:05 PM', 'Free Sudan',      'NSG'],            // NSG 5:05 ✓
]

async function main() {
  // 1. Delete all existing games for this season
  const deleted = await prisma.game.deleteMany({ where: { season: SEASON } })
  console.log(`Deleted ${deleted.count} existing games for "${SEASON}"`)

  // 2. Delete existing teams for this season (by slug pattern)
  const deletedTeams = await prisma.team.deleteMany({
    where: { slug: { endsWith: '-d2-comp-2026-summer' } },
  })
  console.log(`Deleted ${deletedTeams.count} existing teams`)

  // 3. Create teams fresh
  console.log('\nCreating teams …')
  const teamMap: Record<string, string> = {}
  for (const t of TEAMS) {
    const team = await prisma.team.create({
      data: { name: t.name, slug: t.slug, league: LEAGUE, color: '#4A9FE3', active: true },
    })
    teamMap[t.name] = team.id
    console.log(`  ✓ ${t.name}`)
  }

  // 4. Create games with adjusted times baked in
  console.log('\nCreating games …')
  let count = 0
  for (const [week, dateStr, time, homeName, awayName] of GAMES) {
    await prisma.game.create({
      data: {
        season: SEASON,
        league: LEAGUE,
        week,
        date: new Date(`${dateStr}T12:00:00.000Z`),
        time,
        location: LOCATION,
        homeTeamId: teamMap[homeName],
        awayTeamId: teamMap[awayName],
      },
    })
    count++
  }
  console.log(`  ✓ ${count} games created`)

  // 5. Ensure known_seasons
  const ks = await prisma.siteSetting.findUnique({ where: { key: 'known_seasons' } })
  if (ks) {
    const seasons: Array<{ season: string; league: string }> = JSON.parse(ks.value)
    if (!seasons.some(s => s.season === SEASON)) {
      await prisma.siteSetting.update({
        where: { key: 'known_seasons' },
        data: { value: JSON.stringify([...seasons, { season: SEASON, league: LEAGUE }]) },
      })
      console.log('\n✓ Added to known_seasons')
    } else {
      console.log('\n✓ known_seasons already up to date')
    }
  }

  console.log('\nDone! ✅')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
