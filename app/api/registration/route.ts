import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: Request) {
  const cookie = request.headers.get('cookie') || ''
  if (!cookie.includes('imba_admin=true')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const registrations = await prisma.registration.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(registrations)
}

export async function POST(request: Request) {
  const body = await request.json()

  if (!body.firstName || !body.lastName || !body.email || !body.phone || !body.age || !body.position) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const registration = await prisma.registration.create({
    data: {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      age: parseInt(body.age),
      position: body.position,
      league: body.league || 'Rec League',
      teamPref: body.teamPref || null,
      paymentMethod: 'stripe',
      paymentStatus: 'pending',
      amount: 8000,
      season: 'Spring 2025',
    },
  })

  return NextResponse.json(registration, { status: 201 })
}
