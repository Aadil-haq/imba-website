/**
 * Import specific game IDs by date-aware dedup
 * Handles rematches where teams played twice in a season
 */
import * as https from 'https'
import { prisma } from '../lib/db'

const LEAGUE_ID = '65672'

// Game IDs confirmed to be missing from the DB
// D2 2025-26 Winter — Jan 31 + Feb 15 rematches
const MISSING_GAMES: { id: string; season: string; league: string }[] = [
  { id: '1846824', season: 'D2 2025-26 Winter', league: 'Rec' }, // Jan 31: Add Others @ TNZ
  { id: '1846823', season: 'D2 2025-26 Winter', league: 'Rec' }, // Jan 31: Salaam Squad @ Halal Hustlers
  { id: '1856290', season: 'D2 2025-26 Winter', league: 'Rec' }, // Feb 15: Swish Kebabs @ STAR CLLCTV
  { id: '1857694', season: 'D2 2025-26 Winter', league: 'Rec' }, // Feb 15: STAR CLLCTV @ Baja Blast
]

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html',
      },
      timeout: 25000,
    }, res => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const loc = res.headers.location as string
        return resolve(fetchUrl(loc.startsWith('http') ? loc : `https://${parsed.hostname}${loc}`))
      }
      let d = ''; res.on('data', (c: Buffer) => d += c.toString()); res.on('end', () => resolve(d))
    })
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    req.on('error', reject)
    req.end()
  })
}

function parseInt0(s: string): number {
  const n = parseInt((s || '').trim(), 10)
  return isNaN(n) ? 0 : n
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate()
}

function parseBoxScore(html: string) {
  let awayTeam = '', homeTeam = '', awayScore = 0, homeScore = 0

  const spanTeams = [...html.matchAll(/<span class="mso-big mso-bold">([^<]+)<\/span>/g)]
  const leftScore = html.match(/pnlLeftTotal[^>]*>[\s\S]*?<strong>(\d+)<\/strong>/)
  const rightScore = html.match(/pnlRightTotal[^>]*>[\s\S]*?<strong>(\d+)<\/strong>/)

  if (spanTeams.length >= 2 && leftScore && rightScore) {
    awayTeam = spanTeams[0][1].trim()
    homeTeam = spanTeams[1][1].trim()
    awayScore = parseInt(leftScore[1])
    homeScore = parseInt(rightScore[1])
  }

  let date = new Date()
  const dm = html.match(/(\w+day),?\s+(\w+\s+\d+,?\s*\d{4})/)
  if (dm) { const p = new Date(dm[2].replace(',', '')); if (!isNaN(p.getTime())) date = p }

  const tables: string[] = []
  const tbodyRe = /<tbody>([\s\S]*?)<\/tbody>/g; let tm
  while ((tm = tbodyRe.exec(html)) !== null) {
    if (tm[1].includes('player_details_basket')) tables.push(tm[1])
  }

  function parseTable(content: string) {
    const stats: any[] = []
    const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g; let rowM
    while ((rowM = rowRe.exec(content)) !== null) {
      const row = rowM[1]
      if (!row.includes('player_details_basket')) continue
      const pm = row.match(/player_details_basket\((\d+)\)'>([^<]+)<\/a>/)
      if (!pm) continue
      const playerId = pm[1]; const raw = pm[2].trim()
      const jm = raw.match(/^(.+?)\s+#(\d+)\s*$/)
      const playerName = jm ? jm[1].trim() : raw
      const jerseyNumber = jm ? parseInt(jm[2], 10) : 0
      const tds: string[] = []
      const tdRe = /<td[^>]*class="[^"]*text-center[^"]*"[^>]*>([\s\S]*?)<\/td>/g; let tdM
      while ((tdM = tdRe.exec(row)) !== null) tds.push(tdM[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim())
      if (tds.length < 17) continue
      stats.push({
        playerName, playerId, jerseyNumber, position: tds[0] || 'G',
        twoPtMade: parseInt0(tds[1]), twoPtAtt: parseInt0(tds[2]),
        threeMade: parseInt0(tds[4]), threeAtt: parseInt0(tds[5]),
        ftMade: parseInt0(tds[10]), ftAtt: parseInt0(tds[11]),
        points: parseInt0(tds[13]), assists: parseInt0(tds[14]),
        rebounds: parseInt0(tds[16]),
        steals: tds.length > 17 ? parseInt0(tds[17]) : 0,
        blocks: tds.length > 18 ? parseInt0(tds[18]) : 0,
      })
    }
    return stats
  }

  return {
    awayTeam, homeTeam, awayScore, homeScore, date,
    awayStats: tables[0] ? parseTable(tables[0]) : [],
    homeStats: tables[1] ? parseTable(tables[1]) : [],
  }
}

async function main() {
  const teamCache = new Map<string, string>()
  const playerCache = new Map<string, string>()

  async function getTeam(name: string, league: string, season: string): Promise<string> {
    const key = `${name}:${league}`
    if (teamCache.has(key)) return teamCache.get(key)!
    let t = await prisma.team.findFirst({ where: { name, league } })
    if (!t) {
      const slug = slugify(`${name}-${season}`)
      const existing = await prisma.team.findUnique({ where: { slug } })
      t = await prisma.team.create({
        data: { name, slug: existing ? `${slug}-${Date.now()}` : slug, league, color: '#4A9FE3' }
      })
    }
    teamCache.set(key, t.id)
    return t.id
  }

  async function getPlayer(name: string, teamId: string, jerseyNumber: number, position: string): Promise<string> {
    const key = `${name}:${teamId}`
    if (playerCache.has(key)) return playerCache.get(key)!
    let p = await prisma.player.findFirst({ where: { name, teamId } })
    if (!p) p = await prisma.player.create({ data: { name, number: jerseyNumber || 0, position: position || 'G', teamId } })
    playerCache.set(key, p.id)
    return p.id
  }

  for (const { id, season, league } of MISSING_GAMES) {
    await new Promise(r => setTimeout(r, 500))
    try {
      const html = await fetchUrl(`https://www.mystatsonline.com/basket/visitor/league/schedule_scores/game_score_basket.aspx?IDLeague=${LEAGUE_ID}&IDGame=${id}`)
      const box = parseBoxScore(html)

      if (!box.awayTeam || !box.homeTeam) {
        console.log(`⚠️  Game ${id}: could not parse teams`)
        continue
      }

      const awayTeamId = await getTeam(box.awayTeam, league, season)
      const homeTeamId = await getTeam(box.homeTeam, league, season)

      // Date-aware dedup: check if a game with these teams on this exact date already exists
      const existingGames = await prisma.game.findMany({
        where: { homeTeamId, awayTeamId, season }
      })
      const alreadyOnDate = existingGames.some(g => sameDay(new Date(g.date), box.date))

      if (alreadyOnDate) {
        console.log(`↻  already exists on ${box.date.toDateString()}: ${box.awayTeam} ${box.awayScore} @ ${box.homeTeam} ${box.homeScore}`)
        continue
      }

      // Week number: use count of existing games + 1
      const weekNum = existingGames.length + 1

      const game = await prisma.game.create({
        data: {
          date: box.date,
          location: 'Irving Masjid',
          season,
          league,
          played: true,
          homeTeamId,
          awayTeamId,
          homeScore: box.homeScore,
          awayScore: box.awayScore,
          week: weekNum,
        }
      })

      console.log(`✅ Added: ${box.awayTeam} ${box.awayScore} @ ${box.homeTeam} ${box.homeScore} (${box.date.toDateString()})`)

      // Import player stats
      let statCount = 0
      for (const { teamId, stats } of [{ teamId: awayTeamId, stats: box.awayStats }, { teamId: homeTeamId, stats: box.homeStats }]) {
        for (const ps of stats) {
          const playerId = await getPlayer(ps.playerName, teamId, ps.jerseyNumber, ps.position)
          const statData = {
            twoPtMade: ps.twoPtMade, twoPtAtt: ps.twoPtAtt,
            threeMade: ps.threeMade, threeAtt: ps.threeAtt,
            ftMade: ps.ftMade, ftAtt: ps.ftAtt,
            points: ps.points, assists: ps.assists, rebounds: ps.rebounds,
            steals: ps.steals, blocks: ps.blocks, turnovers: 0,
          }
          const existing = await prisma.playerGameStat.findUnique({ where: { playerId_gameId: { playerId, gameId: game.id } } })
          if (!existing) { await prisma.playerGameStat.create({ data: { playerId, gameId: game.id, teamId, ...statData } }); statCount++ }
        }
      }
      console.log(`   └─ ${statCount} player stat rows imported`)

    } catch (e) {
      console.error(`❌ Game ${id}: ${e}`)
    }
  }

  await prisma.$disconnect()
  console.log('\n🏁 Done.')
}

main().catch(e => { console.error(e); process.exit(1) })
