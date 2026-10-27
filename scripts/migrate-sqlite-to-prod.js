/**
 * Smart migration from SQLite export → production Supabase PostgreSQL.
 *
 * Strategy:
 *  - Registrations, SiteSettings, Announcements: insert all (production has 0 of these)
 *  - New seasons (D2 Comp 2026 Summer, D2 Rec 2026 Summer): insert teams/players/games/stats
 *    using slug-based ID mapping so we don't violate the unique slug constraint
 *
 * Usage:
 *   DIRECT_URL="postgresql://..." node scripts/migrate-sqlite-to-prod.js /path/to/export.db
 */

const Database = require('better-sqlite3')
const { Pool } = require('pg')

const sqlitePath = process.argv[2]
if (!sqlitePath) {
  console.error('Usage: DIRECT_URL=... node scripts/migrate-sqlite-to-prod.js <path-to-sqlite.db>')
  process.exit(1)
}
const pgUrl = process.env.DIRECT_URL
if (!pgUrl) {
  console.error('DIRECT_URL environment variable is required')
  process.exit(1)
}

const sqlite = new Database(sqlitePath, { readonly: true })
const pool = new Pool({ connectionString: pgUrl, ssl: { rejectUnauthorized: false } })

const NEW_SEASONS = ['D2 Comp 2026 Summer', 'D2 Rec 2026 Summer']

// ── helpers ────────────────────────────────────────────────────────────────

async function insertRows(client, table, rows, conflictCol, updateCols, idMapper) {
  if (rows.length === 0) return
  let done = 0
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200)
    const mapped = idMapper ? batch.map(idMapper) : batch
    const cols = Object.keys(mapped[0])
    const values = []
    const placeholders = mapped.map((row, ri) => {
      const ph = cols.map((_, ci) => `$${ri * cols.length + ci + 1}`)
      cols.forEach(c => values.push(row[c]))
      return `(${ph.join(', ')})`
    })
    const updateClause = updateCols.map(c => `"${c}" = EXCLUDED."${c}"`).join(', ')
    const sql = `
      INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(', ')})
      VALUES ${placeholders.join(', ')}
      ON CONFLICT ("${conflictCol}") DO UPDATE SET ${updateClause}`
    await client.query(sql, values)
    done += batch.length
    process.stdout.write(`\r  ${table}: ${done}/${rows.length}`)
  }
  console.log()
}

// ── main ───────────────────────────────────────────────────────────────────

async function main() {
  const client = await pool.connect()
  console.log('Connected to production PostgreSQL\n')

  try {
    // ── 1. Registrations (all new — production has 0) ──────────────────────
    const regs = sqlite.prepare('SELECT * FROM Registration').all()
    console.log(`Registrations: ${regs.length} to import`)
    await client.query('BEGIN')
    await insertRows(client, 'Registration', regs, 'id', [
      'firstName','lastName','email','phone','age','position','league',
      'teamPref','paymentMethod','paymentStatus','stripeSession','amount',
      'season','createdAt','jerseyNumber','jerseySize','discountCode'
    ])
    await client.query('COMMIT')

    // ── 2. SiteSettings (all new — production has 0) ───────────────────────
    const settings = sqlite.prepare('SELECT * FROM SiteSetting').all()
    console.log(`SiteSettings: ${settings.length} to import`)
    await client.query('BEGIN')
    await insertRows(client, 'SiteSetting', settings, 'key', ['value'])
    await client.query('COMMIT')

    // ── 3. Announcements (all new — production has 0) ─────────────────────
    const announcements = sqlite.prepare('SELECT * FROM Announcement').all()
    console.log(`Announcements: ${announcements.length} to import`)
    await client.query('BEGIN')
    await insertRows(client, 'Announcement', announcements, 'id', [
      'title','body','league','createdAt'
    ])
    await client.query('COMMIT')

    // ── 4. New seasons: Teams ──────────────────────────────────────────────
    console.log(`\nNew seasons: ${NEW_SEASONS.join(', ')}`)

    // teams involved in the new seasons (by slug)
    const newSeasonTeamsSqlite = sqlite.prepare(`
      SELECT DISTINCT t.*
      FROM Team t
      JOIN Game g ON g.homeTeamId = t.id OR g.awayTeamId = t.id
      WHERE g.season IN (${NEW_SEASONS.map(() => '?').join(',')})
    `).all(...NEW_SEASONS)

    // look up which of those slugs already exist in production
    const slugList = newSeasonTeamsSqlite.map(t => `'${t.slug.replace(/'/g, "''")}'`).join(',')
    const existingRes = await client.query(
      `SELECT id, slug FROM "Team" WHERE slug IN (${slugList})`
    )
    const slugToProductionId = {}
    for (const row of existingRes.rows) slugToProductionId[row.slug] = row.id

    // teams that don't exist yet — insert with their original SQLite IDs
    const brandNewTeams = newSeasonTeamsSqlite.filter(t => !slugToProductionId[t.slug])
    if (brandNewTeams.length) {
      console.log(`New teams to insert: ${brandNewTeams.length}`)
      await client.query('BEGIN')
      await insertRows(client, 'Team', brandNewTeams, 'id', [
        'name','slug','color','logo','league','active','createdAt'
      ])
      await client.query('COMMIT')
    }

    // build complete sqlite_team_id → production_team_id map
    const teamIdMap = {}
    for (const t of newSeasonTeamsSqlite) {
      teamIdMap[t.id] = slugToProductionId[t.slug] ?? t.id // new ones keep original id
    }

    console.log(`Teams ready (${Object.keys(teamIdMap).length} mapped)`)

    // ── 5. New seasons: Games ──────────────────────────────────────────────
    const newGames = sqlite.prepare(`
      SELECT * FROM Game WHERE season IN (${NEW_SEASONS.map(() => '?').join(',')})
    `).all(...NEW_SEASONS)

    console.log(`Games: ${newGames.length} to import`)
    await client.query('BEGIN')
    await insertRows(client, 'Game', newGames, 'id', [
      'homeTeamId','awayTeamId','homeScore','awayScore','date','time','location',
      'week','season','league','played','forfeit','driveUrl','label','createdAt'
    ], g => ({ ...g,
      homeTeamId: teamIdMap[g.homeTeamId] ?? g.homeTeamId,
      awayTeamId: teamIdMap[g.awayTeamId] ?? g.awayTeamId,
    }))
    await client.query('COMMIT')

    const newGameIds = newGames.map(g => g.id)

    // ── 6. New seasons: Players ────────────────────────────────────────────
    // players who belong to any of the new-season teams in this SQLite file
    const newSeasonTeamIds = newSeasonTeamsSqlite.map(t => t.id)
    const newPlayers = sqlite.prepare(`
      SELECT * FROM Player WHERE teamId IN (${newSeasonTeamIds.map(() => '?').join(',')})
    `).all(...newSeasonTeamIds)

    // only insert players whose ID doesn't exist in production yet
    if (newPlayers.length) {
      const ids = newPlayers.map(p => `'${p.id}'`).join(',')
      const existingPlayers = await client.query(
        `SELECT id FROM "Player" WHERE id IN (${ids})`
      )
      const existingPlayerIds = new Set(existingPlayers.rows.map(r => r.id))
      const trulyNewPlayers = newPlayers.filter(p => !existingPlayerIds.has(p.id))

      console.log(`Players: ${trulyNewPlayers.length} new to import (${newPlayers.length - trulyNewPlayers.length} already exist)`)
      if (trulyNewPlayers.length) {
        await client.query('BEGIN')
        await insertRows(client, 'Player', trulyNewPlayers, 'id', [
          'name','number','position','isSub','teamId','createdAt','season'
        ], p => ({ ...p, teamId: teamIdMap[p.teamId] ?? p.teamId }))
        await client.query('COMMIT')
      }
    }

    // ── 7. New seasons: PlayerGameStats ────────────────────────────────────
    if (newGameIds.length) {
      const statsPlaceholders = newGameIds.map(() => '?').join(',')
      const newStats = sqlite.prepare(`
        SELECT * FROM PlayerGameStat WHERE gameId IN (${statsPlaceholders})
      `).all(...newGameIds)

      console.log(`Stats: ${newStats.length} to import`)
      if (newStats.length) {
        await client.query('BEGIN')
        await insertRows(client, 'PlayerGameStat', newStats, 'id', [
          'playerId','gameId','teamId','points','rebounds','assists','steals',
          'blocks','turnovers','twoPtMade','twoPtAtt','threeMade','threeAtt',
          'ftMade','ftAtt','fouls'
        ], s => ({ ...s, teamId: teamIdMap[s.teamId] ?? s.teamId }))
        await client.query('COMMIT')
      }
    }

    // ── done ───────────────────────────────────────────────────────────────
    console.log('\nVerifying final counts...')
    const res = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM "Registration") as registrations,
        (SELECT COUNT(*) FROM "SiteSetting") as settings,
        (SELECT COUNT(*) FROM "Announcement") as announcements,
        (SELECT COUNT(*) FROM "Team") as teams,
        (SELECT COUNT(*) FROM "Game") as games,
        (SELECT COUNT(*) FROM "Player") as players,
        (SELECT COUNT(*) FROM "PlayerGameStat") as stats
    `)
    console.log('Production counts after migration:')
    console.table(res.rows[0])
    console.log('\nMigration complete.')

  } catch (err) {
    try { await client.query('ROLLBACK') } catch {}
    console.error('\nMigration failed:', err.message)
    throw err
  } finally {
    client.release()
    sqlite.close()
    await pool.end()
  }
}

main().catch(err => { console.error(err); process.exit(1) })
