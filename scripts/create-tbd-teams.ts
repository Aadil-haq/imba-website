import { prisma } from '../lib/db'

async function main() {
  const teams = await prisma.team.createMany({
    data: [
      { id: 'tbd-askars-alrozzy', name: 'W: Askars vs Al Rozzy', slug: 'tbd-askars-alrozzy', color: '#888888', league: 'D2 Rec', active: false },
      { id: 'tbd-hoopers-midlife', name: 'W: Hoopers vs Mid-Life', slug: 'tbd-hoopers-midlife', color: '#888888', league: 'D2 Rec', active: false },
      { id: 'tbd-ummah-halal', name: 'W: Ummah vs Halal Hustlers', slug: 'tbd-ummah-halal', color: '#888888', league: 'D2 Rec', active: false },
      { id: 'tbd-chachos-gauchos', name: 'W: Chachos vs Gauchos', slug: 'tbd-chachos-gauchos', color: '#888888', league: 'D2 Rec', active: false },
    ],
    skipDuplicates: true,
  })
  console.log('Created:', teams.count)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e.message); process.exit(1) })
