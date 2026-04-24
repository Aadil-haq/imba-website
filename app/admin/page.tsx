import AdminLayout from '@/components/admin/AdminLayout'
import { prisma } from '@/lib/db'
import Link from 'next/link'

async function getDashboardStats() {
  const [teams, players, games, regs, announcements] = await Promise.all([
    prisma.team.count(),
    prisma.player.count(),
    prisma.game.findMany({ include: { homeTeam: true, awayTeam: true }, orderBy: { date: 'desc' }, take: 5 }),
    prisma.registration.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.announcement.count(),
  ])
  const totalGames = await prisma.game.count()
  const playedGames = await prisma.game.count({ where: { played: true } })
  const pendingPayments = await prisma.registration.count({ where: { paymentStatus: 'pending' } })
  const paidPayments = await prisma.registration.count({ where: { paymentStatus: 'paid' } })
  const totalRegs = await prisma.registration.count()

  return { teams, players, totalGames, playedGames, regs, games, pendingPayments, paidPayments, totalRegs, announcements }
}

export default async function AdminDashboard() {
  const stats = await getDashboardStats()

  return (
    <AdminLayout>
      <div style={{ padding: '32px' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ color: '#ffffff', fontSize: '28px', fontWeight: 900 }}>Dashboard</h1>
          <p style={{ color: '#555', fontSize: '14px' }}>IMBA Spring 2025 Overview</p>
        </div>

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          {[
            { label: 'Teams', value: stats.teams, color: '#4A9FE3', link: '/admin/teams' },
            { label: 'Players', value: stats.players, color: '#4A9FE3', link: '/admin/teams' },
            { label: 'Total Games', value: stats.totalGames, color: '#888', link: '/admin/games' },
            { label: 'Games Played', value: stats.playedGames, color: '#27AE60', link: '/admin/games' },
            { label: 'Registrations', value: stats.totalRegs, color: '#888', link: '/admin/registrations' },
            { label: 'Paid', value: stats.paidPayments, color: '#27AE60', link: '/admin/registrations' },
            { label: 'Pending Pay', value: stats.pendingPayments, color: '#F5A623', link: '/admin/registrations' },
          ].map(card => (
            <Link key={card.label} href={card.link} style={{ textDecoration: 'none' }}>
              <div style={{
                backgroundColor: '#1a1a1a',
                border: `1px solid ${card.color}33`,
                borderRadius: '10px',
                padding: '20px',
              }}>
                <div style={{ color: card.color, fontSize: '28px', fontWeight: 900 }}>{card.value}</div>
                <div style={{ color: '#555', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>{card.label}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent sections */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          {/* Recent Games */}
          <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Recent Games</h3>
              <Link href="/admin/games" style={{ color: '#4A9FE3', fontSize: '12px', textDecoration: 'none', fontWeight: 600 }}>Manage →</Link>
            </div>
            {stats.games.map(g => (
              <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #222' }}>
                <div style={{ fontSize: '13px', color: '#ccc' }}>
                  {g.homeTeam.name} <span style={{ color: '#555' }}>vs</span> {g.awayTeam.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {g.played ? (
                    <span style={{ color: '#27AE60', fontSize: '13px', fontWeight: 700 }}>{g.homeScore}–{g.awayScore}</span>
                  ) : (
                    <span style={{ color: '#555', fontSize: '11px', backgroundColor: '#2a2a2a', padding: '2px 8px', borderRadius: '4px' }}>TBD</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Recent Registrations */}
          <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>Recent Registrations</h3>
              <Link href="/admin/registrations" style={{ color: '#4A9FE3', fontSize: '12px', textDecoration: 'none', fontWeight: 600 }}>View All →</Link>
            </div>
            {stats.regs.map(r => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #222' }}>
                <div>
                  <div style={{ color: '#ccc', fontSize: '13px', fontWeight: 600 }}>{r.firstName} {r.lastName}</div>
                  <div style={{ color: '#555', fontSize: '11px' }}>{r.paymentMethod} · {r.season}</div>
                </div>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: r.paymentStatus === 'paid' ? '#1a4731' : '#3a2a00',
                  color: r.paymentStatus === 'paid' ? '#27AE60' : '#F5A623',
                }}>
                  {r.paymentStatus.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{ marginTop: '24px', backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '15px', marginBottom: '16px' }}>Quick Actions</h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {[
              { href: '/admin/games', label: '+ Add Game', color: '#4A9FE3' },
              { href: '/admin/stats', label: '📊 Enter Game Stats', color: '#27AE60' },
              { href: '/admin/teams', label: '👕 Add Player', color: '#888' },
              { href: '/admin/registrations', label: '✓ Mark Payment', color: '#F5A623' },
            ].map(action => (
              <Link key={action.href} href={action.href} style={{
                backgroundColor: '#111',
                border: `1px solid ${action.color}33`,
                color: action.color,
                padding: '10px 18px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '13px',
                fontWeight: 600,
              }}>
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
