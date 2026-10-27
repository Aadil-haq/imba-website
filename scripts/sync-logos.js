/**
 * Copies team logos from the SQLite export to production Supabase.
 * Matches teams first by exact slug, then by team name.
 * Only updates production teams that currently have no logo.
 *
 * Usage:
 *   DIRECT_URL="postgresql://..." node scripts/sync-logos.js /path/to/export.db
 */

const Database = require('better-sqlite3')
const { Pool } = require('pg')

const sqlitePath = process.argv[2]
if (!sqlitePath) {
  console.error('Usage: DIRECT_URL=... node scripts/sync-logos.js <path-to-sqlite.db>')
  process.exit(1)
}
const pgUrl = process.env.DIRECT_URL
if (!pgUrl) { console.error('DIRECT_URL required'); process.exit(1) }

const sqlite = new Database(sqlitePath, { readonly: true })
const pool = new Pool({ connectionString: pgUrl, ssl: { rejectUnauthorized: false } })

async function main() {
  const client = await pool.connect()
  console.log('Connected.\n')

  // All SQLite teams with logos
  const sqliteTeams = sqlite.prepare(
    "SELECT id, slug, name, logo FROM Team WHERE logo IS NOT NULL AND logo != ''"
  ).all()
  console.log(`SQLite teams with logos: ${sqliteTeams.length}`)

  // All production teams without logos, indexed by slug and name
  const prodRes = await client.query(
    `SELECT id, slug, name FROM "Team" WHERE logo IS NULL OR logo = ''`
  )
  const prodBySlug = {}
  const prodByName = {}  // name (lower) → array of teams (could be multiple seasons)
  for (const t of prodRes.rows) {
    prodBySlug[t.slug] = t
    const key = t.name.toLowerCase().trim()
    if (!prodByName[key]) prodByName[key] = []
    prodByName[key].push(t)
  }

  const updates = []  // { prodId, logo, reason }
  const skipped = []

  for (const src of sqliteTeams) {
    // 1. Exact slug match
    if (prodBySlug[src.slug]) {
      updates.push({ prodId: prodBySlug[src.slug].id, slug: src.slug, logo: src.logo,
        reason: `slug match (${src.slug})` })
      continue
    }

    // 2. Name match — apply to ALL production teams with this name that lack a logo
    const nameKey = src.name.toLowerCase().trim()
    const nameMatches = prodByName[nameKey] || []
    if (nameMatches.length > 0) {
      for (const m of nameMatches) {
        updates.push({ prodId: m.id, slug: m.slug, logo: src.logo,
          reason: `name match "${src.name}" (src slug: ${src.slug} → prod slug: ${m.slug})` })
      }
      continue
    }

    skipped.push(`  SKIP: slug="${src.slug}" name="${src.name}" — no match in production`)
  }

  if (skipped.length) {
    console.log('\nSkipped (no production match):')
    skipped.forEach(s => console.log(s))
  }

  console.log(`\nUpdates to apply: ${updates.length}`)
  updates.forEach(u => console.log(`  → ${u.slug} (${u.reason.split('(')[0].trim()})`))

  if (updates.length === 0) { console.log('Nothing to do.'); return }

  // Apply updates in batches
  await client.query('BEGIN')
  let done = 0
  for (const u of updates) {
    await client.query(`UPDATE "Team" SET logo = $1 WHERE id = $2`, [u.logo, u.prodId])
    done++
    process.stdout.write(`\r  Updating logos: ${done}/${updates.length}`)
  }
  await client.query('COMMIT')
  console.log('\n')

  // Verify
  const after = await client.query(
    `SELECT COUNT(*) as with_logo FROM "Team" WHERE logo IS NOT NULL AND logo != ''`
  )
  console.log(`Production teams with logos after update: ${after.rows[0].with_logo}`)
  console.log('Done.')

  client.release()
  sqlite.close()
  await pool.end()
}

main().catch(err => { console.error(err); process.exit(1) })
