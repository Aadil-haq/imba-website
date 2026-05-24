/**
 * Adjusts game times for D2 Comp 2026 Summer per team preferences.
 * Looks up games by week + team names so it works on any DB (local or prod).
 *
 * Run with:  npx tsx scripts/adjust-d2-comp-2026-times.ts
 */
import 'dotenv/config'
import { prisma } from '../lib/db'

const SEASON = 'D2 Comp 2026 Summer'

// Each swap: find two games by (week, home, away) and exchange their times
const SWAPS: Array<{
  a: { week: number; home: string; away: string; newTime: string }
  b: { week: number; home: string; away: string; newTime: string }
  note: string
}> = [
  // ── Week 1 ──────────────────────────────────────────────────────────────
  // Lah Bros 2:30 → 3:15, Baitul Ballers 3:15 → 2:30
  {
    a: { week: 1, home: 'Lah Bros', away: 'Seljuks', newTime: '3:15 PM' },
    b: { week: 1, home: 'Baitul Ballers', away: 'Deloaders', newTime: '2:30 PM' },
    note: 'W1: Lah Bros → 3:15, Baitul Ballers → 2:30',
  },
  // Easy Money/NSG 3:15 → 5:05, Amel Foundation/Net Rippers 5:05 → 3:15
  {
    a: { week: 1, home: 'Easy Money', away: 'NSG', newTime: '5:05 PM' },
    b: { week: 1, home: 'Amel Foundation', away: 'Net Rippers', newTime: '3:15 PM' },
    note: 'W1: Easy Money/NSG → 5:05, Amel Foundation/Net Rippers → 3:15',
  },

  // ── Week 2 ──────────────────────────────────────────────────────────────
  // NSG 3:15 → 4:10, Fear 1/Dallas Storm 4:10 → 3:15
  {
    a: { week: 2, home: 'NSG', away: 'Starz', newTime: '4:10 PM' },
    b: { week: 2, home: 'Fear 1', away: 'The Dallas Storm', newTime: '3:15 PM' },
    note: 'W2: NSG → 4:10, Fear 1/Dallas Storm → 3:15',
  },

  // ── Week 3 ──────────────────────────────────────────────────────────────
  // NSG 2:30 → 4:10, Seljuks/Starz 4:10 → 2:30
  {
    a: { week: 3, home: 'Amel Foundation', away: 'NSG', newTime: '4:10 PM' },
    b: { week: 3, home: 'Seljuks', away: 'Starz', newTime: '2:30 PM' },
    note: 'W3: NSG → 4:10, Seljuks/Starz → 2:30',
  },

  // ── Week 4 ──────────────────────────────────────────────────────────────
  // Easy Money 3:15 → 4:10, Net Rippers/Irving OGs 4:10 → 3:15
  {
    a: { week: 4, home: 'Deloaders', away: 'Easy Money', newTime: '4:10 PM' },
    b: { week: 4, home: 'Net Rippers', away: 'Irving OGs', newTime: '3:15 PM' },
    note: 'W4: Easy Money → 4:10, Net Rippers/Irving OGs → 3:15',
  },

  // ── Week 5 ──────────────────────────────────────────────────────────────
  // Easy Money 2:30 → 4:10, Irving OGs/Seljuks 4:10 → 2:30
  {
    a: { week: 5, home: 'Amel Foundation', away: 'Easy Money', newTime: '4:10 PM' },
    b: { week: 5, home: 'Irving OGs', away: 'Seljuks', newTime: '2:30 PM' },
    note: 'W5: Easy Money → 4:10, Irving OGs/Seljuks → 2:30',
  },

  // ── Week 6 ──────────────────────────────────────────────────────────────
  // NSG 2:30 → 4:10, Fear 1/Top Class 4:10 → 2:30
  {
    a: { week: 6, home: 'ATX', away: 'NSG', newTime: '4:10 PM' },
    b: { week: 6, home: 'Fear 1', away: 'Top Class', newTime: '2:30 PM' },
    note: 'W6: NSG → 4:10, Fear 1/Top Class → 2:30',
  },

  // ── Week 7 ──────────────────────────────────────────────────────────────
  // Easy Money 3:15 → 4:10, Free Sudan/Irving OGs 4:10 → 3:15
  {
    a: { week: 7, home: 'Easy Money', away: 'Seljuks', newTime: '4:10 PM' },
    b: { week: 7, home: 'Free Sudan', away: 'Irving OGs', newTime: '3:15 PM' },
    note: 'W7: Easy Money → 4:10, Free Sudan/Irving OGs → 3:15',
  },
]

async function findGame(week: number, homeName: string, awayName: string) {
  const teams = await prisma.team.findMany({
    where: { name: { in: [homeName, awayName] }, season: undefined },
    select: { id: true, name: true },
  })
  // Find teams that belong to this season's games
  const game = await prisma.game.findFirst({
    where: {
      season: SEASON,
      week,
      homeTeam: { name: homeName },
      awayTeam: { name: awayName },
    },
    include: { homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } } },
  })
  if (!game) throw new Error(`Game not found: W${week} ${homeName} vs ${awayName}`)
  return game
}

async function main() {
  console.log(`Applying time adjustments to ${SEASON} …\n`)

  for (const swap of SWAPS) {
    const gameA = await findGame(swap.a.week, swap.a.home, swap.a.away)
    const gameB = await findGame(swap.b.week, swap.b.home, swap.b.away)

    await prisma.$transaction([
      prisma.game.update({ where: { id: gameA.id }, data: { time: swap.a.newTime } }),
      prisma.game.update({ where: { id: gameB.id }, data: { time: swap.b.newTime } }),
    ])
    console.log(`  ✓ ${swap.note}`)
  }

  console.log('\nDone! Final times for affected teams:\n')

  const games = await prisma.game.findMany({
    where: { season: SEASON },
    include: { homeTeam: true, awayTeam: true },
    orderBy: [{ week: 'asc' }, { time: 'asc' }],
  })

  const targets = ['NSG', 'Easy Money', 'Lah Bros', 'Free Sudan']
  const relevant = games.filter(g => targets.includes(g.homeTeam.name) || targets.includes(g.awayTeam.name))

  let currentWeek = 0
  for (const g of relevant) {
    if (g.week !== currentWeek) { currentWeek = g.week; console.log(`  Week ${g.week}:`) }
    console.log(`    ${g.time}  ${g.homeTeam.name} vs ${g.awayTeam.name}`)
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
