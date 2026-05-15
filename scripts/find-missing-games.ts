/**
 * Scan game ID ranges near known games to find any missing IMBA games
 * Then import the ones not already in DB
 */

import * as https from 'https'
import { prisma } from '../lib/db'

const LEAGUE_ID = '65672'

// Known game ID ranges to probe (center ± window)
// Based on known game IDs per date
const SCAN_RANGES = [
  // Nov 30 range: known IDs 1824863, 1824866 — scan wider
  { center: 1824860, window: 100, label: 'Nov 30 range' },
  // Dec range: D2 game 1824589, maybe D1 games nearby
  { center: 1824589, window: 50, label: 'Dec range' },
  // Jan 18 range: known ID 1826056
  { center: 1826056, window: 80, label: 'Jan 18 range' },
  // Around 1830000-1845000 — unknown, might be Dec/Jan games
  { center: 1835000, window: 200, label: 'Dec/Jan gap 1' },
  { center: 1840000, window: 200, label: 'Dec/Jan gap 2' },
  // Feb 1 range: known IDs 1847197, 1847199, 1847200
  { center: 1847200, window: 30, label: 'Feb 1 range' },
  // Feb 8 range: known IDs 1853743, 1853744
  { center: 1853744, window: 30, label: 'Feb 8 range' },
  // Feb 15 range: known ID 1856291, D2 games also here
  { center: 1856291, window: 30, label: 'Feb 15 range' },
  // After Feb 15 — playoffs?
  { center: 1858000, window: 100, label: 'Post Feb 15' },
  { center: 1860000, window: 100, label: 'Post Feb 15 b' },
]

// Known IMBA team names (to filter out other leagues)
const IMBA_TEAMS = new Set([
  'Pool Party', 'ATX', 'Companions', 'Irving OGs', 'Ahad', 'Akhi Ballers', 'Baitul Ballers',
  'Baja Blast', 'STAR CLLCTV', 'Swish Kebabs', 'The Rich', 'AMB', 'Ahbab',
])

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const req = https.request({
      hostname: parsed.hostname, path: parsed.pathname + parsed.search, method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
      timeout: 15000,
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

function quickParse(html: string): { awayTeam: string; homeTeam: string; awayScore: number; homeScore: number; date: Date } | null {
  const spans = [...html.matchAll(/<span class="mso-big mso-bold">([^<]+)<\/span>/g)]
  const ls = html.match(/pnlLeftTotal[^>]*>[\s\S]*?<strong>(\d+)<\/strong>/)
  const rs = html.match(/pnlRightTotal[^>]*>[\s\S]*?<strong>(\d+)<\/strong>/)
  if (spans.length < 2 || !ls || !rs) return null
  const awayTeam = spans[0][1].trim()
  const homeTeam = spans[1][1].trim()
  const awayScore = parseInt(ls[1])
  const homeScore = parseInt(rs[1])
  let date = new Date()
  const dm = html.match(/(\w+day),?\s+(\w+\s+\d+,?\s*\d{4})/)
  if (dm) { const p = new Date(dm[2].replace(',', '')); if (!isNaN(p.getTime())) date = p }
  return { awayTeam, homeTeam, awayScore, homeScore, date }
}

function parseBoxScore(html: string) {
  const base = quickParse(html)
  if (!base) return null

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
    ...base,
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

async function upsertStats(gameDbId: string, awayTeamId: string, homeTeamId: string, box: NonNullable<ReturnType<typeof parseBoxScore>>): Promise<number> {
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

async function tryImportGame(gameId: number, knownGameIds: Set<number>): Promise<'imba' | 'other' | 'invalid'> {
  if (knownGameIds.has(gameId)) return 'imba' // already scanned

  let html: string
  try {
    html = await fetchUrl(`https://www.mystatsonline.com/basket/visitor/league/schedule_scores/game_score_basket.aspx?IDLeague=${LEAGUE_ID}&IDGame=${gameId}`)
  } catch {
    return 'invalid'
  }

  const parsed = quickParse(html)
  if (!parsed || !parsed.awayTeam) return 'invalid'

  // Check if it's an IMBA team
  if (!IMBA_TEAMS.has(parsed.awayTeam) && !IMBA_TEAMS.has(parsed.homeTeam)) return 'other'

  // Determine league based on teams
  const d2Teams = new Set(['Baja Blast', 'STAR CLLCTV', 'Swish Kebabs', 'The Rich'])
  const isD2 = d2Teams.has(parsed.awayTeam) || d2Teams.has(parsed.homeTeam)
  const league = isD2 ? 'Rec' : 'Comp'
  const season = isD2 ? 'D2 2025-26 Winter' : 'D1 2025-26 Winter'

  console.log(`  🏀 ${gameId}: ${parsed.awayTeam} ${parsed.awayScore} @ ${parsed.homeTeam} ${parsed.homeScore} (${parsed.date.toDateString()}) [${season}]`)

  // Check if already in DB
  const awayTeamId = await getTeam(parsed.awayTeam, league, season)
  const homeTeamId = await getTeam(parsed.homeTeam, league, season)
  const existing = await prisma.game.findMany({ where: { homeTeamId, awayTeamId, season } })
  if (existing.some((g: any) => sameDay(new Date(g.date), parsed.date))) {
    console.log(`    ↻  Already in DB`)
    return 'imba'
  }

  // Import it
  const box = parseBoxScore(html)
  if (!box) { console.log(`    ⚠️  Could not parse box score`); return 'imba' }

  const game = await prisma.game.create({
    data: {
      date: box.date, location: 'Irving Masjid', season, league, played: true,
      homeTeamId, awayTeamId, homeScore: box.homeScore, awayScore: box.awayScore, week: 99,
    }
  })
  const count = await upsertStats(game.id, awayTeamId, homeTeamId, box)
  console.log(`    ✅ IMPORTED — ${count} stat rows`)
  return 'imba'
}

async function main() {
  // Build set of already-scanned IDs to avoid duplicates across ranges
  const scanned = new Set<number>()

  for (const { center, window: w, label } of SCAN_RANGES) {
    console.log(`\n🔍 Scanning ${label} (${center - w} – ${center + w})...`)
    let found = 0
    for (let id = center - w; id <= center + w; id++) {
      if (scanned.has(id)) continue
      scanned.add(id)
      await new Promise(r => setTimeout(r, 150)) // rate limit
      const result = await tryImportGame(id, new Set())
      if (result === 'imba') found++
    }
    console.log(`  → Found ${found} IMBA games in this range`)
  }

  await prisma.$disconnect()
  console.log('\n🏁 Done.')
}

main().catch(e => { console.error(e); process.exit(1) })
