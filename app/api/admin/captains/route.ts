import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminAuth } from '@/lib/auth'

async function ensureTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CaptainSignup" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "captainName" TEXT NOT NULL,
      "teamName" TEXT NOT NULL,
      "division" TEXT NOT NULL,
      "phone" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)
}

export async function DELETE(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await ensureTable()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await prisma.captainSignup.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

export async function PATCH(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  await ensureTable()
  const body = await request.json()
  const { id, captainName, phone, email } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const updated = await prisma.captainSignup.update({
    where: { id },
    data: {
      ...(captainName !== undefined && { captainName }),
      ...(phone      !== undefined && { phone }),
      ...(email      !== undefined && { email }),
    },
  })
  return NextResponse.json(updated)
}

export async function GET(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureTable()

  const signups = await prisma.captainSignup.findMany({
    orderBy: { createdAt: 'desc' },
  })

  const captains = signups.map(s => ({
    id: s.id,
    teamName: s.teamName,
    division: s.division,
    captainName: s.captainName,
    captainEmail: s.email,
    captainPhone: s.phone,
    createdAt: s.createdAt,
  }))

  return NextResponse.json(captains)
}
