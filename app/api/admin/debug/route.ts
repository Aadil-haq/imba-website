import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const count = await prisma.game.count()
    return NextResponse.json({ ok: true, count })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message, code: error?.code, cause: String(error?.cause) }, { status: 500 })
  }
}
