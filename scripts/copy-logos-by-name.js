/**
 * Copies blob logo URLs to teams that are missing logos,
 * matching by team name against other teams that already have logos.
 * Useful for recurring teams that appear under different season-specific slugs.
 *
 * Usage:
 *   TURSO_DATABASE_URL="..." TURSO_AUTH_TOKEN="..." \
 *     node scripts/copy-logos-by-name.js [season]
 *
 * Example:
 *   node scripts/copy-logos-by-name.js "D2 Comp 2026 Summer"
 */

const { createClient } = require('@libsql/client')

const season = process.argv[2]
if (!season) { console.error('Usage: node scripts/copy-logos-by-name.js "<season>"'); process.exit(1) }

const tursoUrl = (process.env.TURSO_DATABASE_URL || '').replace('libsql://', 'https://')
const tursoToken = process.env.TURSO_AUTH_TOKEN
if (!tursoUrl) { console.error('TURSO_DATABASE_URL required'); process.exit(1) }

const db = createClient({ url: tursoUrl, authToken: tursoToken })

async function main() {
  // All teams that have a blob logo (not base64, not null)
  const withLogos = await db.execute(
    `SELECT id, name, slug, logo FROM Team WHERE logo IS NOT NULL AND logo != '' AND logo NOT LIKE 'data:%'`
  )
  // name (lower) → first blob URL found
  const nameToLogo = {}
  for (const t of withLogos.rows) {
    const key = t.name.toString().toLowerCase().trim()
    if (!nameToLogo[key]) nameToLogo[key] = t.logo
  }
  console.log(`Found ${Object.keys(nameToLogo).length} teams with blob logos\n`)

  // Teams in the target season without a logo
  const missing = await db.execute({
    sql: `
      SELECT DISTINCT t.id, t.name, t.slug, t.logo
      FROM Team t
      JOIN Game g ON g.homeTeamId = t.id OR g.awayTeamId = t.id
      WHERE g.season = ?
        AND (t.logo IS NULL OR t.logo = '' OR t.logo LIKE 'data:%')
      ORDER BY t.name
    `,
    args: [season],
  })
  console.log(`Teams in "${season}" missing logos: ${missing.rows.length}`)

  let updated = 0, skipped = 0
  for (const t of missing.rows) {
    const key = t.name.toString().toLowerCase().trim()
    const logoUrl = nameToLogo[key]
    if (logoUrl) {
      await db.execute({ sql: 'UPDATE Team SET logo = ? WHERE id = ?', args: [logoUrl, t.id] })
      console.log(`  ✓ ${t.name} (${t.slug})`)
      updated++
    } else {
      console.log(`  ✗ ${t.name} — no logo found for this name`)
      skipped++
    }
  }

  console.log(`\nDone. ${updated} updated, ${skipped} still missing.`)
}

main().catch(err => { console.error(err); process.exit(1) })
