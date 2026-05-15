/**
 * Scan MSO game ID range to find all Ahad D1 games so we can reimport them
 * with the 19-col fix.
 */

import * as https from 'https'

const LEAGUE_ID = '65672'
const IMBA_TEAMS = new Set([
  'Pool Party', 'ATX', 'Companions', 'Irving OGs', 'Ahad', 'Akhi Ballers', 'Baitul Ballers',
  'Baja Blast', 'STAR CLLCTV', 'Swish Kebabs', 'The Rich', 'AMB', 'Ahbab',
  'Add Others', 'TNZ', 'Al Shabab', 'Salaam Squad', 'Halal Hustlers', 'Fast Break', 'The Askars', 'Spray Dat',
])

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const req = https.request({
      hostname: parsed.hostname, path: parsed.pathname + parsed.search, method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' },
      timeout: 12000,
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

function quickParse(html: string) {
  const spans = [...html.matchAll(/<span class="mso-big mso-bold">([^<]+)<\/span>/g)]
  const ls = html.match(/pnlLeftTotal[^>]*>[\s\S]*?<strong>(\d+)<\/strong>/)
  const rs = html.match(/pnlRightTotal[^>]*>[\s\S]*?<strong>(\d+)<\/strong>/)
  if (spans.length < 2 || !ls || !rs) return null
  const awayTeam = spans[0][1].trim()
  const homeTeam = spans[1][1].trim()
  const awayScore = parseInt(ls[1])
  const homeScore = parseInt(rs[1])
  let date = ''
  const dm = html.match(/(\w+day),?\s+(\w+\s+\d+,?\s*\d{4})/)
  if (dm) date = dm[2].trim()
  return { awayTeam, homeTeam, awayScore, homeScore, date }
}

async function main() {
  // Scan the gap between Dec 7 confirmed IDs and Jan 18 confirmed IDs
  // Known: Dec 7 = ~1824878-1881, Jan 18 = ~1825976-1826056
  // Also scan a bit further to catch Jan 25, Feb 8 etc.
  const RANGES = [
    // The area around known Jan 18 game (1826056) — scan before it for Dec/Jan D1 games
    { start: 1825976, end: 1826200, label: 'Around Jan 18 D1 games' },
    // Also check beyond Jan 18 for any later D1 games (Jan 25, Feb)
    { start: 1826200, end: 1826500, label: 'Post Jan 18 D1 potential' },
  ]

  const found: string[] = []

  for (const { start, end, label } of RANGES) {
    console.log(`\n🔍 ${label} (${start}-${end})...`)
    for (let id = start; id <= end; id++) {
      await new Promise(r => setTimeout(r, 120))
      let html: string
      try { html = await fetchUrl(`https://www.mystatsonline.com/basket/visitor/league/schedule_scores/game_score_basket.aspx?IDLeague=${LEAGUE_ID}&IDGame=${id}`) }
      catch { continue }

      const p = quickParse(html)
      if (!p || !p.awayTeam) continue
      if (!IMBA_TEAMS.has(p.awayTeam) && !IMBA_TEAMS.has(p.homeTeam)) continue

      const isAhad = p.awayTeam === 'Ahad' || p.homeTeam === 'Ahad'
      const marker = isAhad ? '🔴 AHAD' : '🏀'
      console.log(`  ${marker} ${id}: ${p.awayTeam} ${p.awayScore} @ ${p.homeTeam} ${p.homeScore}  [${p.date}]`)
      if (isAhad) found.push(`  { gameId: '${id}', season: 'D1 2025-26 Winter', league: 'Comp' }, // ${p.date}: ${p.awayTeam} @ ${p.homeTeam}`)
    }
  }

  console.log('\n\n📋 AHAD GAME IDs TO ADD TO FIXES:')
  found.forEach(l => console.log(l))
}

main().catch(e => { console.error(e); process.exit(1) })
