import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

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

export async function GET() {
  try {
    await ensureTable()
    const signups = await prisma.captainSignup.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, teamName: true, division: true, captainName: true },
    })
    return NextResponse.json(signups)
  } catch (error) {
    console.error('GET captain-signup error:', error)
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    await ensureTable()
    const body = await request.json()
    const { captainName, teamName, division, phone, email } = body

    if (!captainName || !teamName || !division || !phone || !email) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    const signup = await prisma.captainSignup.create({
      data: { captainName, teamName, division, phone, email },
    })

    return NextResponse.json(signup, { status: 201 })
  } catch (error) {
    console.error('POST captain-signup error:', error)
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 })
  }
}
