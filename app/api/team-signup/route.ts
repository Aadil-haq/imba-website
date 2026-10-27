import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const LEAGUE = '35+ Comp'
const SEASON = '35+ 2026 Summer'

// Captain sign-up for the 35+ Comp League (bring-your-own-team)
export async function POST(request: Request) {
  // Verify secret
  const auth = request.headers.get('authorization') || ''
  const secret = process.env.ADMIN_SECRET || ''
  if (!auth.includes(secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { captainName, teamName, phone, email, season: bodySeason } = body

    if (!teamName || !captainName || !phone || !email) {
      return NextResponse.json({ error: 'teamName, captainName, phone, and email are required' }, { status: 400 })
    }

    const season = bodySeason || SEASON
    const normalizedName = teamName.trim()

    // If team already exists, activate it and refresh captain contact info
    const duplicate = await prisma.team.findFirst({ where: { name: normalizedName, league: LEAGUE } })
    if (duplicate) {
      await prisma.team.update({
        where: { id: duplicate.id },
        data: { active: true, captainName: captainName.trim(), captainEmail: email.trim(), captainPhone: phone.trim() },
      })
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
        league: LEAGUE,
        color: '#4A9FE3',
        active: true,
        captainName: captainName.trim(),
        captainEmail: email.trim(),
        captainPhone: phone.trim(),
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
        season,
      },
    })

    console.log(`Team signup: "${team.name}" (${LEAGUE}) — captain: ${captainName} — phone: ${phone} — email: ${email}`)

    return NextResponse.json({ success: true, teamId: team.id, teamName: team.name, league: LEAGUE })
  } catch (error) {
    console.error('Team signup error:', error)
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 })
  }
}
