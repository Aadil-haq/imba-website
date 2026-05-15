/**
 * IMBA Comprehensive Data Audit Script
 *
 * 1. Check for corrupted player stats (index-shift bug from 19-column box scores)
 * 2. Check for duplicate games
 * 3. Find missing MSO games in specified ID ranges
 *
 * Run:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/audit-all.ts
 */

import * as https from 'https'
import * as http from 'http'

const { createClient } = require('@libsql/client')

// ─── DB Setup ─────────────────────────────────────────────────────────────────
const db = createClient({
  url: process.env.TURSO_DATABASE_URL || '',
  authToken: process.env.TURSO_AUTH_TOKEN || '',
})

// ─── Constants ────────────────────────────────────────────────────────────────
const LEAGUE_ID = '65672'
const BASE_URL = 'https://www.mystatsonline.com'
const RATE_LIMIT_MS = 120

const IMBA_TEAMS = new Set([
  'Pool Party', 'ATX', 'Companions', 'Irving OGs', 'Ahad', 'Akhi Ballers',
  'Baitul Ballers', 'Baja Blast', 'STAR CLLCTV', 'Swish Kebabs', 'The Rich',
  'AMB', 'Ahbab', 'Salaam Squad', 'Al Shabab', 'TNZ', 'Spray Dat',
  'Halal Hustlers', 'The Askars', 'Fast Break',
])

// MSO ranges to scan for missing games
const MSO_RANGES: { start: number; end: number; step: number; label: string }[] = [
  { start: 1825130, end: 1825600, step: 1,  label: 'D2 Jan 24/31 potential' },
  { start: 1826073, end: 1826200, step: 1,  label: 'Additional Dec/Jan games' },
  { start: 1830000, end: 1847196, step: 50, label: 'Large gap coarse scan (every 50th)' },
  { start: 1847201, end: 1853742, step: 1,  label: 'D2 Feb 1-8 potential' },
  { start: 1856292, end: 1858500, step: 1,  label: 'Post Feb-15 games' },
]

// ─── HTTP ─────────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

function fetchUrlOnce(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const reqOpts: https.RequestOptions = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 20000,
    }
    const req = (parsed.protocol === 'https:' ? https : http).request(reqOpts, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const loc = res.headers.location as string
        resolve(fetchUrlOnce(loc.startsWith('http') ? loc : `${parsed.protocol}//${parsed.hostname}${loc}`))
        return
      }
      let data = ''
      res.on('data', (chunk: Buffer) => { data += chunk.toString() })
      res.on('end', () => resolve(data))
    })
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')) })
    req.on('error', reject)
    req.end()
  })
}

async function fetchUrl(url: string): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await sleep(Math.pow(2, attempt) * 1500)
      return await fetchUrlOnce(url)
    } catch (_) {}
  }
  throw new Error(`Failed after 3 attempts: ${url}`)
}

// ─── MSO Quick Parser ─────────────────────────────────────────────────────────
interface MsoGame {
  awayTeam: string
  homeTeam: string
  awayScore: number
  homeScore: number
  date: Date | null
}

function quickParse(html: string): MsoGame | null {
  const spans = [...html.matchAll(/<span class="mso-big mso-bold">([^<]+)<\/span>/g)]
  const ls = html.match(/pnlLeftTotal[^>]*>[\s\S]*?<strong>(\d+)<\/strong>/)
  const rs = html.match(/pnlRightTotal[^>]*>[\s\S]*?<strong>(\d+)<\/strong>/)
  if (spans.length < 2 || !ls || !rs) return null

  const awayTeam = spans[0][1].trim()
  const homeTeam = spans[1][1].trim()
  const awayScore = parseInt(ls[1])
  const homeScore = parseInt(rs[1])

  let date: Date | null = null
  const dateMatch = html.match(/(\w+day),?\s+(\w+\s+\d+,?\s*\d{4})/)
  if (dateMatch) {
    const p = new Date(dateMatch[2].replace(',', ''))
    if (!isNaN(p.getTime())) date = p
  }

  return { awayTeam, homeTeam, awayScore, homeScore, date }
}

function isImbaGame(g: MsoGame): boolean {
  return IMBA_TEAMS.has(g.awayTeam) || IMBA_TEAMS.has(g.homeTeam)
}

// ─── Section 1: Corrupted Stats ───────────────────────────────────────────────
interface CorruptedStat {
  statId: string
  playerName: string
  teamName: string
  gameDate: string
  gameSeason: string
  ftAtt: number
  blocks: number
  points: number
  twoPtMade: number
  threeMade: number
  ftMade: number
  calcPoints: number
  reasons: string[]
}

async function checkCorruptedStats(): Promise<CorruptedStat[]> {
  console.log('\n[1/3] Checking for corrupted player stats...')

  const result = await db.execute(`
    SELECT
      pgs.id         AS statId,
      pl.name        AS playerName,
      t.name         AS teamName,
      g.date         AS gameDate,
      g.season       AS gameSeason,
      pgs.ftAtt      AS ftAtt,
      pgs.blocks     AS blocks,
      pgs.points     AS points,
      pgs.twoPtMade  AS twoPtMade,
      pgs.threeMade  AS threeMade,
      pgs.ftMade     AS ftMade
    FROM PlayerGameStat pgs
    JOIN Player pl ON pl.id = pgs.playerId
    JOIN Team   t  ON t.id  = pgs.teamId
    JOIN Game   g  ON g.id  = pgs.gameId
    WHERE
      pgs.ftAtt  IN (25, 50)
      OR pgs.blocks > 8
      OR ABS(pgs.points - (pgs.twoPtMade * 2 + pgs.threeMade * 3 + pgs.ftMade)) > 1
    ORDER BY g.date DESC
  `)

  const corrupted: CorruptedStat[] = []

  for (const row of result.rows) {
    const calcPoints = (row.twoPtMade as number) * 2 + (row.threeMade as number) * 3 + (row.ftMade as number)
    const reasons: string[] = []

    if ((row.ftAtt as number) === 25 || (row.ftAtt as number) === 50) {
      reasons.push(`ftAtt=${row.ftAtt} (looks like parsed percentage string)`)
    }
    if ((row.blocks as number) > 8) {
      reasons.push(`blocks=${row.blocks} (suspiciously high for one player)`)
    }
    if (Math.abs((row.points as number) - calcPoints) > 1) {
      reasons.push(`points=${row.points} but 2PM*2+3PM*3+FTM=${calcPoints} (diff=${Math.abs((row.points as number) - calcPoints)})`)
    }

    if (reasons.length > 0) {
      corrupted.push({
        statId:     row.statId as string,
        playerName: row.playerName as string,
        teamName:   row.teamName as string,
        gameDate:   row.gameDate as string,
        gameSeason: row.gameSeason as string,
        ftAtt:      row.ftAtt as number,
        blocks:     row.blocks as number,
        points:     row.points as number,
        twoPtMade:  row.twoPtMade as number,
        threeMade:  row.threeMade as number,
        ftMade:     row.ftMade as number,
        calcPoints,
        reasons,
      })
    }
  }

  console.log(`   Found ${corrupted.length} suspicious stat rows`)
  return corrupted
}

// ─── Section 2: Duplicate Games ───────────────────────────────────────────────
interface DuplicateGame {
  homeTeamName: string
  awayTeamName: string
  date: string
  season: string
  gameIds: string[]
  count: number
}

async function checkDuplicateGames(): Promise<DuplicateGame[]> {
  console.log('\n[2/3] Checking for duplicate games...')

  // Find groups that have more than one game record for the same matchup + date + season
  const result = await db.execute(`
    SELECT
      g.homeTeamId,
      g.awayTeamId,
      DATE(g.date) AS gameDay,
      g.season,
      COUNT(*)     AS cnt,
      GROUP_CONCAT(g.id, '|') AS gameIds,
      ht.name AS homeTeamName,
      at.name AS awayTeamName
    FROM Game g
    JOIN Team ht ON ht.id = g.homeTeamId
    JOIN Team at ON at.id = g.awayTeamId
    GROUP BY g.homeTeamId, g.awayTeamId, gameDay, g.season
    HAVING COUNT(*) > 1
    ORDER BY g.season, gameDay
  `)

  const duplicates: DuplicateGame[] = []

  for (const row of result.rows) {
    duplicates.push({
      homeTeamName: row.homeTeamName as string,
      awayTeamName: row.awayTeamName as string,
      date:         row.gameDay as string,
      season:       row.season as string,
      gameIds:      (row.gameIds as string).split('|'),
      count:        row.cnt as number,
    })
  }

  console.log(`   Found ${duplicates.length} duplicate game group(s)`)
  return duplicates
}

// ─── Section 3: Missing MSO Games ─────────────────────────────────────────────
interface MissingGame {
  msoId: number
  awayTeam: string
  homeTeam: string
  awayScore: number
  homeScore: number
  date: string | null
  inDb: boolean
}

async function getExistingMsoIds(): Promise<Set<string>> {
  // Check if there's a driveUrl or external ID field we can use
  // Looking at the schema, Game has a driveUrl field — MSO IDs may not be stored
  // We'll look for games by MSO game IDs stored in driveUrl or check by team+date
  // Since the schema doesn't have a msoGameId field, we track by team names + date
  return new Set<string>()
}

async function scanMsoRange(
  start: number,
  end: number,
  step: number,
  label: string,
  existingGames: { homeTeamName: string; awayTeamName: string; date: string }[],
  clusterIds: Set<number>
): Promise<MissingGame[]> {
  const found: MissingGame[] = []
  const ids: number[] = []

  for (let id = start; id <= end; id += step) {
    ids.push(id)
  }

  console.log(`   Scanning "${label}": ${ids.length} IDs (${start}–${end}, step=${step})`)

  let scanned = 0
  for (const id of ids) {
    await sleep(RATE_LIMIT_MS)
    scanned++

    if (scanned % 100 === 0) {
      process.stdout.write(`\r   Progress: ${scanned}/${ids.length} (${Math.round(scanned/ids.length*100)}%)  `)
    }

    try {
      const url = `${BASE_URL}/basket/visitor/league/schedule_scores/game_score_basket.aspx?IDLeague=${LEAGUE_ID}&IDGame=${id}`
      const html = await fetchUrl(url)
      const game = quickParse(html)

      if (!game) continue
      if (!isImbaGame(game)) continue

      // If coarse scan (step > 1), mark this as a cluster to fully scan
      if (step > 1) {
        clusterIds.add(id)
      }

      // Check if this game is already in the DB
      const dateStr = game.date ? game.date.toISOString().split('T')[0] : null
      const alreadyInDb = dateStr ? existingGames.some(eg => {
        const sameDay = eg.date.startsWith(dateStr)
        const sameMatchup = (
          (eg.homeTeamName === game.homeTeam && eg.awayTeamName === game.awayTeam) ||
          (eg.homeTeamName === game.awayTeam && eg.awayTeamName === game.homeTeam)
        )
        return sameDay && sameMatchup
      }) : false

      found.push({
        msoId:     id,
        awayTeam:  game.awayTeam,
        homeTeam:  game.homeTeam,
        awayScore: game.awayScore,
        homeScore: game.homeScore,
        date:      dateStr,
        inDb:      alreadyInDb,
      })
    } catch (_) {
      // skip errors silently for scanning
    }
  }

  if (scanned >= 100) process.stdout.write('\n')
  return found
}

async function scanClusters(
  clusterIds: Set<number>,
  existingGames: { homeTeamName: string; awayTeamName: string; date: string }[]
): Promise<MissingGame[]> {
  if (clusterIds.size === 0) return []

  const found: MissingGame[] = []
  const sortedClusters = Array.from(clusterIds).sort((a, b) => a - b)

  console.log(`\n   Coarse scan found ${clusterIds.size} cluster center(s), now doing full scans around them...`)

  // Group nearby cluster centers together, expand each by ±60
  const WINDOW = 60
  const ranges: { start: number; end: number }[] = []

  for (const center of sortedClusters) {
    const rangeStart = center - WINDOW
    const rangeEnd = center + WINDOW
    if (ranges.length > 0 && ranges[ranges.length - 1].end >= rangeStart - 1) {
      // Merge with previous
      ranges[ranges.length - 1].end = Math.max(ranges[ranges.length - 1].end, rangeEnd)
    } else {
      ranges.push({ start: rangeStart, end: rangeEnd })
    }
  }

  for (const range of ranges) {
    console.log(`   Full cluster scan: ${range.start}–${range.end}`)
    const dummySet = new Set<number>()
    const results = await scanMsoRange(range.start, range.end, 1, 'cluster', existingGames, dummySet)
    found.push(...results)
  }

  return found
}

async function findMissingMsoGames(): Promise<MissingGame[]> {
  console.log('\n[3/3] Scanning MSO for missing IMBA games...')

  // Load existing games from DB for comparison
  const dbGames = await db.execute(`
    SELECT
      ht.name AS homeTeamName,
      at.name AS awayTeamName,
      g.date
    FROM Game g
    JOIN Team ht ON ht.id = g.homeTeamId
    JOIN Team at ON at.id = g.awayTeamId
    WHERE g.played = 1
  `)

  const existingGames = dbGames.rows.map((row: any) => ({
    homeTeamName: row.homeTeamName as string,
    awayTeamName: row.awayTeamName as string,
    date:         (row.date as string) || '',
  }))

  console.log(`   Loaded ${existingGames.length} existing played games from DB for comparison`)

  const allFound: MissingGame[] = []
  const clusterIds = new Set<number>()

  for (const range of MSO_RANGES) {
    const results = await scanMsoRange(
      range.start, range.end, range.step, range.label, existingGames, clusterIds
    )
    allFound.push(...results)

    const imbaOnly = results.filter(g => !g.inDb)
    if (results.length > 0) {
      console.log(`   "${range.label}": ${results.length} IMBA game(s) found, ${imbaOnly.length} potentially missing from DB`)
    }
  }

  // Full scan of clusters found during coarse scan of the large range
  if (clusterIds.size > 0) {
    const clusterResults = await scanClusters(clusterIds, existingGames)
    // Deduplicate by msoId
    const existingIds = new Set(allFound.map(g => g.msoId))
    for (const g of clusterResults) {
      if (!existingIds.has(g.msoId)) {
        allFound.push(g)
        existingIds.add(g.msoId)
      }
    }
  }

  return allFound
}

// ─── Report Printing ──────────────────────────────────────────────────────────
function printReport(
  corrupted: CorruptedStat[],
  duplicates: DuplicateGame[],
  msoGames: MissingGame[]
) {
  const hr = '='.repeat(70)
  const hr2 = '-'.repeat(70)

  console.log('\n\n' + hr)
  console.log('  IMBA DATA AUDIT REPORT')
  console.log(hr)

  // ── Section 1 ──
  console.log('\n' + hr2)
  console.log('SECTION 1: CORRUPTED PLAYER STATS')
  console.log(hr2)

  if (corrupted.length === 0) {
    console.log('  No corrupted stats found.')
  } else {
    console.log(`  Found ${corrupted.length} suspicious stat row(s):\n`)
    for (const s of corrupted) {
      const dateStr = s.gameDate ? new Date(s.gameDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown date'
      console.log(`  Player : ${s.playerName}`)
      console.log(`  Team   : ${s.teamName}`)
      console.log(`  Game   : ${dateStr} | Season: ${s.gameSeason}`)
      console.log(`  Stats  : pts=${s.points}, 2PM=${s.twoPtMade}, 3PM=${s.threeMade}, FTM=${s.ftMade}, ftAtt=${s.ftAtt}, blk=${s.blocks}`)
      console.log(`  Calc   : Expected points = ${s.twoPtMade}*2 + ${s.threeMade}*3 + ${s.ftMade} = ${s.calcPoints}`)
      for (const r of s.reasons) {
        console.log(`  FLAG   : ${r}`)
      }
      console.log(`  Stat ID: ${s.statId}`)
      console.log()
    }
  }

  // ── Section 2 ──
  console.log(hr2)
  console.log('SECTION 2: DUPLICATE GAMES')
  console.log(hr2)

  if (duplicates.length === 0) {
    console.log('  No duplicate games found.')
  } else {
    console.log(`  Found ${duplicates.length} duplicate game group(s):\n`)
    for (const d of duplicates) {
      console.log(`  ${d.awayTeamName} @ ${d.homeTeamName}`)
      console.log(`  Date   : ${d.date} | Season: ${d.season}`)
      console.log(`  Count  : ${d.count} duplicate records`)
      console.log(`  IDs    : ${d.gameIds.join(', ')}`)
      console.log()
    }
  }

  // ── Section 3 ──
  console.log(hr2)
  console.log('SECTION 3: MISSING MSO GAMES')
  console.log(hr2)

  const missingFromDb = msoGames.filter(g => !g.inDb)
  const alreadyInDb = msoGames.filter(g => g.inDb)

  if (msoGames.length === 0) {
    console.log('  No IMBA games found in the scanned MSO ID ranges.')
  } else {
    console.log(`  Total IMBA games found in scanned ranges: ${msoGames.length}`)
    console.log(`  Already in DB: ${alreadyInDb.length}`)
    console.log(`  NOT in DB (potentially missing): ${missingFromDb.length}`)

    if (missingFromDb.length > 0) {
      console.log('\n  GAMES NOT IN DB:')
      for (const g of missingFromDb.sort((a, b) => (a.date || '').localeCompare(b.date || '') || a.msoId - b.msoId)) {
        const dateStr = g.date || 'Unknown date'
        console.log(`  MSO ID: ${g.msoId} | ${dateStr} | ${g.awayTeam} (${g.awayScore}) @ ${g.homeTeam} (${g.homeScore})`)
      }
    }

    if (alreadyInDb.length > 0) {
      console.log('\n  GAMES ALREADY IN DB (for reference):')
      for (const g of alreadyInDb.sort((a, b) => (a.date || '').localeCompare(b.date || '') || a.msoId - b.msoId)) {
        const dateStr = g.date || 'Unknown date'
        console.log(`  MSO ID: ${g.msoId} | ${dateStr} | ${g.awayTeam} (${g.awayScore}) @ ${g.homeTeam} (${g.homeScore}) [already in DB]`)
      }
    }
  }

  console.log('\n' + hr)
  console.log('  END OF AUDIT REPORT')
  console.log(hr + '\n')
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!process.env.TURSO_DATABASE_URL) {
    console.error('ERROR: TURSO_DATABASE_URL env var not set')
    process.exit(1)
  }
  if (!process.env.TURSO_AUTH_TOKEN) {
    console.error('ERROR: TURSO_AUTH_TOKEN env var not set')
    process.exit(1)
  }

  console.log('IMBA Comprehensive Data Audit')
  console.log('==============================')
  console.log(`DB: ${process.env.TURSO_DATABASE_URL}`)
  console.log('Starting audit...')

  const startTime = Date.now()

  // Run DB checks first (fast)
  const corrupted = await checkCorruptedStats()
  const duplicates = await checkDuplicateGames()

  // Then do the slow MSO scan
  const msoGames = await findMissingMsoGames()

  const elapsed = Math.round((Date.now() - startTime) / 1000)
  console.log(`\nAudit complete in ${elapsed}s`)

  printReport(corrupted, duplicates, msoGames)
}

main().catch(e => {
  console.error('Fatal error:', e)
  process.exit(1)
})
