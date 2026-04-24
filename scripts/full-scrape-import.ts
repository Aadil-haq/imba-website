/**
 * Full Scrape & Import — MyStatsOnline → IMBA Website
 *
 * Scrapes ALL seasons, ALL games, ALL player stats from mystatsonline.com
 * and imports them directly into the IMBA website database.
 *
 * Usage:
 *   DATABASE_URL="file:./dev.db" npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/full-scrape-import.ts
 */

import * as https from 'https'
import * as http from 'http'
import { prisma } from '../lib/db'

// ─── Season definitions ───────────────────────────────────────────────────────
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

// ─── HTTP helper ─────────────────────────────────────────────────────────────
function fetchUrlOnce(url: string, options?: { method?: string; body?: string; headers?: Record<string, string> }): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      ...(options?.headers ?? {}),
    }

    if (options?.body) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
      headers['Content-Length'] = Buffer.byteLength(options.body).toString()
    }

    const reqOptions: https.RequestOptions = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: options?.method ?? 'GET',
      headers,
      timeout: 20000,
    }

    const req = (parsed.protocol === 'https:' ? https : http).request(reqOptions, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const loc = res.headers.location as string
        const redirectUrl = loc.startsWith('http') ? loc : `${parsed.protocol}//${parsed.hostname}${loc}`
        resolve(fetchUrlOnce(redirectUrl, options))
        return
      }

      let data = ''
      res.on('data', (chunk: Buffer) => { data += chunk.toString() })
      res.on('end', () => resolve(data))
    })

    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    req.on('error', reject)
    if (options?.body) req.write(options.body)
    req.end()
  })
}

async function fetchUrl(url: string, options?: { method?: string; body?: string; headers?: Record<string, string> }): Promise<string> {
  const maxRetries = 4
  let lastErr: Error = new Error('unknown')
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = Math.pow(2, attempt) * 2000  // 4s, 8s, 16s
        console.log(`   ↩️  Retry ${attempt}/${maxRetries - 1} in ${delay/1000}s...`)
        await sleep(delay)
      }
      return await fetchUrlOnce(url, options)
    } catch (err) {
      lastErr = err as Error
    }
  }
  throw lastErr
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ─── Parsers ─────────────────────────────────────────────────────────────────

interface PlayerStat {
  playerName: string
  playerId: string
  jerseyNumber: number
  position: string
  twoPtMade: number
  twoPtAtt: number
  threeMade: number
  threeAtt: number
  ftMade: number
  ftAtt: number
  points: number
  assists: number
  rebounds: number
  steals: number
  blocks: number
  turnovers: number
  personalFouls: number
}

interface GameBoxScore {
  gameId: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  date: Date
  homeStats: PlayerStat[]
  awayStats: PlayerStat[]
}

function parseInt0(s: string): number {
  const n = parseInt((s || '').trim(), 10)
  return isNaN(n) ? 0 : n
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function extractViewState(html: string): Record<string, string> {
  const fields: Record<string, string> = {}
  const matches = html.matchAll(/name="(__[A-Z_]+)"\s[^>]*value="([^"]*?)"/g)
  for (const m of matches) {
    fields[m[1]] = m[2]
  }
  return fields
}

function parseGameIds(html: string): string[] {
  const ids = new Set<string>()
  // ONLY use game_score_basket(XXXXX) onclick format — these are season-specific
  // Avoid IDGame=XXXXX in href URLs which come from the carousel and may be from a different season
  for (const m of html.matchAll(/game_score_basket\((\d+)\)/g)) ids.add(m[1])
  return Array.from(ids)
}

function parseBoxScore(html: string, gameId: string): GameBoxScore {
  let awayTeam = '', homeTeam = '', awayScore = 0, homeScore = 0

  // Format A (newer): div-based with pnlLeftTotal/pnlRightTotal
  const spanTeamMatches = [...html.matchAll(/<span class="mso-big mso-bold">([^<]+)<\/span>/g)]
  const leftScoreMatch = html.match(/pnlLeftTotal[^>]*>[\s\S]*?<strong>(\d+)<\/strong>/)
  const rightScoreMatch = html.match(/pnlRightTotal[^>]*>[\s\S]*?<strong>(\d+)<\/strong>/)

  if (spanTeamMatches.length >= 2 && leftScoreMatch && rightScoreMatch) {
    awayTeam = spanTeamMatches[0][1].trim()
    homeTeam = spanTeamMatches[1][1].trim()
    awayScore = parseInt(leftScoreMatch[1])
    homeScore = parseInt(rightScoreMatch[1])
  } else {
    // Format B (older): table-based with align="left" cells
    const teamRows = [...html.matchAll(
      /<td align="left" nowrap="nowrap">([\s\S]*?)<\/td>(?:<td[^>]*>[\s\S]*?<\/td>){3}<td align="center" nowrap="nowrap">(\d+)<\/td>/g
    )]
    if (teamRows.length >= 2) {
      awayTeam = teamRows[0][1].replace(/&nbsp;/g, '').trim()
      awayScore = parseInt(teamRows[0][2])
      homeTeam = teamRows[1][1].replace(/&nbsp;/g, '').trim()
      homeScore = parseInt(teamRows[1][2])
    }
  }

  // Parse date
  let date = new Date()
  const dateMatch = html.match(/(\w+day),?\s+(\w+\s+\d+,?\s*\d{4})/)
  if (dateMatch) {
    const parsed = new Date(dateMatch[2].replace(',', ''))
    if (!isNaN(parsed.getTime())) date = parsed
  }

  // Parse player stat tables
  const tables: string[] = []
  const tableRegex = /<tbody>([\s\S]*?)<\/tbody>/g
  let tm
  while ((tm = tableRegex.exec(html)) !== null) {
    const content = tm[1]
    if (content.includes('player_details_basket')) {
      tables.push(content)
    }
  }

  function parseStatsTable(tableContent: string): PlayerStat[] {
    const stats: PlayerStat[] = []
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g
    let rowM

    while ((rowM = rowRegex.exec(tableContent)) !== null) {
      const row = rowM[1]
      if (!row.includes('player_details_basket')) continue

      const playerMatch = row.match(/player_details_basket\((\d+)\)'>([^<]+)<\/a>/)
      if (!playerMatch) continue

      const playerId = playerMatch[1]
      const rawName = playerMatch[2].trim()

      const jerseyMatch = rawName.match(/^(.+?)\s+#(\d+)\s*$/)
      const playerName = jerseyMatch ? jerseyMatch[1].trim() : rawName
      const jerseyNumber = jerseyMatch ? parseInt(jerseyMatch[2], 10) : 0

      // Extract TD values (text-center cells)
      const tds: string[] = []
      const tdRegex = /<td[^>]*class="[^"]*text-center[^"]*"[^>]*>([\s\S]*?)<\/td>/g
      let tdM
      while ((tdM = tdRegex.exec(row)) !== null) {
        tds.push(tdM[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim())
      }

      // Column order after PLAYERS:
      // 0:POS, 1:2PM, 2:2PA, 3:2P%, 4:3PM, 5:3PA, 6:3P%, 7:FGM, 8:FGA, 9:FG%, 10:FTM, 11:FTA, 12:FT%, 13:PTS, 14:AST, 15:PF, 16:REB, 17:STL, 18:BLK, 19:TS%
      if (tds.length < 17) continue

      stats.push({
        playerName,
        playerId,
        jerseyNumber,
        position: tds[0] || 'G',
        twoPtMade: parseInt0(tds[1]),
        twoPtAtt: parseInt0(tds[2]),
        threeMade: parseInt0(tds[4]),
        threeAtt: parseInt0(tds[5]),
        ftMade: parseInt0(tds[10]),
        ftAtt: parseInt0(tds[11]),
        points: parseInt0(tds[13]),
        assists: parseInt0(tds[14]),
        personalFouls: parseInt0(tds[15]),
        rebounds: parseInt0(tds[16]),
        steals: tds.length > 17 ? parseInt0(tds[17]) : 0,
        blocks: tds.length > 18 ? parseInt0(tds[18]) : 0,
        turnovers: 0,
      })
    }

    return stats
  }

  const awayStats = tables.length > 0 ? parseStatsTable(tables[0]) : []
  const homeStats = tables.length > 1 ? parseStatsTable(tables[1]) : []

  return { gameId, homeTeam, awayTeam, homeScore, awayScore, date, homeStats, awayStats }
}

// ─── Get game IDs for a season via ASP.NET POST ───────────────────────────────
async function getGameIdsForSeason(seasonId: string): Promise<string[]> {
  const url = `${BASE_URL}/basket/visitor/league/schedule_scores/schedule.aspx?IDLeague=${LEAGUE_ID}`

  const html = await fetchUrl(url)
  const viewState = extractViewState(html)

  const params = new URLSearchParams({
    '__EVENTTARGET': 'ctl00$maintitle$ddlSeason',
    '__EVENTARGUMENT': '',
    '__LASTFOCUS': '',
    '__VIEWSTATE': viewState['__VIEWSTATE'] || '',
    '__VIEWSTATEGENERATOR': viewState['__VIEWSTATEGENERATOR'] || '',
    '__EVENTVALIDATION': viewState['__EVENTVALIDATION'] || '',
    'ctl00$maintitle$ddlSeason': seasonId,
    'ctl00$maincontent$ddlMonth': '0',
    'ctl00$maincontent$ddlStatus': '-1',
    'ctl00$maincontent$ddlLocation': '0',
    'ctl00$maincontent$ddlTeam': '',
  })

  const postHtml = await fetchUrl(url, {
    method: 'POST',
    body: params.toString(),
    headers: { 'Referer': url, 'Origin': BASE_URL },
  })

  return parseGameIds(postHtml)
}

// ─── Import flow ─────────────────────────────────────────────────────────────

interface ImportStats {
  seasons: number
  teams: number
  players: number
  games: number
  statRecords: number
  errors: string[]
}

async function importSeason(season: typeof SEASONS[0], importSt: ImportStats) {
  console.log(`\n📅 Season: ${season.name} (${season.league})`)

  let gameIds: string[] = []
  try {
    gameIds = await getGameIdsForSeason(season.id)
    console.log(`   ${gameIds.length} games found`)
  } catch (err) {
    console.error(`   ❌ Failed to get game IDs: ${err}`)
    importSt.errors.push(`${season.name}: failed to get game IDs`)
    return
  }

  if (gameIds.length === 0) {
    console.log(`   (no games, skipping)`)
    return
  }

  // teamName → prisma team.id for this session
  const teamCache = new Map<string, string>()

  async function getOrCreateTeam(name: string): Promise<string> {
    if (teamCache.has(name)) return teamCache.get(name)!

    const slug = slugify(`${name}-${season.label}`)
    let team = await prisma.team.findFirst({ where: { name, league: season.league } })
    if (!team) {
      // try with season-qualified slug
      let finalSlug = slug
      const existing = await prisma.team.findUnique({ where: { slug } })
      if (existing) finalSlug = `${slug}-${Date.now()}`

      team = await prisma.team.create({
        data: { name, slug: finalSlug, league: season.league, color: '#4A9FE3' }
      })
      importSt.teams++
    }
    teamCache.set(name, team.id)
    return team.id
  }

  // playerKey (name+teamId) → prisma player.id
  const playerCache = new Map<string, string>()

  async function getOrCreatePlayer(name: string, teamId: string, jerseyNumber: number, position: string): Promise<string> {
    const key = `${name}:${teamId}`
    if (playerCache.has(key)) return playerCache.get(key)!

    let player = await prisma.player.findFirst({ where: { name, teamId } })
    if (!player) {
      player = await prisma.player.create({
        data: {
          name,
          number: jerseyNumber || 0,
          position: position || 'G',
          teamId,
        }
      })
      importSt.players++
    } else if (jerseyNumber && !player.number) {
      player = await prisma.player.update({
        where: { id: player.id },
        data: { number: jerseyNumber }
      })
    }

    playerCache.set(key, player.id)
    return player.id
  }

  let gamesOk = 0
  for (let i = 0; i < gameIds.length; i++) {
    const gameId = gameIds[i]
    try {
      await sleep(400)

      const url = `${BASE_URL}/basket/visitor/league/schedule_scores/game_score_basket.aspx?IDLeague=${LEAGUE_ID}&IDGame=${gameId}`
      const html = await fetchUrl(url)
      const box = parseBoxScore(html, gameId)

      if (!box.awayTeam || !box.homeTeam) {
        console.log(`   ⚠️  Game ${gameId}: teams not found`)
        continue
      }

      const awayTeamId = await getOrCreateTeam(box.awayTeam)
      const homeTeamId = await getOrCreateTeam(box.homeTeam)

      // Upsert game
      let game = await prisma.game.findFirst({
        where: { homeTeamId, awayTeamId, season: season.label }
      })

      if (!game) {
        game = await prisma.game.create({
          data: {
            date: box.date,
            location: 'Irving Masjid',
            season: season.label,
            league: season.league,
            played: true,
            homeTeamId,
            awayTeamId,
            homeScore: box.homeScore,
            awayScore: box.awayScore,
            week: i + 1,
          }
        })
        importSt.games++
      } else {
        game = await prisma.game.update({
          where: { id: game.id },
          data: { homeScore: box.homeScore, awayScore: box.awayScore, played: true }
        })
      }

      // Player stats
      const teamStatPairs = [
        { teamId: awayTeamId, stats: box.awayStats },
        { teamId: homeTeamId, stats: box.homeStats },
      ]

      for (const { teamId, stats } of teamStatPairs) {
        for (const ps of stats) {
          const playerId = await getOrCreatePlayer(ps.playerName, teamId, ps.jerseyNumber, ps.position)

          const existing = await prisma.playerGameStat.findUnique({
            where: { playerId_gameId: { playerId, gameId: game.id } }
          })

          const statData = {
            twoPtMade: ps.twoPtMade,
            twoPtAtt: ps.twoPtAtt,
            threeMade: ps.threeMade,
            threeAtt: ps.threeAtt,
            ftMade: ps.ftMade,
            ftAtt: ps.ftAtt,
            points: ps.points,
            assists: ps.assists,
            rebounds: ps.rebounds,
            steals: ps.steals,
            blocks: ps.blocks,
            turnovers: 0,
          }

          if (!existing) {
            await prisma.playerGameStat.create({
              data: { playerId, gameId: game.id, teamId, ...statData }
            })
            importSt.statRecords++
          } else {
            await prisma.playerGameStat.update({
              where: { id: existing.id },
              data: statData
            })
          }
        }
      }

      gamesOk++
      const total = box.awayStats.length + box.homeStats.length
      console.log(`   [${i+1}/${gameIds.length}] ${box.awayTeam} ${box.awayScore} @ ${box.homeTeam} ${box.homeScore} — ${total} players`)

    } catch (err) {
      console.error(`   ❌ Game ${gameId}: ${err}`)
      importSt.errors.push(`${season.name} game ${gameId}: ${err}`)
    }
  }

  console.log(`   ✅ ${gamesOk}/${gameIds.length} games imported`)
  importSt.seasons++
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const resumeMode = process.argv.includes('--resume')
  console.log('🏀 IMBA Full Scrape & Import from MyStatsOnline\n')

  if (!resumeMode) {
    // Clear existing data
    console.log('Clearing existing data...')
    await prisma.playerGameStat.deleteMany()
    await prisma.player.deleteMany()
    await prisma.game.deleteMany()
    await prisma.team.deleteMany()
    console.log('✓ Cleared\n')
  } else {
    console.log('▶ Resume mode: skipping already-imported seasons\n')
  }

  const importSt: ImportStats = { seasons: 0, teams: 0, players: 0, games: 0, statRecords: 0, errors: [] }

  for (const season of SEASONS) {
    if (resumeMode) {
      // Skip if this season already has games in DB
      const existing = await prisma.game.findFirst({ where: { season: season.label } })
      if (existing) {
        console.log(`⏭  Skipping ${season.name} (already imported)`)
        continue
      }
    }
    await importSeason(season, importSt)
    await sleep(2000) // longer pause between seasons
  }

  console.log('\n' + '═'.repeat(55))
  console.log('🏆 IMPORT COMPLETE')
  console.log('═'.repeat(55))
  console.log(`  Seasons:      ${importSt.seasons}`)
  console.log(`  Teams:        ${importSt.teams}`)
  console.log(`  Players:      ${importSt.players}`)
  console.log(`  Games:        ${importSt.games}`)
  console.log(`  Stat records: ${importSt.statRecords}`)
  if (importSt.errors.length > 0) {
    console.log(`\n  ⚠️  ${importSt.errors.length} errors:`)
    importSt.errors.slice(0, 20).forEach(e => console.log(`     - ${e}`))
  }

  await prisma.$disconnect()
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
