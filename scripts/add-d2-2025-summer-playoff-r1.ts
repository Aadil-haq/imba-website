import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

let url = process.env.TURSO_DATABASE_URL!
if (url.startsWith('libsql://')) url = url.replace('libsql://', 'https://')
const adapter = new PrismaLibSql({ url, authToken: process.env.TURSO_AUTH_TOKEN })
const prisma = new PrismaClient({ adapter } as any)

const HOME_TEAM_ID = 'cmoaod9vf00e8lkpx34075voy' // Halal Hustlers
const AWAY_TEAM_ID = 'cmoapindq016ulkpx2km26l69' // Barakah Ballers
const HOME_SCORE = 63
const AWAY_SCORE = 51

const hhStats = [
  { playerId: 'cmoaod9w000eqlkpxf4jcyccj', twoPtMade: 1, twoPtAtt: 1, threeMade: 0, threeAtt: 0, ftMade: 4, ftAtt: 4, points: 6,  assists: 2, fouls: 0, rebounds: 1, steals: 0, blocks: 0 },
  { playerId: 'cmoaod9w200eslkpxiof335hh', twoPtMade: 1, twoPtAtt: 1, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, points: 2,  assists: 0, fouls: 0, rebounds: 0, steals: 0, blocks: 0 },
  { playerId: 'cmoaod9w600ewlkpxk5samctr', twoPtMade: 0, twoPtAtt: 0, threeMade: 1, threeAtt: 1, ftMade: 0, ftAtt: 0, points: 3,  assists: 0, fouls: 3, rebounds: 1, steals: 1, blocks: 0 },
  { playerId: 'cmoapineb017flkpxhx6su7ue', twoPtMade: 0, twoPtAtt: 0, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, points: 0,  assists: 0, fouls: 0, rebounds: 0, steals: 0, blocks: 0 },
  { playerId: 'cmoaodzft00sxlkpx7xyfc2ko', twoPtMade: 4, twoPtAtt: 4, threeMade: 1, threeAtt: 1, ftMade: 4, ftAtt: 4, points: 15, assists: 1, fouls: 1, rebounds: 1, steals: 1, blocks: 0 },
  { playerId: 'cmoapined017ilkpxcscnnapq', twoPtMade: 1, twoPtAtt: 1, threeMade: 5, threeAtt: 5, ftMade: 0, ftAtt: 0, points: 17, assists: 5, fouls: 2, rebounds: 6, steals: 0, blocks: 1 },
  { playerId: 'cmoaodcxh00iwlkpxiulauliu', twoPtMade: 0, twoPtAtt: 0, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, points: 0,  assists: 1, fouls: 1, rebounds: 0, steals: 0, blocks: 0 },
  { playerId: 'cmoapinef017llkpxwxofbzcq', twoPtMade: 3, twoPtAtt: 3, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, points: 6,  assists: 8, fouls: 1, rebounds: 6, steals: 3, blocks: 1 },
  { playerId: 'cmoapineh017nlkpxinnytj7e', twoPtMade: 5, twoPtAtt: 5, threeMade: 1, threeAtt: 1, ftMade: 1, ftAtt: 1, points: 14, assists: 0, fouls: 1, rebounds: 1, steals: 5, blocks: 4 },
]

const bbStats = [
  { playerId: 'cmoapj9a501hflkpxcxgjcci9', twoPtMade: 1, twoPtAtt: 1, threeMade: 1, threeAtt: 1, ftMade: 0, ftAtt: 0, points: 5,  assists: 0, fouls: 2, rebounds: 5, steals: 1, blocks: 0 },
  { playerId: 'cmoapindt016wlkpxgk6l9nqj', twoPtMade: 0, twoPtAtt: 0, threeMade: 2, threeAtt: 2, ftMade: 0, ftAtt: 0, points: 6,  assists: 1, fouls: 4, rebounds: 2, steals: 2, blocks: 0 },
  { playerId: 'cmoapiror01cwlkpxxd19r3tp', twoPtMade: 1, twoPtAtt: 1, threeMade: 1, threeAtt: 1, ftMade: 0, ftAtt: 0, points: 5,  assists: 1, fouls: 1, rebounds: 3, steals: 2, blocks: 0 },
  { playerId: 'cmoapindu016ylkpxzs7zlmip', twoPtMade: 2, twoPtAtt: 2, threeMade: 3, threeAtt: 3, ftMade: 2, ftAtt: 2, points: 15, assists: 2, fouls: 2, rebounds: 5, steals: 0, blocks: 0 },
  { playerId: 'cmoapindx0170lkpx5leoby9j', twoPtMade: 2, twoPtAtt: 2, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, points: 4,  assists: 1, fouls: 3, rebounds: 4, steals: 0, blocks: 0 },
  { playerId: 'cmoapindz0172lkpx1qyhh8a0', twoPtMade: 2, twoPtAtt: 2, threeMade: 0, threeAtt: 0, ftMade: 1, ftAtt: 1, points: 5,  assists: 3, fouls: 1, rebounds: 4, steals: 0, blocks: 0 },
  { playerId: 'cmoapine30176lkpxont2v5li', twoPtMade: 1, twoPtAtt: 1, threeMade: 1, threeAtt: 1, ftMade: 0, ftAtt: 0, points: 5,  assists: 0, fouls: 0, rebounds: 0, steals: 0, blocks: 0 },
  { playerId: 'cmoapine50178lkpx8mdvoczr', twoPtMade: 3, twoPtAtt: 3, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, points: 6,  assists: 3, fouls: 1, rebounds: 8, steals: 0, blocks: 0 },
]

async function main() {
  const hhTotal = hhStats.reduce((s, p) => s + p.points, 0)
  const bbTotal = bbStats.reduce((s, p) => s + p.points, 0)
  console.log(`HH pts: ${hhTotal} (expected ${HOME_SCORE}), BB pts: ${bbTotal} (expected ${AWAY_SCORE})`)
  if (hhTotal !== HOME_SCORE || bbTotal !== AWAY_SCORE) throw new Error('Points total mismatch!')

  const game = await prisma.game.create({
    data: {
      season: 'D2 2025 Summer',
      week: 96,
      date: new Date('2025-08-10T05:00:00.000Z'),
      league: 'Rec',
      homeTeamId: HOME_TEAM_ID,
      awayTeamId: AWAY_TEAM_ID,
      homeScore: HOME_SCORE,
      awayScore: AWAY_SCORE,
    },
  })
  console.log('Created game:', game.id)

  const stats = [
    ...hhStats.map(p => ({ gameId: game.id, teamId: HOME_TEAM_ID, ...p })),
    ...bbStats.map(p => ({ gameId: game.id, teamId: AWAY_TEAM_ID, ...p })),
  ]

  await prisma.playerGameStat.createMany({ data: stats })
  console.log(`Created ${stats.length} stat records`)
  console.log('Done!')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
