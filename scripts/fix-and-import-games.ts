/**
 * Fix wrong game scores and import missing games
 *
 * FIXES:
 *   D2 Dec 20: STAR CLLCTV 59 @ Baja Blast 73  (game 1824589)
 *   D1 Nov 30: Irving OGs 48 @ Pool Party 52    (game 1824863)
 *   D1 Nov 30: Companions 51 @ ATX 73           (game 1824866)
 *
 * IMPORTS (missing):
 *   D1 Feb 1:  Ahad 35 @ Pool Party 87          (1847197)
 *   D1 Feb 1:  Akhi Ballers 47 @ Companions 56  (1847199)
 *   D1 Feb 1:  Baitul Ballers 33 @ ATX 72       (1847200)
 *   D1 Feb 8:  Irving OGs 54 @ Pool Party 68    (1853743)
 *   D1 Feb 8:  Companions 41 @ ATX 53           (1853744)
 *   D1 Feb 15: ATX 46 @ Pool Party 49           (1856291)
 */

import * as https from 'https'
import { prisma } from '../lib/db'

const LEAGUE_ID = '65672'

// Games to fix: overwrite scores + re-import stats
const FIXES = [
  // D1 Jan 4: ATX @ Pool Party — DB has wrong score (46-49, which is the Feb 15 finals score); actual is 46-72 per MSO
  { gameId: '1826049', season: 'D1 2025-26 Winter', league: 'Comp' },
]

// Games to add (missing entirely)
const MISSING: { gameId: string; season: string; league: string }[] = []

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const req = https.request({
      hostname: parsed.hostname, path: parsed.pathname + parsed.search, method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'Accept': 'text/html' },
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
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function parseBoxScore(html: string) {
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
        playerName, playerId, jerseyNumber,
        // Some box scores omit the position column (19 cols vs 20).
        // When 20 cols: tds[0]=pos, tds[1]=2PM, ... tds[13]=PTS, tds[16]=REB ...
        // When 19 cols: tds[0]=2PM (no position col), shift all indices by -1
        ...((): object => {
          const o = tds.length >= 20 ? 1 : 0 // offset: 1 if position col present
          return {
            position: o ? (tds[0] || 'G') : 'G',
            twoPtMade: parseInt0(tds[o]),     twoPtAtt: parseInt0(tds[o + 1]),
            threeMade: parseInt0(tds[o + 3]), threeAtt: parseInt0(tds[o + 4]),
            ftMade:    parseInt0(tds[o + 9]), ftAtt:    parseInt0(tds[o + 10]),
            points:    parseInt0(tds[o + 12]), assists: parseInt0(tds[o + 13]),
            rebounds:  parseInt0(tds[o + 15]),
            steals: tds.length > o + 16 ? parseInt0(tds[o + 16]) : 0,
            blocks: tds.length > o + 17 ? parseInt0(tds[o + 17]) : 0,
            fouls:  tds.length > o + 18 ? parseInt0(tds[o + 18]) : 0,
          }
        })(),
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

async function upsertStats(gameDbId: string, awayTeamId: string, homeTeamId: string, box: ReturnType<typeof parseBoxScore>) {
  let count = 0
  for (const { teamId, stats } of [{ teamId: awayTeamId, stats: box.awayStats }, { teamId: homeTeamId, stats: box.homeStats }]) {
    for (const ps of stats) {
      const playerId = await getPlayer(ps.playerName, teamId, ps.jerseyNumber, ps.position)
      const statData = {
        twoPtMade: ps.twoPtMade, twoPtAtt: ps.twoPtAtt,
        threeMade: ps.threeMade, threeAtt: ps.threeAtt,
        ftMade: ps.ftMade, ftAtt: ps.ftAtt,
        points: ps.points, assists: ps.assists, rebounds: ps.rebounds,
        steals: ps.steals, blocks: ps.blocks, turnovers: 0, fouls: ps.fouls ?? 0,
      }
      const existing = await prisma.playerGameStat.findUnique({ where: { playerId_gameId: { playerId, gameId: gameDbId } } })
      if (!existing) await prisma.playerGameStat.create({ data: { playerId, gameId: gameDbId, teamId, ...statData } })
      else await prisma.playerGameStat.update({ where: { id: existing.id }, data: statData })
      count++
    }
  }
  return count
}

async function fixGame(gameId: string, season: string, league: string) {
  const html = await fetchUrl(`https://www.mystatsonline.com/basket/visitor/league/schedule_scores/game_score_basket.aspx?IDLeague=${LEAGUE_ID}&IDGame=${gameId}`)
  const box = parseBoxScore(html)
  if (!box.awayTeam || !box.homeTeam) { console.log(`  ⚠️  ${gameId}: could not parse`); return }

  const awayTeamId = await getTeam(box.awayTeam, league, season)
  const homeTeamId = await getTeam(box.homeTeam, league, season)

  // Find the existing DB game by matching teams + season + roughly same date
  const candidates = await prisma.game.findMany({ where: { homeTeamId, awayTeamId, season } })
  const match = candidates.find(g => sameDay(new Date(g.date), box.date))
    ?? candidates.find(g => true) // fallback: first match if date slightly off

  if (!match) {
    console.log(`  ⚠️  ${gameId}: no existing DB record for ${box.awayTeam} @ ${box.homeTeam} on ${box.date.toDateString()} — treating as new`)
    await addGame(gameId, season, league, box, awayTeamId, homeTeamId)
    return
  }

  console.log(`  🔧 FIX ${gameId}: ${box.awayTeam} ${box.awayScore} @ ${box.homeTeam} ${box.homeScore} (${box.date.toDateString()})`)
  console.log(`       was: away=${match.awayScore} home=${match.homeScore}`)

  // Update scores
  await prisma.game.update({ where: { id: match.id }, data: { homeScore: box.homeScore, awayScore: box.awayScore, played: true } })

  // Delete old stats and reimport fresh
  await prisma.playerGameStat.deleteMany({ where: { gameId: match.id } })
  const count = await upsertStats(match.id, awayTeamId, homeTeamId, box)
  console.log(`       ✅ Fixed — ${count} stat rows reimported`)
}

async function addGame(gameId: string, season: string, league: string, box: ReturnType<typeof parseBoxScore>, awayTeamId: string, homeTeamId: string) {
  const game = await prisma.game.create({
    data: { date: box.date, location: 'Irving Masjid', season, league, played: true, homeTeamId, awayTeamId, homeScore: box.homeScore, awayScore: box.awayScore, week: 99 }
  })
  const count = await upsertStats(game.id, awayTeamId, homeTeamId, box)
  console.log(`  ✅ ADDED ${gameId}: ${box.awayTeam} ${box.awayScore} @ ${box.homeTeam} ${box.homeScore} (${box.date.toDateString()}) — ${count} stats`)
}

async function importMissing(gameId: string, season: string, league: string) {
  const html = await fetchUrl(`https://www.mystatsonline.com/basket/visitor/league/schedule_scores/game_score_basket.aspx?IDLeague=${LEAGUE_ID}&IDGame=${gameId}`)
  const box = parseBoxScore(html)
  if (!box.awayTeam || !box.homeTeam) { console.log(`  ⚠️  ${gameId}: could not parse`); return }

  const awayTeamId = await getTeam(box.awayTeam, league, season)
  const homeTeamId = await getTeam(box.homeTeam, league, season)

  // Date-aware dedup
  const existing = await prisma.game.findMany({ where: { homeTeamId, awayTeamId, season } })
  if (existing.some(g => sameDay(new Date(g.date), box.date))) {
    console.log(`  ↻  ${gameId}: already in DB — ${box.awayTeam} @ ${box.homeTeam} on ${box.date.toDateString()}`)
    return
  }

  await addGame(gameId, season, league, box, awayTeamId, homeTeamId)
}

async function main() {
  console.log('\n🔧 FIXING WRONG SCORES...')
  for (const { gameId, season, league } of FIXES) {
    await new Promise(r => setTimeout(r, 500))
    await fixGame(gameId, season, league)
  }

  console.log('\n➕ IMPORTING MISSING GAMES...')
  for (const { gameId, season, league } of MISSING) {
    await new Promise(r => setTimeout(r, 500))
    await importMissing(gameId, season, league)
  }

  await prisma.$disconnect()
  console.log('\n🏁 All done.')
}

main().catch(e => { console.error(e); process.exit(1) })
