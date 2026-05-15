import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

async function main() {
  // D2 2025 Summer teams and Halal Hustlers / Barakah Ballers
  const teams = await client.execute(`SELECT id, name FROM Team WHERE name LIKE '%Halal%' OR name LIKE '%Barakah%' OR name LIKE '%Hustler%' OR name LIKE '%Baller%'`)
  console.log('Relevant teams:')
  teams.rows.forEach(r => console.log(' ', r[0], r[1]))

  // D2 2025 Summer existing games
  const d2games = await client.execute(`
    SELECT g.id, g.week, ht.name, at.name, g.homeScore, g.awayScore, g.season
    FROM Game g
    JOIN Team ht ON ht.id = g.homeTeamId
    JOIN Team at ON at.id = g.awayTeamId
    WHERE g.season LIKE '%2025 Summer%'
    ORDER BY g.week
  `)
  console.log('\nD2 2025 Summer games:')
  d2games.rows.forEach(r => console.log(`  id:${r[0]} wk${r[1]}: ${r[2]} vs ${r[3]} | ${r[4]}-${r[5]} | ${r[6]}`))

  // D1 2023-24 Winter - games with 0 stats (the problematic ones)
  const d1bad = await client.execute(`
    SELECT g.id, g.week, ht.name, at.name, g.homeScore, g.awayScore, COUNT(pgs.id) as statCount
    FROM Game g
    JOIN Team ht ON ht.id = g.homeTeamId
    JOIN Team at ON at.id = g.awayTeamId
    LEFT JOIN PlayerGameStat pgs ON pgs.gameId = g.id
    WHERE g.season = 'D1 2023-24 Winter' AND g.week >= 7
    GROUP BY g.id
    ORDER BY g.week
  `)
  console.log('\nD1 2023-24 Winter wk7+:')
  d1bad.rows.forEach(r => console.log(`  id:${r[0]} wk${r[1]}: ${r[2]} vs ${r[3]} | ${r[4]}-${r[5]} | stats:${r[6]}`))
}
main().catch(e => { console.error(e); process.exit(1) })
