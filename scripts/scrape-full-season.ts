/**
 * Scrape full season schedule from mystatsonline, find missing games, import them
 * Usage: TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/scrape-full-season.ts
 */

import * as https from 'https'
import * as http from 'http'
import { prisma } from '../lib/db'

const LEAGUE_ID = '65672'

// Season name -> mystatsonline season ID
const SEASONS: { name: string; league: string; msoSeasonId: string }[] = [
  { name: 'D1 2025-26 Winter', league: 'Comp', msoSeasonId: '107277' },
  { name: 'D2 2025-26 Winter', league: 'Rec',  msoSeasonId: '107276' },
]

function fetchUrl(url: string, postData?: string, extraHeaders?: Record<string, string>): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const isHttps = parsed.protocol === 'https:'
    const lib = isHttps ? https : http
    const options: https.RequestOptions = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: postData ? 'POST' : 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        ...(postData ? {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': String(Buffer.byteLength(postData)),
        } : {}),
        ...extraHeaders,
      },
      timeout: 30000,
    }
    const req = lib.request(options, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const loc = res.headers.location as string
        return resolve(fetchUrl(loc.startsWith('http') ? loc : `https://${parsed.hostname}${loc}`, undefined, extraHeaders))
      }
      let d = ''
      res.on('data', (c: Buffer) => d += c.toString())
      res.on('end', () => resolve(d))
    })
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    req.on('error', reject)
    if (postData) req.write(postData)
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
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** Extract all game IDs from a schedule HTML page */
function extractGameIds(html: string): string[] {
  const ids: string[] = []
  const re = /game_score_basket\((\d+)\)/g
  let m
  while ((m = re.exec(html)) !== null) {
    if (!ids.includes(m[1])) ids.push(m[1])
  }
  return ids
}

/** Fetch schedule page for a given MSO season ID */
async function fetchScheduleHtml(msoSeasonId: string): Promise<string> {
  const scheduleUrl = `https://www.mystatsonline.com/basket/visitor/league/schedule_scores/schedule_scores_basket.aspx?IDLeague=${LEAGUE_ID}`

  // First GET to grab VIEWSTATE
  const firstHtml = await fetchUrl(scheduleUrl)
  const vsMatch = firstHtml.match(/id="__VIEWSTATE"\s+value="([^"]*)"/)
  const vsGenMatch = firstHtml.match(/id="__VIEWSTATEGENERATOR"\s+value="([^"]*)"/)
  const evValMatch = firstHtml.match(/id="__EVENTVALIDATION"\s+value="([^"]*)"/)

  if (!vsMatch) throw new Error('Could not find __VIEWSTATE on schedule page')

  const vs = vsMatch[1]
  const vsGen = vsGenMatch ? vsGenMatch[1] : ''
  const evVal = evValMatch ? evValMatch[1] : ''

  // Find the dropdown name
  const ddMatch = firstHtml.match(/name="(ctl\d+\$ContentPlaceHolder\d+\$[^"]*ddl[^"]*)"[^>]*>/i)
    || firstHtml.match(/name="([^"]*ddl[Ss]eason[^"]*)"[^>]*>/i)
    || firstHtml.match(/name="([^"]*DDLseason[^"]*)"[^>]*>/i)

  let ddName = ''
  if (ddMatch) {
    ddName = ddMatch[1]
  } else {
    // Try to find any select with season-like options
    const selectMatch = firstHtml.match(/<select[^>]+name="([^"]+)"[^>]*>[\s\S]*?<\/select>/gi)
    if (selectMatch) {
      for (const sel of selectMatch) {
        if (sel.includes(msoSeasonId)) {
          const nm = sel.match(/name="([^"]+)"/)
          if (nm) { ddName = nm[1]; break }
        }
      }
    }
  }

  if (!ddName) {
    // Just look for any select that has our season option value
    const selRe = /<select[^>]+name="([^"]+)"[^>]*>([\s\S]*?)<\/select>/gi
    let sm
    while ((sm = selRe.exec(firstHtml)) !== null) {
      if (sm[2].includes(msoSeasonId)) { ddName = sm[1]; break }
    }
  }

  if (!ddName) throw new Error('Could not find season dropdown name')
  console.log(`  Dropdown: ${ddName}`)

  // Find any event target for the dropdown
  const etMatch = firstHtml.match(/__doPostBack\('([^']*ddl[^']*)'/)
  const eventTarget = etMatch ? etMatch[1] : ddName.replace(/\$/g, '$')

  const body = new URLSearchParams({
    '__VIEWSTATE': vs,
    '__VIEWSTATEGENERATOR': vsGen,
    '__EVENTVALIDATION': evVal,
    '__EVENTTARGET': eventTarget,
    '__EVENTARGUMENT': '',
    [ddName]: msoSeasonId,
  })

  const html = await fetchUrl(scheduleUrl, body.toString())
  return html
}

function parseBoxScore(html: string): {
  awayTeam: string; homeTeam: string; awayScore: number; homeScore: number; date: Date;
  awayStats: any[]; homeStats: any[]
} {
  let awayTeam = '', homeTeam = '', awayScore = 0, homeScore = 0
  const spans = [...html.matchAll(/<span class="mso-big mso-bold">([^<]+)<\/span>/g)]
  const ls = html.match(/pnlLeftTotal[^>]*>[\s\S]*?<strong>(\d+)<\/strong>/)
  const rs = html.match(/pnlRightTotal[^>]*>[\s\S]*?<strong>(\d+)<\/strong>/)
  if (spans.length >= 2 && ls && rs) {
    awayTeam = spans[0][1].trim(); homeTeam = spans[1][1].trim()
    awayScore = parseInt(ls[1]); homeScore = parseInt(rs[1])
  }
  let date = new Date()
  const dm = html.match(/(\w+day),?\s+(\w+\s+\d+,?\s*\d{4})/)
  if (dm) { const p = new Date(dm[2].replace(',', '')); if (!isNaN(p.getTime())) date = p }

  const tables: string[] = []
  const tbRe = /<tbody>([\s\S]*?)<\/tbody>/g; let tm
  while ((tm = tbRe.exec(html)) !== null) { if (tm[1].includes('player_details_basket')) tables.push(tm[1]) }

  function parseTable(content: string): any[] {
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

const teamCache = new Map<string, string>()
const playerCache = new Map<string, string>()

async function getTeam(name: string, league: string, season: string): Promise<string> {
  const key = `${name}:${league}`
  if (teamCache.has(key)) return teamCache.get(key)!
  let t = await prisma.team.findFirst({ where: { name, league } })
  if (!t) {
    const slug = slugify(`${name}-${season}`)
    const existing = await prisma.team.findUnique({ where: { slug } })
    t = await prisma.team.create({ data: { name, slug: existing ? `${slug}-${Date.now()}` : slug, league, color: '#4A9FE3' } })
  }
  teamCache.set(key, t.id)
  return t.id
}

async function getPlayer(name: string, teamId: string, jerseyNumber: number, position: string): Promise<string> {
  const key = `${name}:${teamId}`
  if (playerCache.has(key)) return playerCache.get(key)!
  let p = await prisma.player.findFirst({ where: { name, teamId } })
  if (!p) p = await prisma.player.create({ data: { name, number: jerseyNumber ?? 0, position: position || 'G', teamId } })
  playerCache.set(key, p.id)
  return p.id
}

async function upsertStats(gameDbId: string, awayTeamId: string, homeTeamId: string, box: ReturnType<typeof parseBoxScore>): Promise<number> {
  let count = 0
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
      const existing = await prisma.playerGameStat.findUnique({ where: { playerId_gameId: { playerId, gameId: gameDbId } } })
      if (!existing) await prisma.playerGameStat.create({ data: { playerId, gameId: gameDbId, teamId, ...statData } })
      else await prisma.playerGameStat.update({ where: { id: existing.id }, data: statData })
      count++
    }
  }
  return count
}

async function importGame(gameId: string, season: string, league: string): Promise<void> {
  const html = await fetchUrl(`https://www.mystatsonline.com/basket/visitor/league/schedule_scores/game_score_basket.aspx?IDLeague=${LEAGUE_ID}&IDGame=${gameId}`)
  const box = parseBoxScore(html)
  if (!box.awayTeam || !box.homeTeam) { console.log(`  ⚠️  ${gameId}: could not parse teams`); return }

  const awayTeamId = await getTeam(box.awayTeam, league, season)
  const homeTeamId = await getTeam(box.homeTeam, league, season)

  // Check if already in DB (date-aware to handle rematches)
  const existing = await prisma.game.findMany({ where: { homeTeamId, awayTeamId, season } })
  if (existing.some((g: any) => sameDay(new Date(g.date), box.date))) {
    console.log(`  ↻  ${gameId}: already in DB — ${box.awayTeam} @ ${box.homeTeam} ${box.date.toDateString()}`)
    return
  }

  const game = await prisma.game.create({
    data: {
      date: box.date, location: 'Irving Masjid', season, league, played: true,
      homeTeamId, awayTeamId, homeScore: box.homeScore, awayScore: box.awayScore, week: 99,
    }
  })
  const count = await upsertStats(game.id, awayTeamId, homeTeamId, box)
  console.log(`  ✅ ADDED ${gameId}: ${box.awayTeam} ${box.awayScore} @ ${box.homeTeam} ${box.homeScore} (${box.date.toDateString()}) — ${count} stats`)
}

async function main() {
  for (const { name, league, msoSeasonId } of SEASONS) {
    console.log(`\n📋 Fetching schedule for ${name} (MSO season ${msoSeasonId})...`)

    let html: string
    try {
      html = await fetchScheduleHtml(msoSeasonId)
    } catch (e: any) {
      console.log(`  ❌ Failed to fetch schedule: ${e.message}`)
      continue
    }

    const gameIds = extractGameIds(html)
    console.log(`  Found ${gameIds.length} games on MSO: ${gameIds.join(', ')}`)

    if (gameIds.length === 0) {
      console.log('  ⚠️  No game IDs found — check HTML parsing')
      continue
    }

    let imported = 0
    let skipped = 0
    for (const gameId of gameIds) {
      await new Promise(r => setTimeout(r, 400))
      const before = imported
      await importGame(gameId, name, league)
      if (imported === before) skipped++
      else imported++
    }

    console.log(`  Done: ${imported} imported, ${skipped} already in DB`)
  }

  await prisma.$disconnect()
  console.log('\n🏁 All done.')
}

main().catch(e => { console.error(e); process.exit(1) })
