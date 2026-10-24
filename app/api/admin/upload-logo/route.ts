import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { prisma } from '@/lib/db'
import { checkAdminAuth } from '@/lib/auth'

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

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
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Image must be under 5 MB' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() || 'png'
    const ts = Date.now()
    const { url } = await put(`logos/${teamId}-${ts}.${ext}`, file, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
    })

    await prisma.team.update({ where: { id: teamId }, data: { logo: url } })

    return NextResponse.json({ url })
  } catch (error) {
    console.error('Logo upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
