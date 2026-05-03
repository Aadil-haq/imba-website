import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkAdminAuth } from '@/lib/auth'

const HH_TEAM_ID = 'cmoaod9vf00e8lkpx34075voy' // Halal Hustlers
const BB_TEAM_ID = 'cmoapindq016ulkpx2km26l69'  // Barakah Ballers

// Stats from mystatsonline game 1773450 — Aug 10, 2025
// Halal Hustlers 63, Barakah Ballers 51
const hhStats: Record<string, { twoPtMade: number; threeMade: number; ftMade: number; points: number; assists: number; rebounds: number; steals: number; blocks: number; fouls: number }> = {
  'Adeel Zubair':    { twoPtMade: 1, threeMade: 0, ftMade: 4, points: 6,  assists: 2, rebounds: 1,  steals: 0, blocks: 0, fouls: 0 },
  'Bishr Aboobaker': { twoPtMade: 1, threeMade: 0, ftMade: 0, points: 2,  assists: 0, rebounds: 0,  steals: 0, blocks: 0, fouls: 0 },
  'Luqman Ahmed':    { twoPtMade: 0, threeMade: 1, ftMade: 0, points: 3,  assists: 0, rebounds: 1,  steals: 1, blocks: 0, fouls: 3 },
  'Mohammed Badawi': { twoPtMade: 0, threeMade: 0, ftMade: 0, points: 0,  assists: 0, rebounds: 1,  steals: 0, blocks: 0, fouls: 0 },
  'Saad Riaz':       { twoPtMade: 4, threeMade: 1, ftMade: 4, points: 15, assists: 1, rebounds: 1,  steals: 1, blocks: 0, fouls: 1 },
  'Soleman Zazay':   { twoPtMade: 1, threeMade: 5, ftMade: 0, points: 17, assists: 5, rebounds: 6,  steals: 0, blocks: 1, fouls: 2 },
  'Taariq Ali':      { twoPtMade: 0, threeMade: 0, ftMade: 0, points: 0,  assists: 1, rebounds: 0,  steals: 0, blocks: 0, fouls: 1 },
  'William Allen':   { twoPtMade: 3, threeMade: 0, ftMade: 0, points: 6,  assists: 8, rebounds: 6,  steals: 3, blocks: 1, fouls: 1 },
  'Yousef Akil':     { twoPtMade: 5, threeMade: 1, ftMade: 1, points: 14, assists: 0, rebounds: 15, steals: 4, blocks: 0, fouls: 1 },
}

const bbStats: Record<string, { twoPtMade: number; threeMade: number; ftMade: number; points: number; assists: number; rebounds: number; steals: number; blocks: number; fouls: number }> = {
  'Asad Abdulla':    { twoPtMade: 1, threeMade: 1, ftMade: 0, points: 5,  assists: 0, rebounds: 5,  steals: 1, blocks: 0, fouls: 2 },
  'Ayub Ahmed':      { twoPtMade: 0, threeMade: 2, ftMade: 0, points: 6,  assists: 1, rebounds: 2,  steals: 2, blocks: 0, fouls: 4 },
  'Faiz Aye':        { twoPtMade: 1, threeMade: 1, ftMade: 0, points: 5,  assists: 1, rebounds: 3,  steals: 2, blocks: 0, fouls: 1 },
  'Hamdi Hmimy':     { twoPtMade: 2, threeMade: 3, ftMade: 2, points: 15, assists: 2, rebounds: 5,  steals: 0, blocks: 0, fouls: 2 },
  'Ibrahim Hussein': { twoPtMade: 2, threeMade: 0, ftMade: 0, points: 4,  assists: 1, rebounds: 4,  steals: 0, blocks: 0, fouls: 3 },
  'Liban Mohamud':   { twoPtMade: 2, threeMade: 0, ftMade: 1, points: 5,  assists: 3, rebounds: 4,  steals: 0, blocks: 0, fouls: 1 },
  'Mohamed Mohamud': { twoPtMade: 1, threeMade: 1, ftMade: 0, points: 5,  assists: 0, rebounds: 0,  steals: 0, blocks: 0, fouls: 0 },
  'Mohamed Sow':     { twoPtMade: 3, threeMade: 0, ftMade: 0, points: 6,  assists: 3, rebounds: 8,  steals: 0, blocks: 0, fouls: 1 },
}

export async function POST(request: Request) {
  if (!checkAdminAuth(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const results: string[] = []

  // 1. Find or create the game
  let game = await prisma.game.findFirst({
    where: {
      homeTeamId: HH_TEAM_ID,
      awayTeamId: BB_TEAM_ID,
      date: { gte: new Date('2025-08-10T00:00:00Z'), lt: new Date('2025-08-11T00:00:00Z') },
    },
  })

  if (!game) {
    game = await prisma.game.create({
      data: {
        season: 'D2 2025 Summer',
        week: 96,
        date: new Date('2025-08-10T17:15:00Z'),
        time: '5:15 PM',
        location: 'Irving Masjid Gym',
        league: 'Rec',
        homeTeamId: HH_TEAM_ID,
        awayTeamId: BB_TEAM_ID,
        homeScore: 63,
        awayScore: 51,
        played: true,
      },
    })
    results.push(`Created game: ${game.id}`)
  } else {
    // Update score if not set
    if (!game.played) {
      await prisma.game.update({
        where: { id: game.id },
        data: { homeScore: 63, awayScore: 51, played: true },
      })
    }
    results.push(`Found existing game: ${game.id}`)
  }

  // 2. Check if stats already exist
  const existingStats = await prisma.playerGameStat.count({ where: { gameId: game.id } })
  if (existingStats > 0) {
    results.push(`Stats already exist (${existingStats} records) — skipping`)
    return NextResponse.json({ ok: true, results })
  }

  // 3. Look up players by name on each team
  const hhPlayers = await prisma.player.findMany({ where: { teamId: HH_TEAM_ID }, select: { id: true, name: true } })
  const bbPlayers = await prisma.player.findMany({ where: { teamId: BB_TEAM_ID }, select: { id: true, name: true } })

  const norm = (s: string) => s.trim().toLowerCase()
  const hhMap = Object.fromEntries(hhPlayers.map(p => [norm(p.name), p.id]))
  const bbMap = Object.fromEntries(bbPlayers.map(p => [norm(p.name), p.id]))

  const statsToCreate: any[] = []

  for (const [name, s] of Object.entries(hhStats)) {
    const playerId = hhMap[norm(name)]
    if (!playerId) { results.push(`⚠ HH player not found: ${name}`); continue }
    statsToCreate.push({
      gameId: game.id, teamId: HH_TEAM_ID, playerId,
      twoPtMade: s.twoPtMade, twoPtAtt: s.twoPtMade,
      threeMade: s.threeMade, threeAtt: s.threeMade,
      ftMade: s.ftMade, ftAtt: s.ftMade,
      points: s.points, assists: s.assists, rebounds: s.rebounds,
      steals: s.steals, blocks: s.blocks, fouls: s.fouls,
      turnovers: 0,
    })
  }

  for (const [name, s] of Object.entries(bbStats)) {
    const playerId = bbMap[norm(name)]
    if (!playerId) { results.push(`⚠ BB player not found: ${name}`); continue }
    statsToCreate.push({
      gameId: game.id, teamId: BB_TEAM_ID, playerId,
      twoPtMade: s.twoPtMade, twoPtAtt: s.twoPtMade,
      threeMade: s.threeMade, threeAtt: s.threeMade,
      ftMade: s.ftMade, ftAtt: s.ftMade,
      points: s.points, assists: s.assists, rebounds: s.rebounds,
      steals: s.steals, blocks: s.blocks, fouls: s.fouls,
      turnovers: 0,
    })
  }

  if (statsToCreate.length > 0) {
    await (prisma.playerGameStat.createMany as any)({ data: statsToCreate, skipDuplicates: true })
    results.push(`Created ${statsToCreate.length} stat records`)
  }

  return NextResponse.json({ ok: true, gameId: game.id, results })
}
