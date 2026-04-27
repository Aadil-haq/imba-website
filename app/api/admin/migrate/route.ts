import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminAuth } from '@/lib/auth'

export async function POST(request: Request) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const results: string[] = []
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Team" ADD COLUMN "logo" TEXT`); results.push('logo added') } catch (e: any) { results.push(e.message) }
    try { await prisma.$executeRawUnsafe(`ALTER TABLE "Game" ADD COLUMN "forfeit" INTEGER NOT NULL DEFAULT 0`); results.push('forfeit added') } catch (e: any) { results.push(e.message) }
    return NextResponse.json({ ok: true, results })
  } catch (e: any) {
    return NextResponse.json({ ok: true, msg: e.message })
  }
}
