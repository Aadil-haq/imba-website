// Quick DB audit: corrupted stats, duplicates, score mismatches
const { createClient } = require('@libsql/client');
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function main() {
  // ── 1. CORRUPTED STATS ──────────────────────────────────────────────────────
  const r = await db.execute(`
    SELECT
      p.name as player, t.name as team, date(g.date) as date, g.season,
      s.points, s.twoPtMade, s.twoPtAtt, s.threeMade, s.threeAtt,
      s.ftMade, s.ftAtt, s.rebounds, s.blocks,
      (s.twoPtMade * 2 + s.threeMade * 3 + s.ftMade) as calcPts
    FROM PlayerGameStat s
    JOIN Player p ON s.playerId = p.id
    JOIN Team t ON s.teamId = t.id
    JOIN Game g ON s.gameId = g.id
    WHERE
      ABS((s.twoPtMade * 2 + s.threeMade * 3 + s.ftMade) - s.points) > 2
      OR s.ftAtt > 20
      OR s.blocks > 8
    ORDER BY g.season, g.date, t.name, p.name
  `);

  console.log('═══════════════════════════════════════════════════════');
  console.log('  CORRUPTED STATS');
  console.log('═══════════════════════════════════════════════════════');

  let season = '';
  for (const row of r.rows) {
    if (row.season !== season) {
      season = String(row.season);
      console.log(`\n── ${season} ──`);
    }
    const calc = Number(row.calcPts);
    const pts = Number(row.points);
    const diff = Math.abs(calc - pts);
    const flags = [];
    if (diff > 2) flags.push(`pts mismatch: recorded=${pts} calc=${calc}`);
    if (Number(row.ftAtt) > 20) flags.push(`ftAtt=${row.ftAtt}`);
    if (Number(row.blocks) > 8) flags.push(`blocks=${row.blocks}`);
    console.log(`  ${row.date} | ${row.team} | ${row.player}`);
    console.log(`    flags: ${flags.join(' | ')}`);
    console.log(`    2P:${row.twoPtMade}/${row.twoPtAtt}  3P:${row.threeMade}/${row.threeAtt}  FT:${row.ftMade}/${row.ftAtt}  pts:${row.points}(calc:${calc})  reb:${row.rebounds}  blk:${row.blocks}`);
  }
  console.log(`\nTotal: ${r.rows.length} suspicious rows`);

  // ── 2. DUPLICATES ────────────────────────────────────────────────────────────
  const dups = await db.execute(`
    SELECT at.name as away, ht.name as home, g.season,
      date(g.date) as date, COUNT(*) as cnt, GROUP_CONCAT(g.id) as ids
    FROM Game g
    JOIN Team at ON g.awayTeamId = at.id
    JOIN Team ht ON g.homeTeamId = ht.id
    GROUP BY g.awayTeamId, g.homeTeamId, g.season, date(g.date)
    HAVING COUNT(*) > 1
  `);
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  DUPLICATE GAMES');
  console.log('═══════════════════════════════════════════════════════');
  if (dups.rows.length === 0) console.log('  ✅ No duplicates');
  else dups.rows.forEach(row => console.log(`  ${row.season} | ${row.date} | ${row.away} @ ${row.home} x${row.cnt} | IDs: ${row.ids}`));

  // ── 3. NO STATS ──────────────────────────────────────────────────────────────
  const nostats = await db.execute(`
    SELECT date(g.date) as date, g.season, at.name as away, ht.name as home,
           g.awayScore, g.homeScore
    FROM Game g
    JOIN Team at ON g.awayTeamId = at.id
    JOIN Team ht ON g.homeTeamId = ht.id
    WHERE g.played = 1
    AND (SELECT COUNT(*) FROM PlayerGameStat s WHERE s.gameId = g.id) = 0
    ORDER BY g.season, g.date LIMIT 50
  `);
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  GAMES WITH ZERO STATS');
  console.log('═══════════════════════════════════════════════════════');
  if (nostats.rows.length === 0) console.log('  ✅ All played games have stats');
  else nostats.rows.forEach(row => console.log(`  ${row.season} | ${row.date} | ${row.away} ${row.awayScore} @ ${row.home} ${row.homeScore}`));

  // ── 4. SCORE MISMATCHES ──────────────────────────────────────────────────────
  const mm = await db.execute(`
    SELECT date(g.date) as date, g.season,
      at.name as away, ht.name as home, g.awayScore, g.homeScore,
      COALESCE(SUM(CASE WHEN s.teamId = g.awayTeamId THEN s.points END), 0) as calcAway,
      COALESCE(SUM(CASE WHEN s.teamId = g.homeTeamId THEN s.points END), 0) as calcHome
    FROM Game g
    JOIN Team at ON g.awayTeamId = at.id
    JOIN Team ht ON g.homeTeamId = ht.id
    LEFT JOIN PlayerGameStat s ON s.gameId = g.id
    WHERE g.played = 1
    GROUP BY g.id
    HAVING ABS(calcAway - g.awayScore) > 3 OR ABS(calcHome - g.homeScore) > 3
    ORDER BY g.season, g.date
  `);
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  SCORE MISMATCHES (player pts sum ≠ game score, >3 off)');
  console.log('═══════════════════════════════════════════════════════');
  let cur = '';
  for (const row of mm.rows) {
    if (row.season !== cur) { cur = String(row.season); console.log(`\n── ${cur} ──`); }
    console.log(`  ${row.date} | ${row.away} ${row.awayScore}(calc:${row.calcAway}) @ ${row.home} ${row.homeScore}(calc:${row.calcHome})`);
  }
  console.log(`\nTotal mismatches: ${mm.rows.length}`);
}

main().catch(console.error);
