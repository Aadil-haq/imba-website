import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// Called by Google Apps Script when a captain submits the form
export async function POST(request: Request) {
  // Verify secret
  const auth = request.headers.get('authorization') || ''
  const secret = process.env.ADMIN_SECRET || ''
  if (!auth.includes(secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { division, captainName, teamName, phone, season: bodySeason } = body

    if (!teamName || !captainName) {
      return NextResponse.json({ error: 'teamName and captainName are required' }, { status: 400 })
    }

    // Map Google Form division label → DB league value
    const league = division?.toLowerCase().includes('comp') ? 'Comp' : 'Rec'
    const season = bodySeason || 'D2 2026 Summer'

    const normalizedName = teamName.trim()

    // If team already exists, activate it and return
    const duplicate = await prisma.team.findFirst({ where: { name: normalizedName, league } })
    if (duplicate) {
      await prisma.team.update({ where: { id: duplicate.id }, data: { active: true } })
      console.log(`Team signup: "${normalizedName}" already exists — activated`)
      return NextResponse.json({ success: true, skipped: true, teamId: duplicate.id })
    }

    // Build a unique slug
    const baseSlug = slugify(normalizedName)
    const existingSlug = await prisma.team.findUnique({ where: { slug: baseSlug } })
    const slug = existingSlug ? `${baseSlug}-${Date.now()}` : baseSlug

    // Create the team as active
    const team = await prisma.team.create({
      data: {
        name: normalizedName,
        slug,
        league,
        color: '#4A9FE3',
        active: true,
      },
    })

    // Create the captain as a player on the team
    await prisma.player.create({
      data: {
        name: captainName.trim(),
        number: 0,
        position: 'G',
        isSub: false,
        teamId: team.id,
      },
    })

    console.log(`Team signup: "${team.name}" (${league}) — captain: ${captainName} — phone: ${phone}`)

    return NextResponse.json({ success: true, teamId: team.id, teamName: team.name, league })
  } catch (error) {
    console.error('Team signup error:', error)
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 })
  }
}
