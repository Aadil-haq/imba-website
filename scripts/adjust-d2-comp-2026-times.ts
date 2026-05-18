/**
 * Adjusts game times for D2 Comp 2026 Summer per team preferences:
 *   - NSG      → always 4:10 PM or 5:05 PM
 *   - Easy Money → always 4:10 PM or 5:05 PM
 *   - Free Sudan → Week 1 already at 4:10 PM (no change needed)
 *   - Lah Bros   → not the first slot of the season (Week 1 moved out of 2:30 PM)
 *
 * Each change is a pair-swap so the total games per slot stays at 2.
 *
 * Run with:  npx tsx scripts/adjust-d2-comp-2026-times.ts
 */
import 'dotenv/config'
import { prisma } from '../lib/db'

// Each entry swaps the `time` values of two games
const SWAPS: Array<{ idA: string; newTimeA: string; idB: string; newTimeB: string; note: string }> = [
  // ── Week 1 ──────────────────────────────────────────────────────────────
  // Lah Bros vs Seljuks 2:30 ↔ Baitul Ballers vs Deloaders 3:15
  {
    idA: 'cmpakuc33000gm4ti47i3rhnx', newTimeA: '3:15 PM',
    idB: 'cmpakuc34000im4tin5d8xfk6', newTimeB: '2:30 PM',
    note: 'W1: Lah Bros → 3:15, Baitul Ballers → 2:30',
  },
  // Easy Money vs NSG 3:15 ↔ Amel Foundation vs Net Rippers 5:05
  {
    idA: 'cmpakuc34000jm4tiw8ybblb8', newTimeA: '5:05 PM',
    idB: 'cmpakuc35000mm4tidm64u4ds', newTimeB: '3:15 PM',
    note: 'W1: Easy Money/NSG → 5:05, Amel Foundation/Net Rippers → 3:15',
  },

  // ── Week 2 ──────────────────────────────────────────────────────────────
  // NSG vs Starz 3:15 ↔ Fear 1 vs The Dallas Storm 4:10
  {
    idA: 'cmpakuc37000rm4tizt4r42vh', newTimeA: '4:10 PM',
    idB: 'cmpakuc37000sm4tid2kidjtz', newTimeB: '3:15 PM',
    note: 'W2: NSG → 4:10, Fear 1/Dallas Storm → 3:15',
  },

  // ── Week 3 ──────────────────────────────────────────────────────────────
  // Amel Foundation vs NSG 2:30 ↔ Seljuks vs Starz 4:10
  {
    idA: 'cmpakuc39000xm4ti5j2zrtbn', newTimeA: '4:10 PM',
    idB: 'cmpakuc3b0011m4tio0a2fqrn', newTimeB: '2:30 PM',
    note: 'W3: NSG → 4:10, Seljuks/Starz → 2:30',
  },

  // ── Week 4 ──────────────────────────────────────────────────────────────
  // Deloaders vs Easy Money 3:15 ↔ Net Rippers vs Irving OGs 4:10
  {
    idA: 'cmpakuc3e0017m4ti11ecnnr2', newTimeA: '4:10 PM',
    idB: 'cmpakuc3f0019m4timdtuls4p', newTimeB: '3:15 PM',
    note: 'W4: Easy Money → 4:10, Net Rippers/Irving OGs → 3:15',
  },

  // ── Week 5 ──────────────────────────────────────────────────────────────
  // Amel Foundation vs Easy Money 2:30 ↔ Irving OGs vs Seljuks 4:10
  {
    idA: 'cmpakuc3g001dm4ti77v9c61c', newTimeA: '4:10 PM',
    idB: 'cmpakuc3i001hm4tiqmcs6zj5', newTimeB: '2:30 PM',
    note: 'W5: Easy Money → 4:10, Irving OGs/Seljuks → 2:30',
  },

  // ── Week 6 ──────────────────────────────────────────────────────────────
  // ATX vs NSG 2:30 ↔ Fear 1 vs Top Class 4:10
  {
    idA: 'cmpakuc3j001km4ti4cfaq296', newTimeA: '4:10 PM',
    idB: 'cmpakuc3m001pm4tiooaldgbt', newTimeB: '2:30 PM',
    note: 'W6: NSG → 4:10, Fear 1/Top Class → 2:30',
  },

  // ── Week 7 ──────────────────────────────────────────────────────────────
  // Easy Money vs Seljuks 3:15 ↔ Free Sudan vs Irving OGs 4:10
  {
    idA: 'cmpakuc3o001vm4ti1w481dl5', newTimeA: '4:10 PM',
    idB: 'cmpakuc3o001wm4tiip6u7qu1', newTimeB: '3:15 PM',
    note: 'W7: Easy Money → 4:10, Free Sudan/Irving OGs → 3:15',
  },
]

async function main() {
  console.log('Applying time adjustments for D2 Comp 2026 Summer …\n')

  for (const swap of SWAPS) {
    await prisma.$transaction([
      prisma.game.update({ where: { id: swap.idA }, data: { time: swap.newTimeA } }),
      prisma.game.update({ where: { id: swap.idB }, data: { time: swap.newTimeB } }),
    ])
    console.log(`  ✓ ${swap.note}`)
  }

  console.log('\nDone! Verifying final schedule …\n')

  // Print final schedule for the affected teams
  const games = await prisma.game.findMany({
    where: { season: 'D2 Comp 2026 Summer' },
    include: { homeTeam: true, awayTeam: true },
    orderBy: [{ week: 'asc' }, { time: 'asc' }],
  })

  const targets = ['NSG', 'Easy Money', 'Lah Bros', 'Free Sudan']
  const relevant = games.filter(g => targets.includes(g.homeTeam.name) || targets.includes(g.awayTeam.name))

  let currentWeek = 0
  for (const g of relevant) {
    if (g.week !== currentWeek) { currentWeek = g.week; console.log(`\nWeek ${g.week}:`) }
    console.log(`  ${g.time}  ${g.homeTeam.name} vs ${g.awayTeam.name}`)
  }
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
