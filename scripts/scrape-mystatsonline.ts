/**
 * IMBA Full Scraper — MyStatsOnline
 * Scrapes all seasons, teams, rosters, games, and per-game box scores
 *
 * Run: DATABASE_URL="file:./dev.db" npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/scrape-mystatsonline.ts
 */

import puppeteer, { Browser, Page } from 'puppeteer'
import { prisma } from '../lib/db'

const BASE = 'https://www.mystatsonline.com'
const LEAGUE_ID = '65672'
const DELAY = (ms: number) => new Promise(r => setTimeout(r, ms))

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScrapedPlayer {
  name: string
  number: number
  position: string
  teamName: string
}

interface ScrapedGame {
  date: string
  time: string
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
  gameId: string
  week: number
  location: string
  played: boolean
}

interface BoxScoreRow {
  playerName: string
  number: number
  pts: number; reb: number; ast: number; stl: number; blk: number; to: number
  fgm: number; fga: number; tpm: number; tpa: number; ftm: number; fta: number
}

interface BoxScore {
  gameId: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  home: BoxScoreRow[]
  away: BoxScoreRow[]
}

interface Season {
  name: string
  divisionIndex: number   // dropdown index
  league: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function safeText(page: Page, selector: string): Promise<string> {
  try { return (await page.$eval(selector, el => el.textContent || '')).trim() }
  catch { return '' }
}

async function waitAndGet(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
  await DELAY(800)
}

function slugify(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function teamColor(name: string): string {
  const colors: Record<string, string> = {
    'pool party': '#F5A623', 'atx': '#4A9FE3', 'companions': '#27AE60',
    'irving ogs': '#9B59B6', 'amb': '#E74C3C', 'akhi ballers': '#1ABC9C',
    'baitul ballers': '#E67E22', 'ahad': '#8E44AD',
    'star cllctv': '#2ECC71', 'swish kebabs': '#E91E63',
    'baja blast': '#00BCD4', 'al shabab': '#FF5722',
    'salaam squad': '#3F51B5', 'the rich': '#795548',
  }
  return colors[name.toLowerCase()] || '#4A9FE3'
}

// ─── Scrapers ─────────────────────────────────────────────────────────────────

/** Get all available seasons from the dropdown */
async function scrapeSeasons(page: Page): Promise<Season[]> {
  await waitAndGet(page, `${BASE}/basket/visitor/league/schedule_scores/schedule.aspx?IDLeague=${LEAGUE_ID}`)

  const seasons: Season[] = await page.evaluate(() => {
    const results: Season[] = []
    // Look for select dropdowns or anchor-based season switchers
    document.querySelectorAll('select option').forEach((opt, i) => {
      const el = opt as HTMLOptionElement
      const text = el.textContent?.trim() || ''
      if (text && el.value && text !== '') {
        results.push({ name: text, divisionIndex: i, league: text })
      }
    })
    // Also look for links in division nav
    document.querySelectorAll('a[href*="IDDivision"], a[href*="idsaison"], a[href*="IDSeason"]').forEach(a => {
      const href = (a as HTMLAnchorElement).href
      const text = a.textContent?.trim() || ''
      results.push({ name: text, divisionIndex: parseInt(href.split('=').pop() || '0'), league: text })
    })
    return results
  })

  console.log(`   Found ${seasons.length} season options in dropdowns`)
  return seasons
}

/** Get the schedule for a specific division/season URL */
async function scrapeSchedule(page: Page, url: string, seasonName: string): Promise<ScrapedGame[]> {
  await waitAndGet(page, url)

  const games: ScrapedGame[] = await page.evaluate((season) => {
    const results: ScrapedGame[] = []
    let week = 0
    let lastDate = ''

    document.querySelectorAll('table tr, .game-row, tr').forEach(row => {
      const cells = Array.from(row.querySelectorAll('td, th'))
      if (cells.length < 3) return

      const text = cells.map(c => c.textContent?.trim() || '')

      // Detect week/date header rows
      if (text[0] && text[0].match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i)) {
        week++
        lastDate = text[0]
        return
      }

      // Game row: look for time, team names, scores
      const timeMatch = text.find(t => t.match(/\d+:\d+\s*(AM|PM)/i))
      if (!timeMatch) return

      // Get game ID from onclick
      const link = row.querySelector('a[href*="game_score"], a[onclick*="game_score"]')
      const onclick = link?.getAttribute('href') || link?.getAttribute('onclick') || ''
      const gameIdMatch = onclick.match(/\((\d+)\)/)
      const gameId = gameIdMatch ? gameIdMatch[1] : ''

      const teamCells = Array.from(row.querySelectorAll('td')).filter(td => {
        const t = td.textContent?.trim() || ''
        return t.length > 2 && !t.match(/^\d+$/) && !t.match(/\d+:\d+/)
      })

      results.push({
        date: lastDate,
        time: timeMatch,
        homeTeam: '',
        awayTeam: '',
        homeScore: null,
        awayScore: null,
        gameId,
        week,
        location: 'Irving Masjid Gym',
        played: false,
      })
    })

    return results
  }, seasonName)

  return games
}

/** Scrape full schedule table properly */
async function scrapeScheduleFull(page: Page, url: string, seasonName: string): Promise<ScrapedGame[]> {
  await waitAndGet(page, url)
  await DELAY(1000)

  // Extract raw HTML and parse manually
  const html = await page.content()

  const games: ScrapedGame[] = await page.evaluate((season) => {
    const results: ScrapedGame[] = []
    let week = 0
    let currentDate = ''

    // Find all rows in the schedule table
    const rows = Array.from(document.querySelectorAll('tr'))

    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll('td'))
      const fullText = row.textContent?.trim() || ''

      // Date header row
      const dateMatch = fullText.match(/(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday),?\s+\w+\s+\d+,?\s+\d{4}/i)
      if (dateMatch) {
        week++
        currentDate = dateMatch[0]
        continue
      }

      // Game row detection: has a time
      if (cells.length >= 4 && fullText.match(/\d+:\d+\s*(AM|PM)/i)) {
        const timeEl = cells.find(c => c.textContent?.match(/\d+:\d+\s*(AM|PM)/i))
        const time = timeEl?.textContent?.trim() || ''

        // Get game ID
        const links = Array.from(row.querySelectorAll('a'))
        let gameId = ''
        for (const link of links) {
          const href = link.getAttribute('href') || ''
          const m = href.match(/game_score_basket\((\d+)\)/) || href.match(/IDGame=(\d+)/)
          if (m) { gameId = m[1]; break }
          const onclick = link.getAttribute('onclick') || ''
          const om = onclick.match(/(\d{7,})/)
          if (om) { gameId = om[1]; break }
        }

        // Find score: pattern like "52-48" or two number cells
        const scoreText = fullText.match(/(\d+)\s*[-–]\s*(\d+)/)
        let homeScore: number | null = null
        let awayScore: number | null = null
        let played = false
        if (scoreText) {
          awayScore = parseInt(scoreText[1])
          homeScore = parseInt(scoreText[2])
          played = true
        }

        // Get team names from cells (usually cols 1 and 3, or similar)
        const textCells = cells.map(c => c.textContent?.trim() || '').filter(t => t)
        // Remove time and score cells
        const teamCells = textCells.filter(t =>
          !t.match(/^\d+:\d+/) && !t.match(/^\d+-\d+$/) && !t.match(/^W$|^L$|^-$/) && t.length > 1
        )

        const awayTeam = teamCells[0] || ''
        const homeTeam = teamCells[1] || ''

        if (awayTeam && homeTeam) {
          results.push({
            date: currentDate,
            time,
            awayTeam,
            homeTeam,
            awayScore,
            homeScore,
            gameId,
            week,
            location: 'Irving Masjid Gym',
            played,
          })
        }
      }
    }

    return results
  }, seasonName)

  return games
}

/** Get all game IDs visible on schedule page */
async function getGameIds(page: Page): Promise<{ id: string, date: string, time: string, away: string, home: string, awayScore: number|null, homeScore: number|null, week: number }[]> {
  const games = await page.evaluate(() => {
    const results: any[] = []
    let week = 0
    let currentDate = ''

    const rows = Array.from(document.querySelectorAll('tr'))
    for (const row of rows) {
      const rowText = row.textContent || ''

      // Date row detection
      const dateMatch = rowText.trim().match(/^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday).+\d{4}/)
      if (dateMatch) {
        week++
        currentDate = rowText.trim().split('\n')[0].trim()
        continue
      }

      // Look for game links
      const links = Array.from(row.querySelectorAll('a'))
      for (const link of links) {
        const href = link.getAttribute('href') || ''
        const gameMatch = href.match(/game_score_basket\((\d+)\)/)
        if (!gameMatch) continue

        const gameId = gameMatch[1]
        const cells = Array.from(row.querySelectorAll('td')).map(c => c.textContent?.trim() || '')
        const time = cells.find(c => c.match(/\d+:\d+\s*[AP]M/i)) || ''

        // Score detection
        let awayScore: number | null = null
        let homeScore: number | null = null
        const scoreCell = cells.find(c => c.match(/^\d+\s*[-–]\s*\d+$/))
        if (scoreCell) {
          const parts = scoreCell.split(/[-–]/).map(Number)
          awayScore = parts[0]; homeScore = parts[1]
        }

        // Team names: filter out time/score/empty
        const teams = cells.filter(c =>
          c && !c.match(/^\d+:\d+/) && !c.match(/^\d+-\d+$/) &&
          !c.match(/^[WL]$/) && c.length > 1 && !c.match(/^-+$/)
        )

        results.push({
          id: gameId, date: currentDate, time,
          away: teams[0] || '', home: teams[1] || '',
          awayScore, homeScore, week
        })
        break
      }
    }
    return results
  })

  return games
}

/** Scrape box score for a single game using popup URL */
async function scrapeBoxScore(page: Page, gameId: string): Promise<BoxScore | null> {
  // The popup is triggered by javascript:game_score_basket(ID)
  // We need to intercept the popup - call the function directly
  try {
    // First try to find the actual URL pattern
    const popupUrl = await page.evaluate((gid) => {
      // Try to get the function source
      const fnSource = typeof (window as any).game_score_basket !== 'undefined'
        ? (window as any).game_score_basket.toString()
        : ''
      return fnSource
    }, gameId)

    // Try navigating to popup directly
    const possibleUrls = [
      `${BASE}/basket/visitor/league/game_score/game_score_basket.aspx?IDGame=${gameId}&IDLeague=65672`,
      `${BASE}/basket/visitor/game_score_basket.aspx?IDGame=${gameId}`,
      `${BASE}/basket/game_score_basket.aspx?IDGame=${gameId}&IDLeague=65672`,
    ]

    for (const url of possibleUrls) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 })
      const bodyText = await page.evaluate(() => document.body.textContent || '')
      if (!bodyText.includes('does not exist') && !bodyText.includes('Error 404')) {
        // Parse the box score
        return await parseBoxScore(page, gameId)
      }
    }

    // Try triggering the popup and catching it
    return null
  } catch (e) {
    return null
  }
}

async function parseBoxScore(page: Page, gameId: string): Promise<BoxScore | null> {
  return await page.evaluate((gid) => {
    const tables = Array.from(document.querySelectorAll('table'))
    const teams: string[] = []
    const scores: number[] = []

    // Get team names and scores from header
    document.querySelectorAll('h2, h3, .team-name, th').forEach(el => {
      const t = el.textContent?.trim() || ''
      if (t && t.length > 2 && t.length < 50 && !t.match(/^[0-9]/)) teams.push(t)
    })

    const parseRows = (table: HTMLTableElement): any[] => {
      const rows: any[] = []
      const headers = Array.from(table.querySelectorAll('tr:first-child th, tr:first-child td'))
        .map(h => h.textContent?.trim().toUpperCase() || '')

      table.querySelectorAll('tr').forEach((row, i) => {
        if (i === 0) return
        const cells = Array.from(row.querySelectorAll('td')).map(c => c.textContent?.trim() || '')
        if (cells.length < 5) return

        const name = cells[0] || cells[1] || ''
        if (!name || name.match(/^total/i)) return

        const getNum = (idx: number) => parseInt(cells[idx] || '0') || 0

        rows.push({
          playerName: name,
          number: 0,
          pts: getNum(1), reb: getNum(2), ast: getNum(3),
          stl: getNum(4), blk: getNum(5), to: getNum(6),
          fgm: getNum(7), fga: getNum(8),
          tpm: getNum(9), tpa: getNum(10),
          ftm: getNum(11), fta: getNum(12),
        })
      })
      return rows
    }

    return {
      gameId: gid,
      homeTeam: teams[0] || '',
      awayTeam: teams[1] || '',
      homeScore: 0,
      awayScore: 0,
      home: tables[0] ? parseRows(tables[0] as HTMLTableElement) : [],
      away: tables[1] ? parseRows(tables[1] as HTMLTableElement) : [],
    }
  }, gameId)
}

/** Scrape team roster from team page */
async function scrapeTeamRoster(page: Page, teamId: string, leagueId: string): Promise<ScrapedPlayer[]> {
  const urls = [
    `${BASE}/basket/visitor/league/team/team_basket.aspx?IDTeam=${teamId}&IDLeague=${leagueId}`,
    `${BASE}/basket/visitor/team/team_basket.aspx?IDTeam=${teamId}&IDLeague=${leagueId}`,
  ]

  for (const url of urls) {
    try {
      await waitAndGet(page, url)
      const text = await page.evaluate(() => document.body.textContent || '')
      if (text.includes('does not exist')) continue

      return await page.evaluate(() => {
        const players: ScrapedPlayer[] = []
        document.querySelectorAll('table tr').forEach(row => {
          const cells = Array.from(row.querySelectorAll('td')).map(c => c.textContent?.trim() || '')
          if (cells.length >= 2) {
            const numMatch = cells[0].match(/^(\d+)$/)
            const name = cells[1] || cells[0]
            if (name && name.length > 2 && !name.match(/^(name|player|#)/i)) {
              players.push({
                name,
                number: numMatch ? parseInt(numMatch[1]) : 0,
                position: cells[2] || 'G',
                teamName: '',
              })
            }
          }
        })
        return players
      })
    } catch { continue }
  }
  return []
}

/** Scrape player stats for a specific division */
async function scrapePlayerStats(page: Page, divisionParam: string): Promise<any[]> {
  const url = `${BASE}/basket/visitor/league/stats/player_basket.aspx?IDLeague=${LEAGUE_ID}${divisionParam}`
  await waitAndGet(page, url)
  await DELAY(500)

  return await page.evaluate(() => {
    const players: any[] = []

    document.querySelectorAll('table tr').forEach(row => {
      const cells = Array.from(row.querySelectorAll('td')).map(c => c.textContent?.trim() || '')
      if (cells.length < 10) return

      const name = cells[0] || cells[1]
      if (!name || name.match(/^(player|name|total)/i) || name.length < 2) return

      const n = (i: number) => parseInt(cells[i]) || 0

      players.push({
        name,
        team: cells[1] || '',
        gp: n(2), pts: n(3), reb: n(4), ast: n(5),
        stl: n(6), blk: n(7),
        fgm: n(8), fga: n(9), tpm: n(10), tpa: n(11), ftm: n(12), fta: n(13),
      })
    })

    return players
  })
}

/** Get all division/season select options */
async function getDivisionOptions(page: Page, url: string): Promise<{ text: string, value: string }[]> {
  await waitAndGet(page, url)

  return await page.evaluate(() => {
    const options: { text: string, value: string }[] = []

    // Try select elements
    document.querySelectorAll('select option').forEach(opt => {
      const el = opt as HTMLOptionElement
      const text = el.textContent?.trim() || ''
      const value = el.value || ''
      if (text && value && !text.match(/^--/)) {
        options.push({ text, value })
      }
    })

    // Try list items or links that switch seasons
    document.querySelectorAll('ul.dropdown li a, .season-list a, nav a').forEach(a => {
      const href = (a as HTMLAnchorElement).href
      const text = a.textContent?.trim() || ''
      if (href && text && (href.includes('IDDivision') || href.includes('IDSeason') || href.includes('saison'))) {
        options.push({ text, value: href })
      }
    })

    return options
  })
}

// ─── MAIN SCRAPER ─────────────────────────────────────────────────────────────

async function main() {
  console.log('🏀 IMBA Full Scraper — MyStatsOnline\n')

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 800 })
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')

    // Intercept popups
    const popupData: Record<string, string> = {}
    browser.on('targetcreated', async (target) => {
      if (target.type() === 'page') {
        const popup = await target.page()
        if (popup) {
          await popup.waitForSelector('body', { timeout: 5000 }).catch(() => {})
          const url = popup.url()
          const html = await popup.content().catch(() => '')
          popupData[url] = html
          console.log(`   📦 Popup captured: ${url}`)
          await popup.close()
        }
      }
    })

    // ── STEP 1: Discover division IDs ─────────────────────────────────────────
    console.log('🔍 Step 1: Discovering all seasons/divisions...')
    await waitAndGet(page, `${BASE}/basket/visitor/league/schedule_scores/schedule.aspx?IDLeague=${LEAGUE_ID}`)

    // Get the page source to find season switching mechanism
    const pageSource = await page.content()

    // Extract all onclick/href patterns that contain division IDs
    const divisionLinks = await page.evaluate(() => {
      const found: { text: string, id: string, url: string }[] = []

      // Look for all links with division/season parameters
      document.querySelectorAll('a, option').forEach(el => {
        const href = (el as HTMLAnchorElement).href || (el as HTMLOptionElement).value || ''
        const text = el.textContent?.trim() || ''
        const matches = href.match(/[?&](IDDivision|IDSeason|idsaison|division)=(\d+)/i)
        if (matches && text) {
          found.push({ text, id: matches[2], url: href })
        }
      })

      // Also check onclick attributes
      document.querySelectorAll('[onclick]').forEach(el => {
        const onclick = el.getAttribute('onclick') || ''
        const m = onclick.match(/(\d{5,})/)
        if (m) found.push({ text: el.textContent?.trim() || '', id: m[1], url: onclick })
      })

      return found
    })

    console.log('   Division links found:', divisionLinks)

    // Trigger click on the schedule dropdown to reveal options
    const seasonOptions = await page.evaluate(() => {
      const results: { text: string, href: string }[] = []
      // Find dropdown menus, navigation lists etc
      document.querySelectorAll('ul li a, .nav li a, .menu a, select option').forEach(el => {
        const text = el.textContent?.trim() || ''
        const href = (el as HTMLAnchorElement).href || (el as HTMLOptionElement).value || ''
        if (text && href && (
          text.match(/winter|summer|fall|season|division|d[1-4]/i) ||
          href.match(/IDDivision|schedule|stats/i)
        )) {
          results.push({ text, href })
        }
      })
      return results
    })

    console.log(`   Season options from page: ${seasonOptions.length}`)
    seasonOptions.slice(0, 20).forEach(s => console.log(`      - ${s.text}: ${s.href}`))

    // ── STEP 2: Get game IDs from current season ───────────────────────────────
    console.log('\n📅 Step 2: Scraping game IDs and schedule...')
    await waitAndGet(page, `${BASE}/basket/visitor/league/schedule_scores/schedule.aspx?IDLeague=${LEAGUE_ID}`)

    const currentGames = await getGameIds(page)
    console.log(`   Found ${currentGames.length} games in current season`)
    currentGames.slice(0, 5).forEach(g => console.log(`      Game ${g.id}: ${g.away} vs ${g.home} (${g.date})`))

    // ── STEP 3: Try game box score popup ──────────────────────────────────────
    console.log('\n🎯 Step 3: Finding game box score URL pattern...')

    // Try triggering a game score popup and capturing it
    if (currentGames.length > 0) {
      const testGameId = currentGames[0].id
      console.log(`   Testing game ID: ${testGameId}`)

      // Set up popup listener before click
      let popupUrl = ''
      const popupPromise = new Promise<string>((resolve) => {
        browser.once('targetcreated', async (target) => {
          if (target.type() === 'page') {
            popupUrl = target.url()
            const popup = await target.page()
            await DELAY(2000)
            const content = await popup?.content() || ''
            await popup?.close()
            resolve(content || popupUrl)
          }
        })
        setTimeout(() => resolve(''), 5000)
      })

      // Click the game link
      const clicked = await page.evaluate((gameId) => {
        const links = Array.from(document.querySelectorAll('a[href*="game_score_basket"]'))
        for (const link of links) {
          const href = link.getAttribute('href') || ''
          if (href.includes(gameId)) {
            (link as HTMLAnchorElement).click()
            return true
          }
        }
        // Try calling the function directly
        if (typeof (window as any).game_score_basket === 'function') {
          (window as any).game_score_basket(parseInt(gameId))
          return true
        }
        return false
      }, testGameId)

      console.log(`   Clicked game link: ${clicked}`)
      const popupContent = await popupPromise
      console.log(`   Popup URL: ${popupUrl}`)

      if (popupUrl && !popupUrl.includes('about:blank')) {
        console.log(`   ✅ Found popup URL pattern: ${popupUrl}`)
      } else if (popupContent) {
        console.log(`   Popup content length: ${popupContent.length}`)
        console.log(`   Content preview: ${popupContent.slice(0, 200)}`)
      }
    }

    // ── STEP 4: Scrape player stats for current season ─────────────────────────
    console.log('\n📊 Step 4: Scraping player stats...')
    await waitAndGet(page, `${BASE}/basket/visitor/league/stats/player_basket.aspx?IDLeague=${LEAGUE_ID}`)

    const currentStats = await page.evaluate(() => {
      const players: any[] = []
      const tables = document.querySelectorAll('table')

      tables.forEach(table => {
        const rows = Array.from(table.querySelectorAll('tr'))
        rows.forEach((row, rowIdx) => {
          if (rowIdx === 0) return // skip header
          const cells = Array.from(row.querySelectorAll('td')).map(c => c.textContent?.trim() || '')
          if (cells.length < 8 || !cells[0]) return
          if (cells[0].match(/^(player|name|total|pts|reb)/i)) return

          const n = (i: number) => parseInt(cells[i]) || 0
          if (cells[0].length < 3) return

          players.push({
            name: cells[0],
            team: cells[1] || '',
            gp: n(2), pts: n(3), reb: n(4), ast: n(5), stl: n(6), blk: n(7),
            fgm: n(8), fga: n(9), tpm: n(10), tpa: n(11), ftm: n(12), fta: n(13),
          })
        })
      })
      return players
    })

    console.log(`   Found ${currentStats.length} player stat rows`)

    // ── STEP 5: Find team roster pages ────────────────────────────────────────
    console.log('\n👥 Step 5: Scraping team rosters...')

    const teamIds: { id: string, name: string }[] = await page.evaluate(() => {
      const teams: { id: string, name: string }[] = []
      document.querySelectorAll('a[href*="team_details_basket"], a[href*="IDTeam"]').forEach(a => {
        const href = (a as HTMLAnchorElement).href
        const m = href.match(/IDTeam=(\d+)/) || href.match(/team_details_basket\((\d+)\)/)
        if (m) {
          teams.push({ id: m[1], name: a.textContent?.trim() || '' })
        }
      })
      // Also check onclick
      document.querySelectorAll('[onclick*="team_details_basket"]').forEach(el => {
        const onclick = el.getAttribute('onclick') || ''
        const m = onclick.match(/team_details_basket\((\d+)\)/)
        if (m) {
          teams.push({ id: m[1], name: el.textContent?.trim() || '' })
        }
      })
      return teams
    })

    console.log(`   Found ${teamIds.length} team IDs`)
    teamIds.forEach(t => console.log(`      Team ${t.id}: ${t.name}`))

    // Try to get team roster for each team
    for (const team of teamIds.slice(0, 2)) {
      console.log(`\n   Trying roster for team ${team.id} (${team.name})...`)

      // Try calling team_details_basket function
      const rosterPromise = new Promise<string>((resolve) => {
        browser.once('targetcreated', async (target) => {
          if (target.type() === 'page') {
            const url = target.url()
            const popup = await target.page()
            await DELAY(2000)
            const content = await popup?.content() || ''
            await popup?.close()
            resolve(url + '|||' + content)
          }
        })
        setTimeout(() => resolve(''), 5000)
      })

      // Navigate back to team stats page first
      await waitAndGet(page, `${BASE}/basket/visitor/league/stats/player_basket.aspx?IDLeague=${LEAGUE_ID}`)

      await page.evaluate((teamId) => {
        if (typeof (window as any).team_details_basket === 'function') {
          (window as any).team_details_basket(parseInt(teamId))
        }
      }, team.id)

      const result = await rosterPromise
      if (result) {
        const [url, content] = result.split('|||')
        console.log(`   Team popup URL: ${url}`)
        console.log(`   Content length: ${content.length}`)
        if (content.length > 100) {
          console.log(`   Content preview: ${content.slice(0, 300)}`)
        }
      }
    }

    // ── FINAL: Save all discovery results ─────────────────────────────────────
    console.log('\n\n=== DISCOVERY SUMMARY ===')
    console.log(`Games found: ${currentGames.length}`)
    console.log(`Player stats: ${currentStats.length}`)
    console.log(`Team IDs: ${teamIds.length}`)
    console.log(`Season options: ${seasonOptions.length}`)
    console.log('\nGame IDs (for box scores):')
    console.log(currentGames.map(g => g.id).join(', '))
    console.log('\nSave the above info - the game popup URL pattern is key.')

  } finally {
    await browser.close()
  }
}

main().catch(e => {
  console.error('Scraper failed:', e)
  process.exit(1)
})
