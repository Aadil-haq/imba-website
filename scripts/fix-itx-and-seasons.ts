/**
 * Fix script:
 * 1. Remove "D2 2026 Summer" from known_seasons SiteSetting
 * 2. Fix ITX players: move Haroon Khan to correct ITX team, delete wrong-team duplicates
 */
import { createClient } from '@libsql/client'
import { prisma } from '../lib/db'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

async function main() {
  // 1. Remove "D2 2026 Summer" from known_seasons
  const ks = await prisma.siteSetting.findUnique({ where: { key: 'known_seasons' } })
  if (ks) {
    const current: Array<{ season: string; league: string }> = JSON.parse(ks.value)
    const updated = current.filter(s => s.season !== 'D2 2026 Summer')
    await prisma.siteSetting.update({
      where: { key: 'known_seasons' },
      data: { value: JSON.stringify(updated) },
    })
    console.log('✅ Removed "D2 2026 Summer" from known_seasons')
    console.log('   Now:', JSON.stringify(updated))
  }

  // 2. Move Haroon Khan from wrong ITX team to correct ITX team
  const wrongTeamId = 'cmolvnkw8000704jvmhroklh3'
  const correctTeamId = 'cmoaphmb70106lkpxtedl61sn'

  const haroon = await prisma.player.findFirst({
    where: { name: 'Haroon Khan', teamId: wrongTeamId },
  })
  if (haroon) {
    await prisma.player.update({
      where: { id: haroon.id },
      data: { teamId: correctTeamId },
    })
    console.log(`✅ Moved Haroon Khan (${haroon.id}) to correct ITX team`)
  } else {
    console.log('⚠️  Haroon Khan not found on wrong team (may already be fixed)')
  }

  // 3. Delete duplicate Mohammad Alamleh on wrong team (no stats, backfill copy)
  //    The real Mohammad Alamleh is on the correct team with historical stats
  const dupMohammad = await prisma.player.findFirst({
    where: { id: 'cmomgx5tn000ohwtilnx22pu4', teamId: wrongTeamId },
  })
  if (dupMohammad) {
    await prisma.player.delete({ where: { id: dupMohammad.id } })
    console.log(`✅ Deleted duplicate Mohammad Alamleh (${dupMohammad.id}) from wrong ITX team`)
  } else {
    console.log('⚠️  Mohammad Alamleh duplicate not found (may already be fixed)')
  }

  // 4. Delete duplicate Zayan Salahuddin on wrong team (no stats, backfill copy)
  const dupZayan = await prisma.player.findFirst({
    where: { id: 'cmomgx6ql000whwtidezkak8j', teamId: wrongTeamId },
  })
  if (dupZayan) {
    await prisma.player.delete({ where: { id: dupZayan.id } })
    console.log(`✅ Deleted duplicate Zayan Salahuddin (${dupZayan.id}) from wrong ITX team`)
  } else {
    console.log('⚠️  Zayan Salahuddin duplicate not found (may already be fixed)')
  }

  await prisma.$disconnect()
  console.log('\nDone.')
}

main().catch(e => { console.error(e); process.exit(1) })
