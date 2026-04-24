/**
 * IMBA Stats Re-Audit Script
 * Re-scrapes ALL game box scores from MyStatsOnline and corrects the database.
 *
 * - Does NOT delete teams, players, or manually-entered sub stats
 * - For each game: deletes stat rows for non-sub players, then re-inserts fresh data
 * - Fixes missing player stats AND incorrect values
 * - Updates game scores to match MyStatsOnline
 *
 * Run:
 *   DATABASE_URL="file:./dev.db" npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/reaudit-stats.ts
 *
 * To target a single season only:
 *   DATABASE_URL="file:./dev.db" npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/reaudit-stats.ts --season "D1 2025-26 Winter"
 */

import * as https from 'https'
import * as http from 'http'
import { prisma } from '../lib/db'

const SEASONS = [
  { id: '107277', name: 'D1 2025-26 Winter',          league: 'Comp',  label: 'D1 2025-26 Winter' },
  { id: '107276', name: 'D2 2025-26 Winter',          league: 'Rec',   label: 'D2 2025-26 Winter' },
  { id: '106802', name: 'D4 (35+) 2025-26 Winter',    league: '35+',   label: 'D4 2025-26 Winter' },
  { id: '106576', name: 'D3 2025 Fall Season',         league: 'Rec',   label: 'D3 2025 Fall' },
  { id: '105128', name: 'D2 2025 Summer',              league: 'Rec',   label: 'D2 2025 Summer' },
  { id: '104510', name: '2025 Summer Tournament',      league: 'Comp',  label: '2025 Summer Tournament' },
  { id: '101186', name: 'D4 2024 Winter',              league: '35+',   label: 'D4 2024 Winter' },
  { id: '101185', name: 'D3 2024 Winter',              league: 'Rec',   label: 'D3 2024 Winter' },
  { id: '101021', name: 'D2 2024 Winter',              league: 'Rec',   label: 'D2 2024 Winter' },
  { id: '101020', name: 'SZN 5 D1 Winter',             league: 'Comp',  label: 'D1 2024 Winter' },
  { id: '98800',  name: '2024 SZN 4 Summer League',    league: 'Comp',  label: 'D1 2024 Summer' },
  { id: '94645',  name: '2023-24 Winter Season',       league: 'Comp',  label: 'D1 2023-24 Winter' },
  { id: '90255',  name: '2023 Summer Season',          league: 'Comp',  label: 'D1 2023 Summer' },
  { id: '87272',  name: 'Fall Season 2022',            league: 'Comp',  label: 'Fall 2022' },
]

const LEAGUE_ID = '65672'
const BASE_URL = 'https://www.mystatsonline.com'

// ─── HTTP ─────────────────────────────────────────────────────────────────────
function fetchUrlOnce(url: string, opts?: { method?: string; body?: string; headers?: Record<string, string> }): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      ...(opts?.headers ?? {}),
    }
    if (opts?.body) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
      headers['Content-Length'] = Buffer.byteLength(opts.body).toString()
    }
    const reqOpts: https.RequestOptions = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: opts?.method ?? 'GET',
      headers,
      timeout: 25000,
    }
    const req = (parsed.protocol === 'https:' ? https : http).request(reqOpts, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const loc = res.headers.location as string
        resolve(fetchUrlOnce(loc.startsWith('http') ? loc : `${parsed.protocol}//${parsed.hostname}${loc}`, opts))
        return
      }
      let data = ''
      res.on('data', (chunk: Buffer) => { data += chunk.toString() })
      res.on('end', () => resolve(data))
    })
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    req.on('error', reject)
    if (opts?.body) req.write(opts.body)
    req.end()
  })
}

async function fetchUrl(url: string, opts?: Parameters<typeof fetchUrlOnce>[1]): Promise<string> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      if (attempt > 0) { await sleep(Math.pow(2, attempt) * 2000); console.log(`   ↩️  Retry ${attempt}`) }
      return await fetchUrlOnce(url, opts)
    } catch (_) {}
  }
  throw new Error(`Failed after 4 attempts: ${url}`)
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// ─── Parsers ──────────────────────────────────────────────────────────────────
function parseInt0(s: string): number { const n = parseInt((s || '').trim(), 10); return isNaN(n) ? 0 : n }
function slugify(name: string): string { return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }

function extractViewState(html: string): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const m of html.matchAll(/name="(__[A-Z_]+)"\s[^>]*value="([^"]*?)"/g)) fields[m[1]] = m[2]
  return fields
}

function parseGameIds(html: string): string[] {
  const ids = new Set<string>()
  for (const m of html.matchAll(/game_score_basket\((\d+)\)/g)) ids.add(m[1])
  return Array.from(ids)
}

interface PlayerStat {
  playerName: string; playerId: string; jerseyNumber: number; position: string
  twoPtMade: number; twoPtAtt: number; threeMade: number; threeAtt: number
  ftMade: number; ftAtt: number; points: number; assists: number
  rebounds: number; steals: number; blocks: number
}

interface GameBox {
  gameId: string; homeTeam: string; awayTeam: string; homeScore: number; awayScore: number
  date: Date; homeStats: PlayerStat[]; awayStats: PlayerStat[]
}

function parseBoxScore(html: string, gameId: string): GameBox {
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
    const teamRows = [...html.matchAll(/<td align="left" nowrap="nowrap">([\s\S]*?)<\/td>(?:<td[^>]*>[\s\S]*?<\/td>){3}<td align="center" nowrap="nowrap">(\d+)<\/td>/g)]
    if (teamRows.length >= 2) {
      awayTeam = teamRows[0][1].replace(/&nbsp;/g, '').trim()
      awayScore = parseInt(teamRows[0][2])
      homeTeam = teamRows[1][1].replace(/&nbsp;/g, '').trim()
      homeScore = parseInt(teamRows[1][2])
    }
  }

  let date = new Date()
  const dateMatch = html.match(/(\w+day),?\s+(\w+\s+\d+,?\s*\d{4})/)
  if (dateMatch) { const p = new Date(dateMatch[2].replace(',', '')); if (!isNaN(p.getTime())) date = p }

  const tables: string[] = []
  const tableRegex = /<tbody>([\s\S]*?)<\/tbody>/g
  let tm
  while ((tm = tableRegex.exec(html)) !== null) {
    if (tm[1].includes('player_details_basket')) tables.push(tm[1])
  }

  function parseTable(tableContent: string): PlayerStat[] {
    const stats: PlayerStat[] = []
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g
    let rowM
    while ((rowM = rowRegex.exec(tableContent)) !== null) {
      const row = rowM[1]
      if (!row.includes('player_details_basket')) continue
      const pm = row.match(/player_details_basket\((\d+)\)'>([^<]+)<\/a>/)
      if (!pm) continue
      const playerId = pm[1]
      const rawName = pm[2].trim()
      const jm = rawName.match(/^(.+?)\s+#(\d+)\s*$/)
      const playerName = jm ? jm[1].trim() : rawName
      const jerseyNumber = jm ? parseInt(jm[2], 10) : 0
      const tds: string[] = []
      const tdRegex = /<td[^>]*class="[^"]*text-center[^"]*"[^>]*>([\s\S]*?)<\/td>/g
      let tdM
      while ((tdM = tdRegex.exec(row)) !== null) tds.push(tdM[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim())
      if (tds.length < 17) continue
      stats.push({
        playerName, playerId, jerseyNumber,
        position: tds[0] || 'G',
        twoPtMade: parseInt0(tds[1]), twoPtAtt: parseInt0(tds[2]),
        threeMade: parseInt0(tds[4]), threeAtt: parseInt0(tds[5]),
        ftMade: parseInt0(tds[10]), ftAtt: parseInt0(tds[11]),
        points: parseInt0(tds[13]),
        assists: parseInt0(tds[14]),
        rebounds: parseInt0(tds[16]),
        steals: tds.length > 17 ? parseInt0(tds[17]) : 0,
        blocks: tds.length > 18 ? parseInt0(tds[18]) : 0,
      })
    }
    return stats
  }

  return {
    gameId, homeTeam, awayTeam, homeScore, awayScore, date,
    awayStats: tables.length > 0 ? parseTable(tables[0]) : [],
    homeStats: tables.length > 1 ? parseTable(tables[1]) : [],
  }
}

async function getGameIdsForSeason(seasonId: string): Promise<string[]> {
  const url = `${BASE_URL}/basket/visitor/league/schedule_scores/schedule.aspx?IDLeague=${LEAGUE_ID}`
  const html = await fetchUrl(url)
  const vs = extractViewState(html)
  const params = new URLSearchParams({
    '__EVENTTARGET': 'ctl00$maintitle$ddlSeason', '__EVENTARGUMENT': '', '__LASTFOCUS': '',
    '__VIEWSTATE': vs['__VIEWSTATE'] || '', '__VIEWSTATEGENERATOR': vs['__VIEWSTATEGENERATOR'] || '',
    '__EVENTVALIDATION': vs['__EVENTVALIDATION'] || '',
    'ctl00$maintitle$ddlSeason': seasonId,
    'ctl00$maincontent$ddlMonth': '0', 'ctl00$maincontent$ddlStatus': '-1',
    'ctl00$maincontent$ddlLocation': '0', 'ctl00$maincontent$ddlTeam': '',
  })
  const postHtml = await fetchUrl(url, { method: 'POST', body: params.toString(), headers: { Referer: url, Origin: BASE_URL } })
  return parseGameIds(postHtml)
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const targetSeason = process.argv.find(a => a.startsWith('--season='))?.replace('--season=', '')
                    || (process.argv.indexOf('--season') !== -1 ? process.argv[process.argv.indexOf('--season') + 1] : null)

  const seasonsToProcess = targetSeason
    ? SEASONS.filter(s => s.label === targetSeason || s.name === targetSeason)
    : SEASONS

  if (targetSeason && seasonsToProcess.length === 0) {
    console.error(`❌ Season not found: "${targetSeason}"`)
    console.log('Available:', SEASONS.map(s => s.label).join(', '))
    process.exit(1)
  }

  console.log('🏀 IMBA Stats Re-Audit — MyStatsOnline\n')
  console.log(`📋 Processing ${seasonsToProcess.length} season(s)`)
  if (targetSeason) console.log(`   (targeted: ${targetSeason})`)
  console.log('')

  let totalFixed = 0, totalAdded = 0, totalGames = 0, totalErrors = 0

  for (const season of seasonsToProcess) {
    console.log(`\n📅 ${season.name} [${season.league}]`)

    let gameIds: string[]
    try {
      gameIds = await getGameIdsForSeason(season.id)
      console.log(`   ${gameIds.length} games on MyStatsOnline`)
    } catch (err) {
      console.error(`   ❌ Could not fetch game list: ${err}`)
      totalErrors++
      continue
    }

    if (gameIds.length === 0) { console.log('   (no games)'); continue }

    const teamCache = new Map<string, string>()
    async function getOrCreateTeam(name: string): Promise<string> {
      if (teamCache.has(name)) return teamCache.get(name)!
      let team = await prisma.team.findFirst({ where: { name, league: season.league } })
      if (!team) {
        const slug = slugify(`${name}-${season.label}`)
        const existing = await prisma.team.findUnique({ where: { slug } })
        team = await prisma.team.create({ data: { name, slug: existing ? `${slug}-${Date.now()}` : slug, league: season.league, color: '#4A9FE3' } })
      }
      teamCache.set(name, team.id)
      return team.id
    }

    const playerCache = new Map<string, string>()
    async function getOrCreatePlayer(name: string, teamId: string, jerseyNumber: number, position: string): Promise<string> {
      const key = `${name}:${teamId}`
      if (playerCache.has(key)) return playerCache.get(key)!
      let player = await prisma.player.findFirst({ where: { name, teamId, isSub: false } })
      if (!player) {
        player = await prisma.player.create({ data: { name, number: jerseyNumber || 0, position: position || 'G', isSub: false, teamId } })
      } else if (jerseyNumber && !player.number) {
        player = await prisma.player.update({ where: { id: player.id }, data: { number: jerseyNumber } })
      }
      playerCache.set(key, player.id)
      return player.id
    }

    let seasonFixed = 0, seasonAdded = 0, seasonOk = 0

    for (let i = 0; i < gameIds.length; i++) {
      const gameId = gameIds[i]
      try {
        await sleep(350)
        const url = `${BASE_URL}/basket/visitor/league/schedule_scores/game_score_basket.aspx?IDLeague=${LEAGUE_ID}&IDGame=${gameId}`
        const html = await fetchUrl(url)
        const box = parseBoxScore(html, gameId)

        if (!box.awayTeam || !box.homeTeam) {
          console.log(`   ⚠️  Game ${gameId}: teams not parsed`)
          continue
        }

        const awayTeamId = await getOrCreateTeam(box.awayTeam)
        const homeTeamId = await getOrCreateTeam(box.homeTeam)

        // Find or create the game record
        let game = await prisma.game.findFirst({ where: { homeTeamId, awayTeamId, season: season.label } })
        if (!game) {
          // Also try reversed (in case home/away was recorded differently)
          game = await prisma.game.findFirst({ where: { homeTeamId: awayTeamId, awayTeamId: homeTeamId, season: season.label } })
        }
        if (!game) {
          game = await prisma.game.create({
            data: {
              date: box.date, location: 'Irving Masjid', season: season.label, league: season.league,
              played: true, homeTeamId, awayTeamId, homeScore: box.homeScore, awayScore: box.awayScore,
              week: i + 1,
            }
          })
        } else {
          // Update score to match MSO
          game = await prisma.game.update({ where: { id: game.id }, data: { homeScore: box.homeScore, awayScore: box.awayScore, played: true } })
        }

        // Delete existing stats for non-sub players only (preserve manually-entered sub stats)
        const subPlayerIds = (await prisma.player.findMany({ where: { isSub: true }, select: { id: true } })).map(p => p.id)
        await prisma.playerGameStat.deleteMany({
          where: {
            gameId: game.id,
            ...(subPlayerIds.length > 0 ? { playerId: { notIn: subPlayerIds } } : {}),
          }
        })

        // Re-insert fresh stats
        const allStats = [
          ...box.awayStats.map(s => ({ ...s, teamId: awayTeamId })),
          ...box.homeStats.map(s => ({ ...s, teamId: homeTeamId })),
        ]

        let gameAdded = 0, gameFixed = 0
        for (const ps of allStats) {
          const playerId = await getOrCreatePlayer(ps.playerName, ps.teamId, ps.jerseyNumber, ps.position)
          const existing = await prisma.playerGameStat.findUnique({ where: { playerId_gameId: { playerId, gameId: game.id } } })

          const statData = {
            twoPtMade: ps.twoPtMade, twoPtAtt: ps.twoPtAtt,
            threeMade: ps.threeMade, threeAtt: ps.threeAtt,
            ftMade: ps.ftMade, ftAtt: ps.ftAtt,
            points: ps.points, assists: ps.assists, rebounds: ps.rebounds,
            steals: ps.steals, blocks: ps.blocks, turnovers: 0,
          }

          if (!existing) {
            await prisma.playerGameStat.create({ data: { playerId, gameId: game.id, teamId: ps.teamId, ...statData } })
            gameAdded++
          } else {
            await prisma.playerGameStat.update({ where: { id: existing.id }, data: statData })
            gameFixed++
          }
        }

        seasonAdded += gameAdded; seasonFixed += gameFixed; seasonOk++
        const calcHome = box.homeStats.reduce((s, p) => s + p.points, 0)
        const calcAway = box.awayStats.reduce((s, p) => s + p.points, 0)
        const matchIcon = Math.abs(calcHome - box.homeScore) <= 2 && Math.abs(calcAway - box.awayScore) <= 2 ? '✓' : '⚠'
        console.log(`   [${i+1}/${gameIds.length}] ${matchIcon} ${box.awayTeam} ${box.awayScore} @ ${box.homeTeam} ${box.homeScore} | calc: ${calcAway}-${calcHome} | +${gameAdded} new, ~${gameFixed} updated`)
        totalGames++
      } catch (err) {
        console.error(`   ❌ Game ${gameId}: ${err}`)
        totalErrors++
      }
    }

    console.log(`   ✅ Season done: ${seasonOk} games, +${seasonAdded} new stat rows, ~${seasonFixed} updated`)
    totalAdded += seasonAdded; totalFixed += seasonFixed
  }

  console.log('\n' + '='.repeat(60))
  console.log(`🏁 Re-audit complete`)
  console.log(`   Games processed : ${totalGames}`)
  console.log(`   Stat rows added : ${totalAdded}`)
  console.log(`   Stat rows fixed : ${totalFixed}`)
  console.log(`   Errors          : ${totalErrors}`)

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
