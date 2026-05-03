import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { prisma } from '@/lib/db'
import { checkAdminAuth } from '@/lib/auth'

export async function POST(request: Request) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const teamId = formData.get('teamId') as string

    if (!file || !teamId) {
      return NextResponse.json({ error: 'Missing file or teamId' }, { status: 400 })
    }

    const blob = await put(`logos/${teamId}-${Date.now()}.${file.name.split('.').pop()}`, file, {
      access: 'public',
    })

    await prisma.team.update({
      where: { id: teamId },
      data: { logo: blob.url },
    })

    return NextResponse.json({ url: blob.url })
  } catch (error) {
    console.error('Logo upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
