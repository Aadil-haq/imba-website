/**
 * Re-scrape D4 2024 Winter — fill in missing/incorrect games and stats
 *
 * Usage:
 *   DATABASE_URL="file:./dev.db" npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/rescrape-d4-2024-winter.ts
 */
import * as https from 'https'
import { prisma } from '../lib/db'

const LEAGUE_ID = '65672'
const SEASON_ID = '101186'
const SEASON_LABEL = 'D4 2024 Winter'
const LEAGUE = '35+'

function fetchOnce(url: string, opts?: { method?: string; body?: string; headers?: Record<string, string> }): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      ...(opts?.headers ?? {}),
    }
    if (opts?.body) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
      headers['Content-Length'] = Buffer.byteLength(opts.body).toString()
    }
    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: opts?.method ?? 'GET',
      headers,
      timeout: 20000,
    }, res => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const loc = res.headers.location as string
        return resolve(fetchOnce(loc.startsWith('http') ? loc : `https://${parsed.hostname}${loc}`, opts))
      }
      let d = ''; res.on('data', (c: Buffer) => d += c.toString()); res.on('end', () => resolve(d))
    })
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    req.on('error', reject)
    if (opts?.body) req.write(opts.body)
    req.end()
  })
}

async function fetchUrl(url: string, opts?: { method?: string; body?: string; headers?: Record<string, string> }): Promise<string> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      if (attempt > 0) await sleep(Math.pow(2, attempt) * 2000)
      return await fetchOnce(url, opts)
    } catch (e) {
      if (attempt === 3) throw e
    }
  }
  throw new Error('unreachable')
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

function parseGameIds(html: string): string[] {
  const ids = new Set<string>()
  for (const m of html.matchAll(/game_score_basket\((\d+)\)/g)) ids.add(m[1])
  return Array.from(ids)
}

function parseInt0(s: string): number {
  const n = parseInt((s || '').trim(), 10)
  return isNaN(n) ? 0 : n
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

interface PS {
  playerName: string; playerId: string; jerseyNumber: number; position: string
  twoPtMade: number; twoPtAtt: number; threeMade: number; threeAtt: number
  ftMade: number; ftAtt: number; points: number; assists: number
  rebounds: number; steals: number; blocks: number
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
  } else {
    const rows = [...html.matchAll(/<td align="left" nowrap="nowrap">([\s\S]*?)<\/td>(?:<td[^>]*>[\s\S]*?<\/td>){3}<td align="center" nowrap="nowrap">(\d+)<\/td>/g)]
    if (rows.length >= 2) {
      awayTeam = rows[0][1].replace(/&nbsp;/g, '').trim()
      awayScore = parseInt(rows[0][2])
      homeTeam = rows[1][1].replace(/&nbsp;/g, '').trim()
      homeScore = parseInt(rows[1][2])
    }
  }

  let date = new Date()
  const dm = html.match(/(\w+day),?\s+(\w+\s+\d+,?\s*\d{4})/)
  if (dm) { const p = new Date(dm[2].replace(',', '')); if (!isNaN(p.getTime())) date = p }

  const tables: string[] = []
  const tbodyRe = /<tbody>([\s\S]*?)<\/tbody>/g; let tm
  while ((tm = tbodyRe.exec(html)) !== null) {
    if (tm[1].includes('player_details_basket')) tables.push(tm[1])
  }

  function parseTable(content: string): PS[] {
    const stats: PS[] = []
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
  console.log(`🏀 Re-scraping ${SEASON_LABEL} (season ID ${SEASON_ID})...\n`)

  // Get game IDs via ASP.NET POST season switch
  const schedUrl = `https://www.mystatsonline.com/basket/visitor/league/schedule_scores/schedule.aspx?IDLeague=${LEAGUE_ID}`
  const baseHtml = await fetchUrl(schedUrl)
  const vsM = baseHtml.match(/name="__VIEWSTATE"[^>]*value="([^"]*)"/)
  const vsgM = baseHtml.match(/name="__VIEWSTATEGENERATOR"[^>]*value="([^"]*)"/)
  const evM = baseHtml.match(/name="__EVENTVALIDATION"[^>]*value="([^"]*)"/)

  const params = new URLSearchParams({
    '__EVENTTARGET': 'ctl00$maintitle$ddlSeason',
    '__EVENTARGUMENT': '',
    '__VIEWSTATE': vsM ? vsM[1] : '',
    '__VIEWSTATEGENERATOR': vsgM ? vsgM[1] : '',
    '__EVENTVALIDATION': evM ? evM[1] : '',
    'ctl00$maintitle$ddlSeason': SEASON_ID,
    'ctl00$maincontent$ddlMonth': '0',
    'ctl00$maincontent$ddlStatus': '-1',
    'ctl00$maincontent$ddlLocation': '0',
    'ctl00$maincontent$ddlTeam': '',
  })

  const schedHtml = await fetchUrl(schedUrl, {
    method: 'POST', body: params.toString(),
    headers: { Referer: schedUrl, Origin: 'https://www.mystatsonline.com' },
  })

  const allGameIds = parseGameIds(schedHtml)
  console.log(`Found ${allGameIds.length} game IDs on MyStatsOnline`)

  const existingCount = await prisma.game.count({ where: { season: SEASON_LABEL } })
  console.log(`Currently ${existingCount} games in DB for ${SEASON_LABEL}`)

  // Wipe existing D4 2024 Winter data so we can reimport clean
  if (existingCount > 0) {
    const existingGames = await prisma.game.findMany({ where: { season: SEASON_LABEL }, select: { id: true } })
    const gameIds = existingGames.map(g => g.id)
    await prisma.playerGameStat.deleteMany({ where: { gameId: { in: gameIds } } })
    await prisma.game.deleteMany({ where: { season: SEASON_LABEL } })
    console.log(`Deleted ${existingCount} old games and their stats\n`)
  }

  const teamCache = new Map<string, string>()
  const playerCache = new Map<string, string>()

  async function getTeam(name: string): Promise<string> {
    if (teamCache.has(name)) return teamCache.get(name)!
    let t = await prisma.team.findFirst({ where: { name, league: LEAGUE } })
    if (!t) {
      const slug = slugify(`${name}-d4-2024-winter`)
      const existing = await prisma.team.findUnique({ where: { slug } })
      t = await prisma.team.create({
        data: { name, slug: existing ? `${slug}-${Date.now()}` : slug, league: LEAGUE, color: '#4A9FE3' }
      })
      console.log(`  + Created team: ${name}`)
    }
    teamCache.set(name, t.id)
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

  let added = 0, errors = 0
  for (let i = 0; i < allGameIds.length; i++) {
    const gameId = allGameIds[i]
    await sleep(400)
    try {
      const html = await fetchUrl(
        `https://www.mystatsonline.com/basket/visitor/league/schedule_scores/game_score_basket.aspx?IDLeague=${LEAGUE_ID}&IDGame=${gameId}`
      )
      const box = parseBoxScore(html)

      if (!box.awayTeam || !box.homeTeam) {
        console.log(`  ⚠️  Game ${gameId}: teams not found — skipping`)
        continue
      }

      const awayTeamId = await getTeam(box.awayTeam)
      const homeTeamId = await getTeam(box.homeTeam)

      const game = await prisma.game.create({
        data: {
          date: box.date, location: 'Irving Masjid', season: SEASON_LABEL,
          league: LEAGUE, played: true, homeTeamId, awayTeamId,
          homeScore: box.homeScore, awayScore: box.awayScore, week: i + 1,
        }
      })
      added++

      for (const { teamId, stats } of [{ teamId: awayTeamId, stats: box.awayStats }, { teamId: homeTeamId, stats: box.homeStats }]) {
        for (const ps of stats) {
          const playerId = await getPlayer(ps.playerName, teamId, ps.jerseyNumber, ps.position)
          const statData = {
            twoPtMade: ps.twoPtMade, twoPtAtt: ps.twoPtAtt,
            threeMade: ps.threeMade, threeAtt: ps.threeAtt,
            ftMade: ps.ftMade, ftAtt: ps.ftAtt,
            points: ps.points, assists: ps.assists,
            rebounds: ps.rebounds, steals: ps.steals, blocks: ps.blocks, turnovers: 0,
          }
          await prisma.playerGameStat.create({ data: { playerId, gameId: game.id, teamId, ...statData } })
        }
      }

      const total = box.awayStats.length + box.homeStats.length
      console.log(`  [${i + 1}/${allGameIds.length}] ${box.awayTeam} ${box.awayScore} @ ${box.homeTeam} ${box.homeScore} — ${total} players`)
    } catch (e) {
      console.error(`  ❌ Game ${gameId}: ${e}`)
      errors++
    }
  }

  const finalCount = await prisma.game.count({ where: { season: SEASON_LABEL } })
  console.log(`\n✅ Done. ${finalCount} total games for ${SEASON_LABEL}`)
  console.log(`   Added: ${added}  Errors: ${errors}`)
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
