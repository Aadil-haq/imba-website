'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/homepage', label: 'Homepage', icon: '🏠' },
  { href: '/admin/seasons', label: 'Active Seasons', icon: '🗓️' },
  { href: '/admin/announcements', label: 'Announcements', icon: '📣' },
  { href: '/admin/games', label: 'Games', icon: '🏀' },
  { href: '/admin/stats', label: 'Enter Stats', icon: '📈' },
  { href: '/admin/teams', label: 'Teams & Roster', icon: '👕' },
  { href: '/admin/registrations', label: 'Registrations', icon: '📋' },
  { href: '/admin/stripe', label: 'Stripe Payments', icon: '💳' },
  { href: '/admin/drive', label: 'Drive Links', icon: '📁' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' })
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0d0d0d' }}>
      {/* Sidebar */}
      <div style={{
        width: '240px',
        backgroundColor: '#111111',
        borderRight: '1px solid #2a2a2a',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #2a2a2a' }}>
          <div style={{ color: '#4A9FE3', fontWeight: 800, fontSize: '16px' }}>IMBA Admin</div>
          <div style={{ color: '#555', fontSize: '12px' }}>Management Dashboard</div>
        </div>

        <nav style={{ padding: '12px', flex: 1 }}>
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                borderRadius: '8px',
                marginBottom: '4px',
                textDecoration: 'none',
                backgroundColor: pathname === item.href ? '#1a3a5c' : 'transparent',
                color: pathname === item.href ? '#4A9FE3' : '#888888',
                fontWeight: pathname === item.href ? 700 : 500,
                fontSize: '14px',
                transition: 'all 0.15s',
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div style={{ padding: '16px', borderTop: '1px solid #2a2a2a' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#555', fontSize: '13px', textDecoration: 'none', marginBottom: '8px' }}>
            ← Public Site
          </Link>
          <button
            onClick={handleLogout}
            style={{ width: '100%', backgroundColor: '#1a1a1a', color: '#e74c3c', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
          >
            Logout
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </div>
    </div>
  )
}
