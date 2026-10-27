/**
 * One-time migration: converts base64 logo data URIs stored in Team.logo
 * to Vercel Blob URLs. Run this once after the Blob store is connected.
 *
 * Usage:
 *   BLOB_READ_WRITE_TOKEN="..." TURSO_DATABASE_URL="..." TURSO_AUTH_TOKEN="..." \
 *     node scripts/migrate-logos-to-blob.js
 */

const { put } = require('@vercel/blob')
const { createClient } = require('@libsql/client')

const tursoUrl = process.env.TURSO_DATABASE_URL
const tursoToken = process.env.TURSO_AUTH_TOKEN

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('BLOB_READ_WRITE_TOKEN is required.')
  console.error('Set it up: Vercel dashboard → your project → Storage → Create Blob Store')
  process.exit(1)
}
if (!tursoUrl) { console.error('TURSO_DATABASE_URL required'); process.exit(1) }

let url = tursoUrl
if (url.startsWith('libsql://')) url = url.replace('libsql://', 'https://')
const db = createClient({ url, authToken: tursoToken })

async function main() {
  const result = await db.execute(
    "SELECT id, slug, logo FROM Team WHERE logo IS NOT NULL AND logo != '' AND logo LIKE 'data:%'"
  )
  const teams = result.rows
  console.log(`Found ${teams.length} teams with base64 logos to migrate\n`)

  let ok = 0, fail = 0

  for (const team of teams) {
    const { id, slug, logo } = team
    try {
      // Parse "data:<mime>;base64,<data>"
      const match = logo.match(/^data:([^;]+);base64,(.+)$/)
      if (!match) { console.log(`  SKIP ${slug} — unrecognized format`); fail++; continue }

      const [, mime, b64] = match
      const ext = mime.split('/')[1]?.replace('jpeg', 'jpg') || 'png'
      const buffer = Buffer.from(b64, 'base64')
      const filename = `logos/${slug}.${ext}`

      const { url: blobUrl } = await put(filename, buffer, {
        access: 'public',
        addRandomSuffix: false,
        contentType: mime,
      })

      await db.execute({ sql: 'UPDATE Team SET logo = ? WHERE id = ?', args: [blobUrl, id] })
      console.log(`  ✓ ${slug} → ${blobUrl}`)
      ok++
    } catch (err) {
      console.error(`  ✗ ${slug}: ${err.message}`)
      fail++
    }
  }

  console.log(`\nDone. ${ok} migrated, ${fail} failed.`)
  if (ok > 0) console.log('Logos are now served from Vercel Blob CDN.')
}

main().catch(err => { console.error(err); process.exit(1) })
