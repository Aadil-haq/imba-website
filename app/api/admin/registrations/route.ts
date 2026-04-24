import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminAuth } from '@/lib/auth'

export async function GET(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const registrations = await prisma.registration.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(registrations)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await request.json()
    const reg = await prisma.registration.update({
      where: { id: body.id },
      data: { paymentStatus: body.paymentStatus },
    })
    return NextResponse.json(reg)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update registration' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    await prisma.registration.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete registration' }, { status: 500 })
  }
}
