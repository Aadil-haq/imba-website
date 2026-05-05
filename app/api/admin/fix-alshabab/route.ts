import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminAuth } from '@/lib/auth'

export async function POST(request: Request) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const results: string[] = []

  // Find Al Shabab team
  const alShabab = await prisma.team.findFirst({ where: { name: { contains: 'Al Shabab' } } })
  if (!alShabab) return NextResponse.json({ error: 'Al Shabab team not found' }, { status: 404 })
  results.push(`Found Al Shabab: ${alShabab.id}`)

  // Find Starz team
  const starz = await prisma.team.findFirst({ where: { name: { contains: 'Starz' } } })
  if (!starz) return NextResponse.json({ error: 'Starz team not found' }, { status: 404 })
  results.push(`Found Starz: ${starz.id}`)

  // Find all players on Al Shabab (with or without season tag)
  const players = await prisma.player.findMany({
    where: { teamId: alShabab.id, isSub: false },
  })
  results.push(`Players on Al Shabab: ${players.map(p => p.name).join(', ')}`)

  // Move them to Starz
  for (const p of players) {
    await prisma.player.update({ where: { id: p.id }, data: { teamId: starz.id } })
    results.push(`Moved ${p.name} → Starz`)
  }

  // Update registrations so re-rostering stays on Starz
  const regUpdate = await prisma.registration.updateMany({
    where: { teamPref: alShabab.name },
    data: { teamPref: starz.name },
  })
  results.push(`Updated ${regUpdate.count} registration(s) teamPref → Starz`)

  return NextResponse.json({ ok: true, results })
}
