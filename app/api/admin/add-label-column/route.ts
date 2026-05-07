import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminAuth } from '@/lib/auth'

export async function POST(request: Request) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    await (prisma as any).$queryRawUnsafe(`ALTER TABLE "Game" ADD COLUMN "label" TEXT`)
    return NextResponse.json({ ok: true, message: 'label column added' })
  } catch (e: any) {
    // Column may already exist
    return NextResponse.json({ ok: true, message: e.message })
  }
}
