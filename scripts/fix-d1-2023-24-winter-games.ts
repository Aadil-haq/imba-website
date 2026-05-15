import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

let url = process.env.TURSO_DATABASE_URL!
if (url.startsWith('libsql://')) url = url.replace('libsql://', 'https://')
const adapter = new PrismaLibSql({ url, authToken: process.env.TURSO_AUTH_TOKEN })
const prisma = new PrismaClient({ adapter } as any)

// Team IDs
const ACES      = 'cmob30dls01md3atinnaqwvp1'
const SHIESTY   = 'cmob31s5g02li3ati6cdcu0pz'
const MINUTEMEN = 'cmob31s5f02lh3atig4e4rmwx'
const CM        = 'cmob31sn502mc3ati6iqvrxli' // Center Masjid
const IRVING    = 'cmoanb3q50000lkpxeq9jgm3l' // Irving OGs
const HONEY     = 'cmob31t7702n63atisxwy0kun' // Honey Pack

// QF game IDs (wk97) — currently have 0 stats
const QF_ACES_SHIESTY   = 'cmohtptzp000004kwrffddxb5'  // Aces 70, Shiesty 77
const QF_MM_CM          = 'cmohtpucf000104kwcn37jf00'  // Minutemen 84, CM 41
const QF_IRVING_HONEY   = 'cmohtpuo3000204kwnopzyt2i'  // Irving OGs 54, HP 56

// Regular season game IDs (wk7, wk9) — currently have wrong stats + wrong scores
const RS_WK7 = 'cmob324qg02x13atieexcx1up'  // Irving OGs vs Honey Pack, should be 71-69
const RS_WK9 = 'cmob329zd03103ati2jbj3606'  // Minutemen vs CM, should be 56-41

// ── QF: Aces (home 70) vs Shiesty (away 77) — MSO game 1473841
const acesStats = [
  // Aces total from MSO = 59 pts; game score is 70 (MSO data discrepancy, use as-is)
  { playerId: 'cmob30dly01mh3atizxqd23nx', teamId: ACES,    twoPtMade: 1, twoPtAtt: 1, threeMade: 4, threeAtt: 4, ftMade: 0, ftAtt: 0, points: 14, assists: 3,  fouls: 1, rebounds: 8,  steals: 4, blocks: 0 }, // Abdul Ahmed
  { playerId: 'cmob30dm001mj3ati3spzw828', teamId: ACES,    twoPtMade: 0, twoPtAtt: 0, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, points: 0,  assists: 0,  fouls: 0, rebounds: 1,  steals: 0, blocks: 0 }, // Ahmed Ahmed
  { playerId: 'cmob30gow01pp3ati1brzqmct', teamId: ACES,    twoPtMade: 0, twoPtAtt: 0, threeMade: 2, threeAtt: 2, ftMade: 0, ftAtt: 0, points: 6,  assists: 1,  fouls: 2, rebounds: 2,  steals: 0, blocks: 0 }, // Yahya Ahmed
  { playerId: 'cmob31sne02mh3atie4d40z1d', teamId: ACES,    twoPtMade: 1, twoPtAtt: 1, threeMade: 1, threeAtt: 1, ftMade: 0, ftAtt: 0, points: 5,  assists: 1,  fouls: 1, rebounds: 6,  steals: 0, blocks: 0 }, // Ishaq Ali
  { playerId: 'cmob31sng02mj3atixuooyuey', teamId: ACES,    twoPtMade: 3, twoPtAtt: 3, threeMade: 4, threeAtt: 4, ftMade: 2, ftAtt: 2, points: 20, assists: 5,  fouls: 3, rebounds: 4,  steals: 0, blocks: 0 }, // Yusuf Aye
  { playerId: 'cmob31v8d02pg3atisin3rd8b', teamId: ACES,    twoPtMade: 7, twoPtAtt: 7, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, points: 14, assists: 1,  fouls: 1, rebounds: 7,  steals: 1, blocks: 2 }, // Mohamed Fayz
  { playerId: 'cmob30z3j02323ati3vosm4l0', teamId: ACES,    twoPtMade: 0, twoPtAtt: 0, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, points: 0,  assists: 2,  fouls: 2, rebounds: 10, steals: 0, blocks: 0 }, // Mamadou Keita
  { playerId: 'cmob31snj02mm3atig5z1ruly', teamId: ACES,    twoPtMade: 0, twoPtAtt: 0, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, points: 0,  assists: 2,  fouls: 5, rebounds: 6,  steals: 0, blocks: 1 }, // Ali Muhammad
]
const shiesty77Stats = [
  { playerId: 'cmob3269v02yd3ati9fd8fugy', teamId: SHIESTY, twoPtMade: 4, twoPtAtt: 4, threeMade: 2, threeAtt: 2, ftMade: 1, ftAtt: 1, points: 15, assists: 8,  fouls: 0, rebounds: 2,  steals: 4, blocks: 1 }, // Samie Abubakar
  { playerId: 'cmob31s5q02m03ati2ufheo82', teamId: SHIESTY, twoPtMade: 2, twoPtAtt: 2, threeMade: 1, threeAtt: 1, ftMade: 0, ftAtt: 0, points: 7,  assists: 2,  fouls: 0, rebounds: 2,  steals: 0, blocks: 0 }, // Ahmed Abid
  { playerId: 'cmob31s5r02m23aticsggocq0', teamId: SHIESTY, twoPtMade: 2, twoPtAtt: 2, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, points: 4,  assists: 1,  fouls: 4, rebounds: 4,  steals: 2, blocks: 1 }, // Muhammad Fasih
  { playerId: 'cmob31zv702t73atikdu6hb6s', teamId: SHIESTY, twoPtMade: 4, twoPtAtt: 4, threeMade: 3, threeAtt: 3, ftMade: 2, ftAtt: 2, points: 19, assists: 4,  fouls: 0, rebounds: 0,  steals: 1, blocks: 0 }, // Yousef Lozon
  { playerId: 'cmob31s5u02m83atiypo1cfkf', teamId: SHIESTY, twoPtMade: 4, twoPtAtt: 4, threeMade: 0, threeAtt: 0, ftMade: 1, ftAtt: 1, points: 9,  assists: 4,  fouls: 2, rebounds: 15, steals: 1, blocks: 1 }, // Mohamed Shamait
  { playerId: 'cmob31s5v02ma3ati9t6hebgi', teamId: SHIESTY, twoPtMade: 6, twoPtAtt: 6, threeMade: 3, threeAtt: 3, ftMade: 2, ftAtt: 2, points: 23, assists: 2,  fouls: 0, rebounds: 3,  steals: 2, blocks: 0 }, // Soleman Zazay
]

// ── QF: Minutemen (home 84) vs Center Masjid (away 41) — MSO game 1473842
const minutemenQFStats = [
  { playerId: 'cmob31s5h02lk3atic6za1ayl', teamId: MINUTEMEN, twoPtMade: 1, twoPtAtt: 1, threeMade: 2, threeAtt: 2, ftMade: 0, ftAtt: 0, points: 8,  assists: 2, fouls: 1, rebounds: 4,  steals: 4, blocks: 0 }, // Khalil Alsabag
  { playerId: 'cmob31s5p02ly3ati9omux1w5', teamId: MINUTEMEN, twoPtMade: 0, twoPtAtt: 0, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, points: 0,  assists: 0, fouls: 0, rebounds: 0,  steals: 0, blocks: 0 }, // Ali Atiyeh
  { playerId: 'cmob31u7h02ok3atib4o4enmi', teamId: MINUTEMEN, twoPtMade: 5, twoPtAtt: 5, threeMade: 1, threeAtt: 1, ftMade: 2, ftAtt: 2, points: 15, assists: 1, fouls: 1, rebounds: 10, steals: 1, blocks: 0 }, // Ahmed Elbushra
  { playerId: 'cmob31s5i02lm3atint2bcswk', teamId: MINUTEMEN, twoPtMade: 6, twoPtAtt: 6, threeMade: 1, threeAtt: 1, ftMade: 0, ftAtt: 0, points: 15, assists: 2, fouls: 0, rebounds: 6,  steals: 3, blocks: 2 }, // Mohamed Elghazali
  { playerId: 'cmob31s5k02lo3ati54xr0kvx', teamId: MINUTEMEN, twoPtMade: 7, twoPtAtt: 7, threeMade: 2, threeAtt: 2, ftMade: 1, ftAtt: 1, points: 21, assists: 7, fouls: 3, rebounds: 16, steals: 1, blocks: 1 }, // Tareq Fattul
  { playerId: 'cmob31s5l02lq3atiwylxfwdk', teamId: MINUTEMEN, twoPtMade: 7, twoPtAtt: 7, threeMade: 0, threeAtt: 0, ftMade: 1, ftAtt: 1, points: 15, assists: 3, fouls: 0, rebounds: 10, steals: 3, blocks: 1 }, // Salah Idris
  { playerId: 'cmob31s5m02ls3atiulzdb9vr', teamId: MINUTEMEN, twoPtMade: 1, twoPtAtt: 1, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, points: 2,  assists: 1, fouls: 0, rebounds: 10, steals: 1, blocks: 0 }, // Madar Madar
  { playerId: 'cmob31s5n02lu3atihelgtiad', teamId: MINUTEMEN, twoPtMade: 2, twoPtAtt: 2, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, points: 4,  assists: 2, fouls: 0, rebounds: 4,  steals: 0, blocks: 2 }, // Mohammad Mirage
  { playerId: 'cmob31s5o02lw3ati9osqlr0s', teamId: MINUTEMEN, twoPtMade: 2, twoPtAtt: 2, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, points: 4,  assists: 3, fouls: 0, rebounds: 1,  steals: 0, blocks: 1 }, // Gup N/A
]
const cmQFStats = [
  { playerId: 'cmob31sno02mq3atie2df6osi', teamId: CM, twoPtMade: 0, twoPtAtt: 0, threeMade: 5, threeAtt: 5, ftMade: 0, ftAtt: 0, points: 15, assists: 1, fouls: 2, rebounds: 3,  steals: 2, blocks: 0 }, // Harris Hassan
  { playerId: 'cmob31snq02ms3atit6jrt6g8', teamId: CM, twoPtMade: 1, twoPtAtt: 1, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, points: 2,  assists: 0, fouls: 0, rebounds: 3,  steals: 1, blocks: 0 }, // Makahil Hassen
  { playerId: 'cmob31snr02mu3ati48sf2kwt', teamId: CM, twoPtMade: 0, twoPtAtt: 0, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, points: 0,  assists: 1, fouls: 1, rebounds: 1,  steals: 0, blocks: 0 }, // Rahat Hossain
  { playerId: 'cmob31sns02mw3atig0g3hwq3', teamId: CM, twoPtMade: 1, twoPtAtt: 1, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, points: 2,  assists: 2, fouls: 1, rebounds: 7,  steals: 2, blocks: 0 }, // Ahmed Hussein
  { playerId: 'cmob31snv02n03ati2d6m9inn', teamId: CM, twoPtMade: 0, twoPtAtt: 0, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, points: 0,  assists: 1, fouls: 5, rebounds: 6,  steals: 2, blocks: 0 }, // Abdul-Aziz Masood
  { playerId: 'cmob31uq202ox3atiw5athnbp', teamId: CM, twoPtMade: 1, twoPtAtt: 1, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, points: 2,  assists: 1, fouls: 0, rebounds: 5,  steals: 2, blocks: 0 }, // Ahmed Masood
  { playerId: 'cmob31snx02n43ati5ow2vuou', teamId: CM, twoPtMade: 4, twoPtAtt: 4, threeMade: 4, threeAtt: 4, ftMade: 0, ftAtt: 0, points: 20, assists: 3, fouls: 1, rebounds: 6,  steals: 0, blocks: 0 }, // Mohamud Yussuf
]

// ── QF: Irving OGs (home 54) vs Honey Pack (away 56) — MSO game 1473843
const irvingQFStats = [
  { playerId: 'cmoanb3qc0003lkpxk09hf5d2', teamId: IRVING, twoPtMade: 3, twoPtAtt: 3, threeMade: 5, threeAtt: 5, ftMade: 3, ftAtt: 3, points: 24, assists: 2, fouls: 4, rebounds: 4,  steals: 3, blocks: 0 }, // Aadil Haq
  { playerId: 'cmoanb7fx0059lkpxt89o8ek5', teamId: IRVING, twoPtMade: 2, twoPtAtt: 2, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, points: 4,  assists: 1, fouls: 4, rebounds: 7,  steals: 0, blocks: 0 }, // Mustafa Haq
  { playerId: 'cmoanb3qi0007lkpxic5lsnbx', teamId: IRVING, twoPtMade: 3, twoPtAtt: 3, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, points: 6,  assists: 2, fouls: 1, rebounds: 13, steals: 0, blocks: 3 }, // Ahmed Ishaq
  { playerId: 'cmoanb3qf0005lkpxxb7vrt3g', teamId: IRVING, twoPtMade: 0, twoPtAtt: 0, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, points: 0,  assists: 4, fouls: 5, rebounds: 4,  steals: 0, blocks: 0 }, // Abdullah Khan
  { playerId: 'cmob30hpy01qr3atigpe7n5r4', teamId: IRVING, twoPtMade: 5, twoPtAtt: 5, threeMade: 2, threeAtt: 2, ftMade: 4, ftAtt: 4, points: 20, assists: 4, fouls: 2, rebounds: 8,  steals: 1, blocks: 0 }, // Faiz Riyas
]
const honeyQFStats = [
  { playerId: 'cmob31t7b02n83ati7xown3d9', teamId: HONEY, twoPtMade: 2, twoPtAtt: 2, threeMade: 0, threeAtt: 0, ftMade: 1, ftAtt: 1, points: 5,  assists: 5, fouls: 1, rebounds: 14, steals: 0, blocks: 1 }, // Ahmed Abuneel
  { playerId: 'cmob31t7k02ne3atibks41r59', teamId: HONEY, twoPtMade: 1, twoPtAtt: 1, threeMade: 1, threeAtt: 1, ftMade: 0, ftAtt: 0, points: 5,  assists: 5, fouls: 1, rebounds: 2,  steals: 0, blocks: 1 }, // Mohsin Asif
  { playerId: 'cmob321zu02uz3atil5wecafz', teamId: HONEY, twoPtMade: 0, twoPtAtt: 0, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, points: 0,  assists: 0, fouls: 2, rebounds: 6,  steals: 0, blocks: 0 }, // Rayaan Memon
  { playerId: 'cmob31t7q02ni3atihvk8jtjf', teamId: HONEY, twoPtMade: 6, twoPtAtt: 6, threeMade: 3, threeAtt: 3, ftMade: 3, ftAtt: 3, points: 24, assists: 1, fouls: 1, rebounds: 6,  steals: 1, blocks: 1 }, // Danny Suliman
  { playerId: 'cmob31t7s02nk3ati5fj6q7bw', teamId: HONEY, twoPtMade: 9, twoPtAtt: 9, threeMade: 0, threeAtt: 0, ftMade: 1, ftAtt: 1, points: 19, assists: 4, fouls: 2, rebounds: 3,  steals: 1, blocks: 0 }, // Rammy Suliman
  { playerId: 'cmob31zde02sz3ati70psum9k', teamId: HONEY, twoPtMade: 0, twoPtAtt: 0, threeMade: 1, threeAtt: 1, ftMade: 0, ftAtt: 0, points: 3,  assists: 0, fouls: 2, rebounds: 1,  steals: 0, blocks: 0 }, // Maaz Asif
]

// ── RS wk7: Irving OGs (home 71) vs Honey Pack (away 69) — MSO game 1432418
const irvingWk7Stats = [
  { playerId: 'cmob31rmw02l33atidlklnnxk', teamId: IRVING, twoPtMade: 1, twoPtAtt: 1, threeMade: 3, threeAtt: 3, ftMade: 4, ftAtt: 4, points: 15, assists: 1, fouls: 1, rebounds: 4, steals: 1, blocks: 0 }, // Dahir Haji
  { playerId: 'cmoanb3qc0003lkpxk09hf5d2', teamId: IRVING, twoPtMade: 3, twoPtAtt: 3, threeMade: 1, threeAtt: 1, ftMade: 3, ftAtt: 3, points: 12, assists: 5, fouls: 3, rebounds: 8, steals: 1, blocks: 0 }, // Aadil Haq
  { playerId: 'cmoanb3qi0007lkpxic5lsnbx', teamId: IRVING, twoPtMade: 3, twoPtAtt: 3, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, points: 6,  assists: 0, fouls: 0, rebounds: 7, steals: 0, blocks: 1 }, // Ahmed Ishaq
  { playerId: 'cmoanb3qf0005lkpxxb7vrt3g', teamId: IRVING, twoPtMade: 2, twoPtAtt: 2, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, points: 4,  assists: 2, fouls: 4, rebounds: 9, steals: 2, blocks: 0 }, // Abdullah Khan
  { playerId: 'cmob30hpy01qr3atigpe7n5r4', teamId: IRVING, twoPtMade: 7, twoPtAtt: 7, threeMade: 6, threeAtt: 6, ftMade: 2, ftAtt: 2, points: 34, assists: 2, fouls: 0, rebounds: 4, steals: 1, blocks: 0 }, // Faiz Riyas
]
const honeyWk7Stats = [
  { playerId: 'cmob31t7b02n83ati7xown3d9', teamId: HONEY, twoPtMade: 6, twoPtAtt: 6, threeMade: 2, threeAtt: 2, ftMade: 4, ftAtt: 4, points: 22, assists: 5, fouls: 6, rebounds: 14, steals: 0, blocks: 1 }, // Ahmed Abuneel
  { playerId: 'cmob31t7k02ne3atibks41r59', teamId: HONEY, twoPtMade: 1, twoPtAtt: 1, threeMade: 0, threeAtt: 0, ftMade: 1, ftAtt: 1, points: 3,  assists: 3, fouls: 1, rebounds: 3,  steals: 1, blocks: 0 }, // Mohsin Asif
  { playerId: 'cmob321zu02uz3atil5wecafz', teamId: HONEY, twoPtMade: 0, twoPtAtt: 0, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, points: 0,  assists: 0, fouls: 1, rebounds: 0,  steals: 0, blocks: 0 }, // Rayaan Memon
  { playerId: 'cmob31t7q02ni3atihvk8jtjf', teamId: HONEY, twoPtMade: 6, twoPtAtt: 6, threeMade: 4, threeAtt: 4, ftMade: 0, ftAtt: 0, points: 24, assists: 2, fouls: 0, rebounds: 8,  steals: 0, blocks: 0 }, // Danny Suliman
  { playerId: 'cmob31t7s02nk3ati5fj6q7bw', teamId: HONEY, twoPtMade: 4, twoPtAtt: 4, threeMade: 0, threeAtt: 0, ftMade: 1, ftAtt: 1, points: 9,  assists: 2, fouls: 0, rebounds: 5,  steals: 0, blocks: 0 }, // Rammy Suliman
  { playerId: 'cmob31t7o02ng3atixv1zdk4j', teamId: HONEY, twoPtMade: 1, twoPtAtt: 1, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, points: 2,  assists: 2, fouls: 2, rebounds: 3,  steals: 1, blocks: 0 }, // Abeel Khan
]

// ── RS wk9: Minutemen (home 56) vs Center Masjid (away 41) — MSO game 1432425
const minutemenWk9Stats = [
  { playerId: 'cmob31s5h02lk3atic6za1ayl', teamId: MINUTEMEN, twoPtMade: 5, twoPtAtt: 5, threeMade: 2, threeAtt: 2, ftMade: 2, ftAtt: 2, points: 18, assists: 2, fouls: 1, rebounds: 3,  steals: 2, blocks: 0 }, // Khalil Alsabag
  { playerId: 'cmob31s5p02ly3ati9omux1w5', teamId: MINUTEMEN, twoPtMade: 1, twoPtAtt: 1, threeMade: 2, threeAtt: 2, ftMade: 0, ftAtt: 0, points: 8,  assists: 0, fouls: 0, rebounds: 1,  steals: 0, blocks: 0 }, // Ali Atiyeh
  { playerId: 'cmob31s5k02lo3ati54xr0kvx', teamId: MINUTEMEN, twoPtMade: 2, twoPtAtt: 2, threeMade: 0, threeAtt: 0, ftMade: 4, ftAtt: 4, points: 8,  assists: 7, fouls: 2, rebounds: 11, steals: 0, blocks: 2 }, // Tareq Fattul
  { playerId: 'cmob31s5l02lq3atiwylxfwdk', teamId: MINUTEMEN, twoPtMade: 2, twoPtAtt: 2, threeMade: 0, threeAtt: 0, ftMade: 1, ftAtt: 1, points: 5,  assists: 2, fouls: 0, rebounds: 8,  steals: 1, blocks: 2 }, // Salah Idris
  { playerId: 'cmob31s5m02ls3atiulzdb9vr', teamId: MINUTEMEN, twoPtMade: 2, twoPtAtt: 2, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, points: 4,  assists: 2, fouls: 2, rebounds: 1,  steals: 2, blocks: 1 }, // Madar Madar
  { playerId: 'cmob31s5n02lu3atihelgtiad', teamId: MINUTEMEN, twoPtMade: 1, twoPtAtt: 1, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, points: 2,  assists: 1, fouls: 2, rebounds: 4,  steals: 0, blocks: 0 }, // Mohammad Mirage
  { playerId: 'cmob31s5o02lw3ati9osqlr0s', teamId: MINUTEMEN, twoPtMade: 1, twoPtAtt: 1, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, points: 2,  assists: 0, fouls: 5, rebounds: 4,  steals: 1, blocks: 0 }, // Gup N/A
  { playerId: 'cmob3237d02w33atitjuo46qx', teamId: MINUTEMEN, twoPtMade: 0, twoPtAtt: 0, threeMade: 3, threeAtt: 3, ftMade: 0, ftAtt: 0, points: 9,  assists: 0, fouls: 0, rebounds: 0,  steals: 1, blocks: 0 }, // Mo Sniper
]
const cmWk9Stats = [
  { playerId: 'cmob31sno02mq3atie2df6osi', teamId: CM, twoPtMade: 2, twoPtAtt: 2, threeMade: 4, threeAtt: 4, ftMade: 2, ftAtt: 2, points: 18, assists: 0, fouls: 3, rebounds: 7,  steals: 0, blocks: 2 }, // Harris Hassan
  { playerId: 'cmob31snq02ms3atit6jrt6g8', teamId: CM, twoPtMade: 0, twoPtAtt: 0, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, points: 0,  assists: 0, fouls: 0, rebounds: 0,  steals: 0, blocks: 0 }, // Makahil Hassen
  { playerId: 'cmob31sns02mw3atig0g3hwq3', teamId: CM, twoPtMade: 1, twoPtAtt: 1, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, points: 2,  assists: 2, fouls: 0, rebounds: 4,  steals: 0, blocks: 0 }, // Ahmed Hussein
  { playerId: 'cmob322ov02vd3atiksc6d68g', teamId: CM, twoPtMade: 1, twoPtAtt: 1, threeMade: 1, threeAtt: 1, ftMade: 1, ftAtt: 1, points: 6,  assists: 1, fouls: 4, rebounds: 3,  steals: 0, blocks: 0 }, // Ibrahim Jeylani
  { playerId: 'cmob31snt02my3atimn3ju1gm', teamId: CM, twoPtMade: 1, twoPtAtt: 1, threeMade: 0, threeAtt: 0, ftMade: 2, ftAtt: 2, points: 4,  assists: 3, fouls: 1, rebounds: 11, steals: 4, blocks: 0 }, // Ladji Keita
  { playerId: 'cmob31snv02n03ati2d6m9inn', teamId: CM, twoPtMade: 1, twoPtAtt: 1, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, points: 2,  assists: 1, fouls: 1, rebounds: 1,  steals: 0, blocks: 0 }, // Abdul-Aziz Masood
  { playerId: 'cmob31uq202ox3atiw5athnbp', teamId: CM, twoPtMade: 0, twoPtAtt: 0, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, points: 0,  assists: 1, fouls: 0, rebounds: 2,  steals: 0, blocks: 1 }, // Ahmed Masood
  { playerId: 'cmob31snw02n23ati1onao97a', teamId: CM, twoPtMade: 1, twoPtAtt: 1, threeMade: 0, threeAtt: 0, ftMade: 0, ftAtt: 0, points: 2,  assists: 0, fouls: 0, rebounds: 2,  steals: 0, blocks: 0 }, // Shadali Shadali
  { playerId: 'cmob31snx02n43ati5ow2vuou', teamId: CM, twoPtMade: 1, twoPtAtt: 1, threeMade: 1, threeAtt: 1, ftMade: 2, ftAtt: 2, points: 7,  assists: 1, fouls: 2, rebounds: 6,  steals: 1, blocks: 0 }, // Mohamud Yussuf
]

async function main() {
  // Verify totals
  const check = (label: string, stats: {points: number}[], expected: number) => {
    const total = stats.reduce((s, p) => s + p.points, 0)
    if (total !== expected) console.warn(`  WARN: ${label} pts=${total}, expected=${expected}`)
    else console.log(`  OK: ${label} = ${total}`)
  }
  console.log('Verifying totals:')
  check('Shiesty QF', shiesty77Stats, 77)
  check('Minutemen QF', minutemenQFStats, 84)
  check('CM QF', cmQFStats, 41)
  check('Irving OGs QF', irvingQFStats, 54)
  check('Honey Pack QF', honeyQFStats, 56)
  check('Irving OGs wk7', irvingWk7Stats, 71)
  check('Minutemen wk9', minutemenWk9Stats, 56)
  check('CM wk9', cmWk9Stats, 41)
  // Aces and Honey Pack wk7 have known MSO discrepancies, just log
  const acesMSOTotal = acesStats.reduce((s, p) => s + p.points, 0)
  const honeyWk7Total = honeyWk7Stats.reduce((s, p) => s + p.points, 0)
  console.log(`  NOTE: Aces MSO total=${acesMSOTotal} (game score=70, MSO discrepancy)`)
  console.log(`  NOTE: Honey Pack wk7 MSO total=${honeyWk7Total} (game score=69, MSO discrepancy)`)

  // ── 1. Add QF stats (wk97) ──────────────────────────────────────
  console.log('\nAdding QF stats...')
  await prisma.playerGameStat.createMany({
    data: [...acesStats, ...shiesty77Stats].map(s => ({ ...s, gameId: QF_ACES_SHIESTY })),
  })
  console.log('  Aces vs Shiesty QF: done')

  await prisma.playerGameStat.createMany({
    data: [...minutemenQFStats, ...cmQFStats].map(s => ({ ...s, gameId: QF_MM_CM })),
  })
  console.log('  Minutemen vs CM QF: done')

  await prisma.playerGameStat.createMany({
    data: [...irvingQFStats, ...honeyQFStats].map(s => ({ ...s, gameId: QF_IRVING_HONEY })),
  })
  console.log('  Irving OGs vs Honey Pack QF: done')

  // ── 2. Fix wk7: delete wrong stats, update score, add correct stats ──
  console.log('\nFixing wk7 Irving OGs vs Honey Pack...')
  await prisma.playerGameStat.deleteMany({ where: { gameId: RS_WK7 } })
  await prisma.game.update({ where: { id: RS_WK7 }, data: { homeScore: 71, awayScore: 69 } })
  await prisma.playerGameStat.createMany({
    data: [...irvingWk7Stats, ...honeyWk7Stats].map(s => ({ ...s, gameId: RS_WK7 })),
  })
  console.log('  wk7 fixed')

  // ── 3. Fix wk9: delete wrong stats, update score, add correct stats ──
  console.log('\nFixing wk9 Minutemen vs CM...')
  await prisma.playerGameStat.deleteMany({ where: { gameId: RS_WK9 } })
  await prisma.game.update({ where: { id: RS_WK9 }, data: { homeScore: 56, awayScore: 41 } })
  await prisma.playerGameStat.createMany({
    data: [...minutemenWk9Stats, ...cmWk9Stats].map(s => ({ ...s, gameId: RS_WK9 })),
  })
  console.log('  wk9 fixed')

  console.log('\nAll done!')
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
