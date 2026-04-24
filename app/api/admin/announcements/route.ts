import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(announcements)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { title, body: text, league } = body
  if (!title?.trim() || !text?.trim()) {
    return NextResponse.json({ error: 'Title and body required' }, { status: 400 })
  }
  const announcement = await prisma.announcement.create({
    data: { title: title.trim(), body: text.trim(), league: league || 'All' },
  })
  return NextResponse.json(announcement, { status: 201 })
}

export async function PATCH(request: Request) {
  const body = await request.json()
  const { id, title, body: text, league } = body
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  const announcement = await prisma.announcement.update({
    where: { id },
    data: {
      ...(title && { title: title.trim() }),
      ...(text && { body: text.trim() }),
      ...(league && { league }),
    },
  })
  return NextResponse.json(announcement)
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  await prisma.announcement.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
