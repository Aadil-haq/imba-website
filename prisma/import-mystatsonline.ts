/**
 * IMBA Data Import — MyStatsOnline → IMBA Website
 * Source: https://www.mystatsonline.com/basket/visitor/league/home/home_basket.aspx?IDLeague=65672
 * Season: D1 2025-26 Winter
 *
 * Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/import-mystatsonline.ts
 */

import { prisma } from '../lib/db'

// ─── TEAMS ────────────────────────────────────────────────────────────────────
const TEAMS = [
  { name: 'Pool Party',     slug: 'pool-party',     color: '#F5A623', abbr: 'PP'  },
  { name: 'ATX',            slug: 'atx',             color: '#4A9FE3', abbr: 'ATX' },
  { name: 'Companions',     slug: 'companions',      color: '#27AE60', abbr: 'CMS' },
  { name: 'Irving OGs',     slug: 'irving-ogs',      color: '#9B59B6', abbr: 'IO'  },
  { name: 'AMB',            slug: 'amb',             color: '#E74C3C', abbr: 'AMB' },
  { name: 'Akhi Ballers',   slug: 'akhi-ballers',    color: '#1ABC9C', abbr: 'AB'  },
  { name: 'Baitul Ballers', slug: 'baitul-ballers',  color: '#E67E22', abbr: 'BB'  },
  { name: 'Ahad',           slug: 'ahad',            color: '#8E44AD', abbr: 'AD'  },
]

// ─── PLAYERS ──────────────────────────────────────────────────────────────────
// Format: { name, team abbr, GP, PTS, REB, AST, STL, BLK, FGM, FGA, 3PM, 3PA, FTM, FTA }
// 2PM = FGM - 3PM,  2PA = FGA - 3PA
const PLAYERS = [
  // Pool Party
  { name: 'Muizz Qazi',         abbr: 'PP',  num: 1,  pos: 'F',  gp: 9,  pts: 125, reb: 47,  ast: 24, stl: 14, blk: 6,  fgm: 42, fga: 96,  tpm: 9,  tpa: 37, ftm: 32, fta: 44 },
  { name: 'Izan Qazi',          abbr: 'PP',  num: 2,  pos: 'G',  gp: 7,  pts: 143, reb: 47,  ast: 23, stl: 11, blk: 7,  fgm: 57, fga: 98,  tpm: 6,  tpa: 23, ftm: 23, fta: 29 },
  { name: 'Yousef Lozon',       abbr: 'PP',  num: 3,  pos: 'G',  gp: 7,  pts: 104, reb: 26,  ast: 23, stl: 5,  blk: 1,  fgm: 41, fga: 84,  tpm: 10, tpa: 32, ftm: 12, fta: 14 },
  { name: 'Saleem Alkhawaldeh', abbr: 'PP',  num: 4,  pos: 'G',  gp: 6,  pts: 122, reb: 29,  ast: 12, stl: 5,  blk: 2,  fgm: 47, fga: 82,  tpm: 13, tpa: 26, ftm: 15, fta: 18 },
  { name: 'Tareq Fattul',       abbr: 'PP',  num: 5,  pos: 'F',  gp: 7,  pts: 87,  reb: 86,  ast: 25, stl: 4,  blk: 11, fgm: 34, fga: 77,  tpm: 10, tpa: 28, ftm: 9,  fta: 12 },
  { name: 'William Allen',      abbr: 'PP',  num: 6,  pos: 'G',  gp: 8,  pts: 20,  reb: 31,  ast: 24, stl: 5,  blk: 0,  fgm: 8,  fga: 14,  tpm: 4,  tpa: 8,  ftm: 0,  fta: 0  },
  { name: 'Talha Mohammed',     abbr: 'PP',  num: 7,  pos: 'F',  gp: 6,  pts: 22,  reb: 33,  ast: 15, stl: 7,  blk: 3,  fgm: 10, fga: 21,  tpm: 0,  tpa: 3,  ftm: 2,  fta: 2  },
  { name: 'Hatim Hashim',       abbr: 'PP',  num: 8,  pos: 'G',  gp: 3,  pts: 21,  reb: 6,   ast: 3,  stl: 2,  blk: 1,  fgm: 8,  fga: 23,  tpm: 5,  tpa: 18, ftm: 0,  fta: 0  },
  // ATX
  { name: 'Maf Ndiaye',         abbr: 'ATX', num: 1,  pos: 'F',  gp: 10, pts: 204, reb: 85,  ast: 36, stl: 7,  blk: 5,  fgm: 80, fga: 150, tpm: 27, tpa: 68, ftm: 17, fta: 28 },
  { name: 'Daniel Maktabi',     abbr: 'ATX', num: 2,  pos: 'G',  gp: 10, pts: 103, reb: 60,  ast: 41, stl: 26, blk: 0,  fgm: 46, fga: 82,  tpm: 5,  tpa: 25, ftm: 6,  fta: 8  },
  { name: 'Samir Dhalle',       abbr: 'ATX', num: 3,  pos: 'G',  gp: 9,  pts: 107, reb: 30,  ast: 17, stl: 2,  blk: 2,  fgm: 41, fga: 77,  tpm: 13, tpa: 36, ftm: 12, fta: 14 },
  { name: 'Amir Mostafa',       abbr: 'ATX', num: 4,  pos: 'PG', gp: 9,  pts: 68,  reb: 40,  ast: 67, stl: 21, blk: 0,  fgm: 28, fga: 56,  tpm: 12, tpa: 31, ftm: 0,  fta: 2  },
  { name: 'Soleman Zazay',      abbr: 'ATX', num: 5,  pos: 'G',  gp: 8,  pts: 73,  reb: 25,  ast: 9,  stl: 8,  blk: 1,  fgm: 27, fga: 57,  tpm: 17, tpa: 38, ftm: 2,  fta: 6  },
  { name: 'Cheikh Mbodj',       abbr: 'ATX', num: 6,  pos: 'C',  gp: 6,  pts: 60,  reb: 60,  ast: 12, stl: 3,  blk: 7,  fgm: 20, fga: 67,  tpm: 4,  tpa: 17, ftm: 16, fta: 23 },
  { name: 'Muaadth Oduro',      abbr: 'ATX', num: 7,  pos: 'F',  gp: 8,  pts: 44,  reb: 20,  ast: 9,  stl: 7,  blk: 0,  fgm: 18, fga: 30,  tpm: 0,  tpa: 4,  ftm: 8,  fta: 13 },
  { name: 'Ahmed Mostafa',      abbr: 'ATX', num: 8,  pos: 'G',  gp: 7,  pts: 11,  reb: 16,  ast: 5,  stl: 3,  blk: 0,  fgm: 4,  fga: 26,  tpm: 3,  tpa: 22, ftm: 0,  fta: 0  },
  { name: 'Abdullah Haq',       abbr: 'ATX', num: 9,  pos: 'G',  gp: 5,  pts: 8,   reb: 5,   ast: 3,  stl: 0,  blk: 0,  fgm: 3,  fga: 8,   tpm: 1,  tpa: 5,  ftm: 1,  fta: 2  },
  { name: 'Akeem Ndiaye',       abbr: 'ATX', num: 10, pos: 'F',  gp: 1,  pts: 0,   reb: 1,   ast: 0,  stl: 0,  blk: 0,  fgm: 0,  fga: 2,   tpm: 0,  tpa: 2,  ftm: 0,  fta: 0  },
  // Companions
  { name: 'Jusuf Rasidagic',    abbr: 'CMS', num: 1,  pos: 'G',  gp: 9,  pts: 123, reb: 33,  ast: 7,  stl: 7,  blk: 7,  fgm: 46, fga: 112, tpm: 19, tpa: 60, ftm: 12, fta: 20 },
  { name: 'Khalil Alsabag',     abbr: 'CMS', num: 2,  pos: 'G',  gp: 8,  pts: 106, reb: 41,  ast: 25, stl: 19, blk: 2,  fgm: 37, fga: 75,  tpm: 16, tpa: 39, ftm: 16, fta: 25 },
  { name: 'Muhammad Fasih',     abbr: 'CMS', num: 3,  pos: 'G',  gp: 8,  pts: 79,  reb: 23,  ast: 28, stl: 9,  blk: 0,  fgm: 26, fga: 68,  tpm: 4,  tpa: 25, ftm: 23, fta: 31 },
  { name: 'Mohamed Sow',        abbr: 'CMS', num: 4,  pos: 'C',  gp: 9,  pts: 40,  reb: 79,  ast: 6,  stl: 8,  blk: 16, fgm: 17, fga: 45,  tpm: 1,  tpa: 2,  ftm: 5,  fta: 8  },
  { name: 'Dahir Haji',         abbr: 'CMS', num: 5,  pos: 'G',  gp: 8,  pts: 52,  reb: 22,  ast: 9,  stl: 5,  blk: 1,  fgm: 18, fga: 66,  tpm: 10, tpa: 50, ftm: 6,  fta: 8  },
  { name: 'Izan Firozvi',       abbr: 'CMS', num: 6,  pos: 'F',  gp: 5,  pts: 50,  reb: 32,  ast: 12, stl: 3,  blk: 0,  fgm: 17, fga: 35,  tpm: 11, tpa: 26, ftm: 5,  fta: 7  },
  { name: 'Ahmed Koko',         abbr: 'CMS', num: 7,  pos: 'F',  gp: 5,  pts: 30,  reb: 22,  ast: 12, stl: 3,  blk: 2,  fgm: 11, fga: 41,  tpm: 5,  tpa: 22, ftm: 3,  fta: 8  },
  { name: 'Ahmed Ahmed',        abbr: 'CMS', num: 8,  pos: 'G',  gp: 5,  pts: 11,  reb: 6,   ast: 1,  stl: 1,  blk: 0,  fgm: 4,  fga: 11,  tpm: 3,  tpa: 9,  ftm: 0,  fta: 0  },
  { name: 'Abdoulaziz Haidara', abbr: 'CMS', num: 9,  pos: 'G',  gp: 4,  pts: 9,   reb: 10,  ast: 3,  stl: 2,  blk: 0,  fgm: 3,  fga: 11,  tpm: 0,  tpa: 3,  ftm: 3,  fta: 6  },
  { name: 'Zain Lakhani',       abbr: 'CMS', num: 10, pos: 'G',  gp: 2,  pts: 0,   reb: 3,   ast: 0,  stl: 0,  blk: 1,  fgm: 0,  fga: 6,   tpm: 0,  tpa: 3,  ftm: 0,  fta: 2  },
  // Irving OGs
  { name: 'Beshr Alkhatib',     abbr: 'IO',  num: 1,  pos: 'G',  gp: 8,  pts: 137, reb: 28,  ast: 18, stl: 12, blk: 0,  fgm: 52, fga: 116, tpm: 27, tpa: 69, ftm: 6,  fta: 8  },
  { name: 'Aadil Haq',          abbr: 'IO',  num: 2,  pos: 'PG', gp: 9,  pts: 114, reb: 36,  ast: 47, stl: 15, blk: 6,  fgm: 43, fga: 97,  tpm: 17, tpa: 53, ftm: 11, fta: 18 },
  { name: 'Sherif Hassan',      abbr: 'IO',  num: 3,  pos: 'F',  gp: 6,  pts: 83,  reb: 43,  ast: 10, stl: 6,  blk: 3,  fgm: 33, fga: 62,  tpm: 1,  tpa: 10, ftm: 16, fta: 21 },
  { name: 'Tauseef Minhas',     abbr: 'IO',  num: 4,  pos: 'F',  gp: 8,  pts: 49,  reb: 32,  ast: 8,  stl: 6,  blk: 7,  fgm: 20, fga: 43,  tpm: 2,  tpa: 14, ftm: 7,  fta: 10 },
  { name: 'Saad Riaz',          abbr: 'IO',  num: 5,  pos: 'G',  gp: 9,  pts: 57,  reb: 15,  ast: 10, stl: 3,  blk: 0,  fgm: 21, fga: 67,  tpm: 13, tpa: 45, ftm: 2,  fta: 7  },
  { name: 'Ahmed Ishaq',        abbr: 'IO',  num: 6,  pos: 'C',  gp: 5,  pts: 22,  reb: 50,  ast: 8,  stl: 4,  blk: 6,  fgm: 8,  fga: 21,  tpm: 1,  tpa: 4,  ftm: 5,  fta: 12 },
  { name: 'Abdullah Khan',      abbr: 'IO',  num: 7,  pos: 'G',  gp: 8,  pts: 23,  reb: 16,  ast: 19, stl: 11, blk: 2,  fgm: 10, fga: 30,  tpm: 2,  tpa: 17, ftm: 1,  fta: 3  },
  { name: 'Mustafa Haq',        abbr: 'IO',  num: 8,  pos: 'G',  gp: 7,  pts: 44,  reb: 20,  ast: 8,  stl: 10, blk: 2,  fgm: 20, fga: 39,  tpm: 3,  tpa: 11, ftm: 1,  fta: 3  },
  { name: 'Yousef Akil',        abbr: 'IO',  num: 9,  pos: 'G',  gp: 4,  pts: 15,  reb: 19,  ast: 5,  stl: 8,  blk: 1,  fgm: 6,  fga: 13,  tpm: 1,  tpa: 3,  ftm: 2,  fta: 6  },
  // AMB
  { name: 'Josh Walker',        abbr: 'AMB', num: 1,  pos: 'C',  gp: 7,  pts: 130, reb: 94,  ast: 10, stl: 12, blk: 8,  fgm: 57, fga: 90,  tpm: 1,  tpa: 2,  ftm: 15, fta: 42 },
  { name: 'Jason Li',           abbr: 'AMB', num: 2,  pos: 'G',  gp: 8,  pts: 99,  reb: 32,  ast: 20, stl: 8,  blk: 1,  fgm: 36, fga: 89,  tpm: 13, tpa: 42, ftm: 14, fta: 22 },
  { name: 'Abdul Ahmed',        abbr: 'AMB', num: 3,  pos: 'G',  gp: 8,  pts: 85,  reb: 34,  ast: 20, stl: 16, blk: 0,  fgm: 29, fga: 92,  tpm: 24, tpa: 74, ftm: 3,  fta: 5  },
  { name: 'Mohamed Mohamud',    abbr: 'AMB', num: 4,  pos: 'F',  gp: 7,  pts: 38,  reb: 33,  ast: 2,  stl: 1,  blk: 2,  fgm: 16, fga: 30,  tpm: 0,  tpa: 2,  ftm: 6,  fta: 13 },
  { name: 'Abdulla Osman',      abbr: 'AMB', num: 5,  pos: 'F',  gp: 6,  pts: 34,  reb: 40,  ast: 20, stl: 9,  blk: 1,  fgm: 13, fga: 44,  tpm: 3,  tpa: 20, ftm: 5,  fta: 9  },
  { name: 'Amro Nayfeh',        abbr: 'AMB', num: 6,  pos: 'G',  gp: 6,  pts: 20,  reb: 16,  ast: 13, stl: 2,  blk: 0,  fgm: 9,  fga: 27,  tpm: 2,  tpa: 13, ftm: 0,  fta: 2  },
  { name: 'Ali Atiyeh',         abbr: 'AMB', num: 7,  pos: 'G',  gp: 7,  pts: 25,  reb: 3,   ast: 8,  stl: 2,  blk: 0,  fgm: 10, fga: 38,  tpm: 5,  tpa: 30, ftm: 0,  fta: 0  },
  { name: 'Mohamud Yussuf',     abbr: 'AMB', num: 8,  pos: 'F',  gp: 5,  pts: 14,  reb: 10,  ast: 2,  stl: 2,  blk: 0,  fgm: 5,  fga: 13,  tpm: 1,  tpa: 5,  ftm: 3,  fta: 7  },
  // Akhi Ballers
  { name: 'Yusuf Aye',          abbr: 'AB',  num: 1,  pos: 'G',  gp: 8,  pts: 113, reb: 31,  ast: 18, stl: 12, blk: 1,  fgm: 44, fga: 123, tpm: 9,  tpa: 43, ftm: 16, fta: 33 },
  { name: 'Abdullah Abdoun',    abbr: 'AB',  num: 2,  pos: 'G',  gp: 7,  pts: 109, reb: 49,  ast: 11, stl: 6,  blk: 2,  fgm: 39, fga: 90,  tpm: 22, tpa: 53, ftm: 9,  fta: 13 },
  { name: 'Ghanim Elnour',      abbr: 'AB',  num: 3,  pos: 'F',  gp: 7,  pts: 60,  reb: 47,  ast: 2,  stl: 19, blk: 5,  fgm: 28, fga: 69,  tpm: 2,  tpa: 19, ftm: 2,  fta: 6  },
  { name: 'Faiz Aye',           abbr: 'AB',  num: 4,  pos: 'G',  gp: 8,  pts: 33,  reb: 35,  ast: 14, stl: 17, blk: 1,  fgm: 10, fga: 53,  tpm: 5,  tpa: 33, ftm: 8,  fta: 14 },
  { name: 'Hassan Sheik',       abbr: 'AB',  num: 5,  pos: 'G',  gp: 6,  pts: 31,  reb: 16,  ast: 4,  stl: 5,  blk: 0,  fgm: 11, fga: 52,  tpm: 9,  tpa: 44, ftm: 0,  fta: 0  },
  { name: 'Abdul Sabur Ahmed',  abbr: 'AB',  num: 6,  pos: 'F',  gp: 4,  pts: 22,  reb: 19,  ast: 7,  stl: 3,  blk: 3,  fgm: 10, fga: 25,  tpm: 1,  tpa: 7,  ftm: 1,  fta: 4  },
  { name: 'Fuad Aye',           abbr: 'AB',  num: 7,  pos: 'G',  gp: 8,  pts: 22,  reb: 20,  ast: 8,  stl: 9,  blk: 1,  fgm: 9,  fga: 42,  tpm: 3,  tpa: 22, ftm: 1,  fta: 2  },
  { name: 'Mohammed Abbasher',  abbr: 'AB',  num: 8,  pos: 'F',  gp: 3,  pts: 23,  reb: 21,  ast: 3,  stl: 1,  blk: 1,  fgm: 10, fga: 17,  tpm: 0,  tpa: 1,  ftm: 3,  fta: 6  },
  // Baitul Ballers
  { name: 'Ibrahim Cully',      abbr: 'BB',  num: 1,  pos: 'G',  gp: 7,  pts: 105, reb: 31,  ast: 14, stl: 4,  blk: 0,  fgm: 44, fga: 104, tpm: 14, tpa: 45, ftm: 3,  fta: 12 },
  { name: 'Asim Haq',           abbr: 'BB',  num: 2,  pos: 'F',  gp: 8,  pts: 85,  reb: 37,  ast: 21, stl: 6,  blk: 0,  fgm: 31, fga: 97,  tpm: 13, tpa: 48, ftm: 10, fta: 12 },
  { name: 'Ridwan Galib',       abbr: 'BB',  num: 3,  pos: 'G',  gp: 6,  pts: 65,  reb: 20,  ast: 16, stl: 8,  blk: 1,  fgm: 25, fga: 64,  tpm: 11, tpa: 33, ftm: 4,  fta: 9  },
  { name: 'Raziuddin Mohammad', abbr: 'BB',  num: 4,  pos: 'G',  gp: 6,  pts: 64,  reb: 20,  ast: 13, stl: 3,  blk: 0,  fgm: 24, fga: 80,  tpm: 10, tpa: 49, ftm: 6,  fta: 6  },
  { name: 'Ladji Keita',        abbr: 'BB',  num: 5,  pos: 'C',  gp: 4,  pts: 14,  reb: 25,  ast: 7,  stl: 6,  blk: 3,  fgm: 4,  fga: 15,  tpm: 1,  tpa: 5,  ftm: 5,  fta: 7  },
  { name: 'Ali Muhammad',       abbr: 'BB',  num: 6,  pos: 'G',  gp: 7,  pts: 21,  reb: 27,  ast: 4,  stl: 3,  blk: 2,  fgm: 7,  fga: 18,  tpm: 7,  tpa: 18, ftm: 0,  fta: 0  },
  { name: 'Hamza Saraswat',     abbr: 'BB',  num: 7,  pos: 'G',  gp: 5,  pts: 13,  reb: 16,  ast: 2,  stl: 1,  blk: 0,  fgm: 5,  fga: 14,  tpm: 2,  tpa: 8,  ftm: 1,  fta: 2  },
  { name: 'Samir Nuru',         abbr: 'BB',  num: 8,  pos: 'C',  gp: 3,  pts: 15,  reb: 22,  ast: 1,  stl: 1,  blk: 1,  fgm: 7,  fga: 12,  tpm: 1,  tpa: 4,  ftm: 0,  fta: 0  },
  // Ahad
  { name: 'Ali Amanullah',      abbr: 'AD',  num: 1,  pos: 'G',  gp: 5,  pts: 106, reb: 23,  ast: 15, stl: 7,  blk: 0,  fgm: 39, fga: 96,  tpm: 20, tpa: 60, ftm: 8,  fta: 15 },
  { name: 'Haider Seid',        abbr: 'AD',  num: 2,  pos: 'F',  gp: 8,  pts: 84,  reb: 84,  ast: 23, stl: 11, blk: 4,  fgm: 37, fga: 105, tpm: 4,  tpa: 25, ftm: 6,  fta: 12 },
  { name: 'Bilal Abdullah',     abbr: 'AD',  num: 3,  pos: 'C',  gp: 5,  pts: 58,  reb: 73,  ast: 18, stl: 8,  blk: 19, fgm: 27, fga: 79,  tpm: 0,  tpa: 8,  ftm: 4,  fta: 9  },
  { name: 'Ali Ahmed',          abbr: 'AD',  num: 4,  pos: 'G',  gp: 4,  pts: 46,  reb: 18,  ast: 8,  stl: 2,  blk: 0,  fgm: 15, fga: 52,  tpm: 14, tpa: 43, ftm: 2,  fta: 3  },
  { name: 'Albert Silva',       abbr: 'AD',  num: 5,  pos: 'F',  gp: 4,  pts: 19,  reb: 17,  ast: 3,  stl: 1,  blk: 2,  fgm: 7,  fga: 16,  tpm: 4,  tpa: 11, ftm: 1,  fta: 3  },
  { name: 'Sayeed Abdullah',    abbr: 'AD',  num: 6,  pos: 'F',  gp: 2,  pts: 12,  reb: 15,  ast: 0,  stl: 1,  blk: 3,  fgm: 4,  fga: 9,   tpm: 0,  tpa: 0,  ftm: 4,  fta: 8  },
  { name: 'Saad Sadiq',         abbr: 'AD',  num: 7,  pos: 'G',  gp: 4,  pts: 10,  reb: 13,  ast: 3,  stl: 3,  blk: 1,  fgm: 4,  fga: 25,  tpm: 0,  tpa: 16, ftm: 2,  fta: 2  },
]

// ─── GAMES ────────────────────────────────────────────────────────────────────
// Format: { date, time, awayAbbr, awayScore, homeAbbr, homeScore, week }
const GAMES = [
  // Week 1 — Nov 30 2025
  { date: '2025-11-30', time: '2:00 PM', awayAbbr: 'IO',  awayScore: 48, homeAbbr: 'PP',  homeScore: 52, week: 1 },
  { date: '2025-11-30', time: '3:00 PM', awayAbbr: 'AMB', awayScore: 58, homeAbbr: 'AD',  homeScore: 61, week: 1 },
  { date: '2025-11-30', time: '4:20 PM', awayAbbr: 'BB',  awayScore: 50, homeAbbr: 'AB',  homeScore: 51, week: 1 },
  { date: '2025-11-30', time: '5:45 PM', awayAbbr: 'CMS', awayScore: 51, homeAbbr: 'ATX', homeScore: 73, week: 1 },
  // Week 2 — Dec 7 2025
  { date: '2025-12-07', time: '3:00 PM', awayAbbr: 'BB',  awayScore: 56, homeAbbr: 'PP',  homeScore: 75, week: 2 },
  { date: '2025-12-07', time: '4:20 PM', awayAbbr: 'AD',  awayScore: 57, homeAbbr: 'AB',  homeScore: 63, week: 2 },
  { date: '2025-12-07', time: '5:45 PM', awayAbbr: 'IO',  awayScore: 51, homeAbbr: 'CMS', homeScore: 57, week: 2 },
  { date: '2025-12-07', time: '6:50 PM', awayAbbr: 'AMB', awayScore: 64, homeAbbr: 'ATX', homeScore: 78, week: 2 },
  // Week 3 — Dec 14 2025
  { date: '2025-12-14', time: '2:00 PM', awayAbbr: 'BB',  awayScore: 51, homeAbbr: 'IO',  homeScore: 52, week: 3 },
  { date: '2025-12-14', time: '3:00 PM', awayAbbr: 'AB',  awayScore: 64, homeAbbr: 'PP',  homeScore: 82, week: 3 },
  { date: '2025-12-14', time: '4:20 PM', awayAbbr: 'AMB', awayScore: 47, homeAbbr: 'CMS', homeScore: 59, week: 3 },
  { date: '2025-12-14', time: '5:45 PM', awayAbbr: 'AD',  awayScore: 30, homeAbbr: 'ATX', homeScore: 95, week: 3 },
  // Week 4 — Dec 21 2025
  { date: '2025-12-21', time: '2:00 PM', awayAbbr: 'AMB', awayScore: 60, homeAbbr: 'PP',  homeScore: 81, week: 4 },
  { date: '2025-12-21', time: '3:00 PM', awayAbbr: 'AD',  awayScore: 79, homeAbbr: 'IO',  homeScore: 107, week: 4 },
  { date: '2025-12-21', time: '4:20 PM', awayAbbr: 'AB',  awayScore: 47, homeAbbr: 'CMS', homeScore: 70, week: 4 },
  { date: '2025-12-21', time: '5:45 PM', awayAbbr: 'BB',  awayScore: 58, homeAbbr: 'ATX', homeScore: 102, week: 4 },
  // Week 5 — Jan 4 2026
  { date: '2026-01-04', time: '1:30 PM', awayAbbr: 'ATX', awayScore: 46, homeAbbr: 'PP',  homeScore: 72, week: 5 },
  { date: '2026-01-04', time: '2:20 PM', awayAbbr: 'AB',  awayScore: 51, homeAbbr: 'IO',  homeScore: 73, week: 5 },
  { date: '2026-01-04', time: '3:10 PM', awayAbbr: 'BB',  awayScore: 54, homeAbbr: 'AMB', homeScore: 59, week: 5 },
  { date: '2026-01-04', time: '4:20 PM', awayAbbr: 'AD',  awayScore: 61, homeAbbr: 'CMS', homeScore: 67, week: 5 },
  // Week 6 — Jan 11 2026
  { date: '2026-01-11', time: '2:05 PM', awayAbbr: 'AD',  awayScore: 50, homeAbbr: 'BB',  homeScore: 55, week: 6 },
  { date: '2026-01-11', time: '3:00 PM', awayAbbr: 'AB',  awayScore: 45, homeAbbr: 'AMB', homeScore: 62, week: 6 },
  { date: '2026-01-11', time: '4:15 PM', awayAbbr: 'CMS', awayScore: 45, homeAbbr: 'PP',  homeScore: 57, week: 6 },
  { date: '2026-01-11', time: '5:05 PM', awayAbbr: 'IO',  awayScore: 53, homeAbbr: 'ATX', homeScore: 54, week: 6 },
  // Week 7 — Jan 18 2026
  { date: '2026-01-18', time: '2:00 PM', awayAbbr: 'AD',  awayScore: 67, homeAbbr: 'PP',  homeScore: 79, week: 7 },
  { date: '2026-01-18', time: '3:00 PM', awayAbbr: 'AMB', awayScore: 63, homeAbbr: 'IO',  homeScore: 64, week: 7 },
  { date: '2026-01-18', time: '4:15 PM', awayAbbr: 'BB',  awayScore: 53, homeAbbr: 'CMS', homeScore: 77, week: 7 },
  { date: '2026-01-18', time: '5:05 PM', awayAbbr: 'AB',  awayScore: 53, homeAbbr: 'ATX', homeScore: 59, week: 7 },
  // Week 8 — Feb 1 2026
  { date: '2026-02-01', time: '2:20 PM', awayAbbr: 'AD',  awayScore: 35, homeAbbr: 'PP',  homeScore: 87, week: 8 },
  { date: '2026-02-01', time: '3:20 PM', awayAbbr: 'AMB', awayScore: 41, homeAbbr: 'IO',  homeScore: 42, week: 8 },
  { date: '2026-02-01', time: '4:25 PM', awayAbbr: 'AB',  awayScore: 47, homeAbbr: 'CMS', homeScore: 56, week: 8 },
  { date: '2026-02-01', time: '5:15 PM', awayAbbr: 'BB',  awayScore: 33, homeAbbr: 'ATX', homeScore: 72, week: 8 },
  // Week 9 — Feb 8 2026
  { date: '2026-02-08', time: '1:30 PM', awayAbbr: 'IO',  awayScore: 54, homeAbbr: 'PP',  homeScore: 68, week: 9 },
  { date: '2026-02-08', time: '4:30 PM', awayAbbr: 'CMS', awayScore: 41, homeAbbr: 'ATX', homeScore: 53, week: 9 },
  // Week 10 — Feb 15 2026
  { date: '2026-02-15', time: '6:45 PM', awayAbbr: 'ATX', awayScore: 46, homeAbbr: 'PP',  homeScore: 49, week: 10 },
]

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function distribute(total: number, count: number): number[] {
  if (count === 0) return []
  const base = Math.floor(total / count)
  const remainder = total - base * count
  return Array.from({ length: count }, (_, i) => (i < remainder ? base + 1 : base))
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🏀 Starting IMBA data import from MyStatsOnline...\n')

  // 1. Clear existing sample data (preserve admin, settings, announcements, registrations)
  console.log('🗑  Clearing sample data...')
  await prisma.playerGameStat.deleteMany()
  await prisma.game.deleteMany()
  await prisma.player.deleteMany()
  await prisma.team.deleteMany()

  // 2. Create teams
  console.log('👕 Importing teams...')
  const teamIdByAbbr: Record<string, string> = {}

  for (const t of TEAMS) {
    const team = await prisma.team.create({
      data: {
        name: t.name,
        slug: t.slug,
        color: t.color,
        league: 'D1 2025-26 Winter',
      },
    })
    teamIdByAbbr[t.abbr] = team.id
    console.log(`   ✓ ${t.name}`)
  }

  // 3. Create players
  console.log('\n👤 Importing players...')
  const playerIdByName: Record<string, string> = {}
  const playerAbbrByName: Record<string, string> = {}

  for (const p of PLAYERS) {
    const teamId = teamIdByAbbr[p.abbr]
    if (!teamId) { console.warn(`   ⚠ No team found for ${p.name} (${p.abbr})`); continue }

    const player = await prisma.player.create({
      data: {
        name: p.name,
        number: p.num,
        position: p.pos,
        teamId,
      },
    })
    playerIdByName[p.name] = player.id
    playerAbbrByName[p.name] = p.abbr
  }
  console.log(`   ✓ ${PLAYERS.length} players imported`)

  // 4. Create games
  console.log('\n🏀 Importing games...')
  // Build per-team ordered list of gameIds
  const teamGameIds: Record<string, string[]> = {}
  for (const abbr of Object.keys(teamIdByAbbr)) teamGameIds[abbr] = []

  for (const g of GAMES) {
    const homeTeamId = teamIdByAbbr[g.homeAbbr]
    const awayTeamId = teamIdByAbbr[g.awayAbbr]
    if (!homeTeamId || !awayTeamId) {
      console.warn(`   ⚠ Missing team for game ${g.homeAbbr} vs ${g.awayAbbr}`)
      continue
    }

    const game = await prisma.game.create({
      data: {
        homeTeamId,
        awayTeamId,
        homeScore: g.homeScore,
        awayScore: g.awayScore,
        date: new Date(`${g.date}T12:00:00.000Z`),
        time: g.time,
        location: 'Irving Masjid Gym',
        week: g.week,
        season: '2025-26 Winter',
        league: 'D1 2025-26 Winter',
        played: true,
      },
    })

    teamGameIds[g.homeAbbr].push(game.id)
    teamGameIds[g.awayAbbr].push(game.id)
  }
  console.log(`   ✓ ${GAMES.length} games imported`)

  // 5. Import player stats — distribute season totals evenly across games played
  console.log('\n📊 Importing player stats...')
  let statCount = 0

  for (const p of PLAYERS) {
    const playerId = playerIdByName[p.name]
    if (!playerId) continue

    const teamAbbr = p.abbr
    const teamId = teamIdByAbbr[teamAbbr]
    const teamGames = teamGameIds[teamAbbr] || []

    // Take first p.gp games the team played
    const gamesToUse = teamGames.slice(0, p.gp)
    if (gamesToUse.length === 0) continue

    const actual = gamesToUse.length
    const twoPtMade = p.fgm - p.tpm
    const twoPtAtt  = p.fga - p.tpa

    // Distribute each stat across games
    const ptsDist   = distribute(p.pts, actual)
    const rebDist   = distribute(p.reb, actual)
    const astDist   = distribute(p.ast, actual)
    const stlDist   = distribute(p.stl, actual)
    const blkDist   = distribute(p.blk, actual)
    const toDist    = distribute(0, actual)          // turnovers not tracked on source
    const twomDist  = distribute(twoPtMade, actual)
    const twoaDist  = distribute(twoPtAtt, actual)
    const tpmDist   = distribute(p.tpm, actual)
    const tpaDist   = distribute(p.tpa, actual)
    const ftmDist   = distribute(p.ftm, actual)
    const ftaDist   = distribute(p.fta, actual)

    for (let i = 0; i < actual; i++) {
      try {
        await prisma.playerGameStat.create({
          data: {
            playerId,
            gameId:    gamesToUse[i],
            teamId,
            points:    ptsDist[i],
            rebounds:  rebDist[i],
            assists:   astDist[i],
            steals:    stlDist[i],
            blocks:    blkDist[i],
            turnovers: toDist[i],
            twoPtMade: twomDist[i],
            twoPtAtt:  twoaDist[i],
            threeMade: tpmDist[i],
            threeAtt:  tpaDist[i],
            ftMade:    ftmDist[i],
            ftAtt:     ftaDist[i],
          },
        })
        statCount++
      } catch {
        // skip duplicate
      }
    }
  }
  console.log(`   ✓ ${statCount} player-game stat records created`)

  // Summary
  const teams   = await prisma.team.count()
  const players = await prisma.player.count()
  const games   = await prisma.game.count()
  const stats   = await prisma.playerGameStat.count()

  console.log('\n✅ Import complete!')
  console.log(`   Teams:   ${teams}`)
  console.log(`   Players: ${players}`)
  console.log(`   Games:   ${games}`)
  console.log(`   Stats:   ${stats}`)
  console.log('\n🌐 Visit http://localhost:3000 to see your real data.')
}

main()
  .catch(e => { console.error('Import failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
