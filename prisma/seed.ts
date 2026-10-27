import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import bcrypt from 'bcryptjs'
import 'dotenv/config'

const dbUrl = process.env.DATABASE_URL ?? 'file:./prisma/dev.db'
const adapter = new PrismaLibSql({ url: dbUrl })
const prisma = new PrismaClient({ adapter } as any)

async function main() {
  // Create admin
  const hashedPassword = await bcrypt.hash('imba2025', 10)
  await prisma.adminUser.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', password: hashedPassword }
  })

  // Create sample teams
  const teams = [
    { name: 'Thunder', slug: 'thunder', color: '#F5A623' },
    { name: 'Falcons', slug: 'falcons', color: '#4A9FE3' },
    { name: 'Warriors', slug: 'warriors', color: '#6B46C1' },
    { name: 'Eagles', slug: 'eagles', color: '#27AE60' },
  ]

  const createdTeams: Record<string, string> = {}

  for (const team of teams) {
    const t = await prisma.team.upsert({
      where: { slug: team.slug },
      update: {},
      create: team
    })
    createdTeams[team.slug] = t.id
  }

  // Add sample players for each team
  const playersByTeam = [
    {
      teamSlug: 'thunder',
      players: [
        { name: 'Ahmad Hassan', number: 1, position: 'PG' },
        { name: 'Bilal Karimi', number: 5, position: 'SG' },
        { name: 'Yusuf Rahman', number: 11, position: 'SF' },
        { name: 'Omar Siddiqui', number: 23, position: 'PF' },
        { name: 'Tariq Mahmood', number: 34, position: 'C' },
      ]
    },
    {
      teamSlug: 'falcons',
      players: [
        { name: 'Khalid Ansari', number: 2, position: 'PG' },
        { name: 'Imran Chaudhry', number: 7, position: 'SG' },
        { name: 'Zaid Farooq', number: 10, position: 'SF' },
        { name: 'Hasan Ali', number: 15, position: 'PF' },
        { name: 'Saad Mirza', number: 21, position: 'C' },
      ]
    },
    {
      teamSlug: 'warriors',
      players: [
        { name: 'Faisal Qureshi', number: 3, position: 'PG' },
        { name: 'Noman Baig', number: 8, position: 'SG' },
        { name: 'Adnan Sheikh', number: 12, position: 'SF' },
        { name: 'Raza Malik', number: 25, position: 'PF' },
        { name: 'Usman Ghani', number: 32, position: 'C' },
      ]
    },
    {
      teamSlug: 'eagles',
      players: [
        { name: 'Asim Javed', number: 4, position: 'PG' },
        { name: 'Daniyar Khan', number: 9, position: 'SG' },
        { name: 'Omer Butt', number: 14, position: 'SF' },
        { name: 'Shahid Naqvi', number: 22, position: 'PF' },
        { name: 'Waqas Ahmed', number: 33, position: 'C' },
      ]
    },
  ]

  for (const { teamSlug, players } of playersByTeam) {
    const teamId = createdTeams[teamSlug]
    for (const player of players) {
      const existing = await prisma.player.findFirst({
        where: { name: player.name, teamId }
      })
      if (!existing) {
        await prisma.player.create({
          data: { ...player, teamId }
        })
      }
    }
  }

  // Create sample announcements
  const announcements = [
    {
      title: 'Spring 2025 Season Registration Open!',
      body: 'Registration is now open for the IMBA Spring 2025 season. Sign up today to secure your spot. Limited spots available!'
    },
    {
      title: 'Games Start April 25th',
      body: 'The first games of the Spring 2025 season will begin on Friday, April 25th at 7:00 PM. All games will be held at the Irving Masjid Gym.'
    },
    {
      title: 'Code of Conduct Reminder',
      body: 'All players are expected to maintain sportsmanship and respect for all participants. Remember, we play for the sake of community and fun!'
    },
  ]

  for (const ann of announcements) {
    const existing = await prisma.announcement.findFirst({ where: { title: ann.title } })
    if (!existing) {
      await prisma.announcement.create({ data: ann })
    }
  }

  // Create sample schedule
  const now = new Date()
  const teamIds = Object.values(createdTeams)
  const [thunderId, falconsId, warriorsId, eaglesId] = [
    createdTeams['thunder'],
    createdTeams['falcons'],
    createdTeams['warriors'],
    createdTeams['eagles'],
  ]

  const games = [
    // Week 1 - past games with scores
    {
      homeTeamId: thunderId,
      awayTeamId: falconsId,
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14),
      time: '7:00 PM',
      week: 1,
      played: true,
      homeScore: 68,
      awayScore: 54,
    },
    {
      homeTeamId: warriorsId,
      awayTeamId: eaglesId,
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14),
      time: '8:30 PM',
      week: 1,
      played: true,
      homeScore: 72,
      awayScore: 65,
    },
    // Week 2 - past games with scores
    {
      homeTeamId: falconsId,
      awayTeamId: warriorsId,
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7),
      time: '7:00 PM',
      week: 2,
      played: true,
      homeScore: 61,
      awayScore: 58,
    },
    {
      homeTeamId: eaglesId,
      awayTeamId: thunderId,
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7),
      time: '8:30 PM',
      week: 2,
      played: true,
      homeScore: 55,
      awayScore: 70,
    },
    // Week 3 - upcoming
    {
      homeTeamId: thunderId,
      awayTeamId: warriorsId,
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3),
      time: '7:00 PM',
      week: 3,
      played: false,
    },
    {
      homeTeamId: eaglesId,
      awayTeamId: falconsId,
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3),
      time: '8:30 PM',
      week: 3,
      played: false,
    },
    // Week 4 - upcoming
    {
      homeTeamId: falconsId,
      awayTeamId: eaglesId,
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10),
      time: '7:00 PM',
      week: 4,
      played: false,
    },
    {
      homeTeamId: warriorsId,
      awayTeamId: thunderId,
      date: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 10),
      time: '8:30 PM',
      week: 4,
      played: false,
    },
  ]

  for (const game of games) {
    const existing = await prisma.game.findFirst({
      where: {
        homeTeamId: game.homeTeamId,
        awayTeamId: game.awayTeamId,
        week: game.week,
      }
    })
    if (!existing) {
      await prisma.game.create({ data: game as any })
    }
  }

  console.log('Seed complete!')
}

main().catch(console.error).finally(() => prisma.$disconnect())
