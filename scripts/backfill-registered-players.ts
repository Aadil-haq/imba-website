/**
 * Backfill: add all paid registrations to their team rosters
 *
 * Usage (production):
 *   TURSO_DATABASE_URL="..." TURSO_AUTH_TOKEN="..." npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/backfill-registered-players.ts
 */
import { prisma } from '../lib/db'

async function main() {
  console.log('🏀 Backfilling registered players into team rosters...\n')

  const registrations = await prisma.registration.findMany({
    where: { paymentStatus: 'paid', teamPref: { not: null } },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`Found ${registrations.length} paid registrations with a team preference\n`)

  let added = 0, skipped = 0, noTeam = 0

  for (const reg of registrations) {
    if (!reg.teamPref) continue

    const team = await prisma.team.findFirst({
      where: { name: reg.teamPref.trim() },
      orderBy: { createdAt: 'desc' },
    })

    if (!team) {
      console.log(`  ⚠️  No team found for "${reg.teamPref}" (${reg.firstName} ${reg.lastName})`)
      noTeam++
      continue
    }

    const fullName = `${reg.firstName.trim()} ${reg.lastName.trim()}`
    const exists = await prisma.player.findFirst({ where: { name: fullName, teamId: team.id } })

    if (exists) {
      skipped++
      continue
    }

    await prisma.player.create({
      data: {
        name: fullName,
        number: parseInt(reg.jerseyNumber || '0') || 0,
        position: reg.position || 'G',
        isSub: false,
        teamId: team.id,
      },
    })

    console.log(`  ✅ ${fullName} → ${team.name}`)
    added++
  }

  console.log(`\nDone. Added: ${added}  Already existed: ${skipped}  No team match: ${noTeam}`)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
