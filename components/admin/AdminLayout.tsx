'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/homepage', label: 'Homepage', icon: '🏠' },
  { href: '/admin/seasons', label: 'Active Seasons', icon: '🗓️' },
  { href: '/admin/active-teams', label: 'Active Teams', icon: '🏆' },
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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false) }, [pathname])

  const handleLogout = async () => {
    await fetch('/api/admin/login', { method: 'DELETE' })
    router.push('/admin/login')
    router.refresh()
  }

  const currentPage = navItems.find(i => i.pathname === pathname || i.href === pathname)

  const Sidebar = (
    <div style={{
      width: '240px',
      backgroundColor: '#111111',
      borderRight: '1px solid #2a2a2a',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      height: isMobile ? '100vh' : '100%',
    }}>
      <div style={{ padding: '20px', borderBottom: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: '#4A9FE3', fontWeight: 800, fontSize: '16px' }}>IMBA Admin</div>
          <div style={{ color: '#555', fontSize: '12px' }}>Management Dashboard</div>
        </div>
        {isMobile && (
          <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#555', fontSize: '22px', cursor: 'pointer', padding: '4px' }}>✕</button>
        )}
      </div>

      <nav style={{ padding: '12px', flex: 1, overflowY: 'auto' }}>
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '11px 12px',
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
            <span style={{ fontSize: '16px' }}>{item.icon}</span>
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
  )

  if (isMobile) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0d0d0d' }}>
        {/* Mobile top bar */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 50,
          backgroundColor: '#111', borderBottom: '1px solid #2a2a2a',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px',
        }}>
          <div style={{ color: '#4A9FE3', fontWeight: 800, fontSize: '16px' }}>IMBA Admin</div>
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ background: 'none', border: '1px solid #2a2a2a', borderRadius: '6px', color: '#fff', padding: '6px 10px', cursor: 'pointer', fontSize: '18px' }}
          >
            ☰
          </button>
        </div>

        {/* Overlay */}
        {sidebarOpen && (
          <>
            <div
              onClick={() => setSidebarOpen(false)}
              style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 99 }}
            />
            <div style={{ position: 'fixed', top: 0, left: 0, zIndex: 100, height: '100vh' }}>
              {Sidebar}
            </div>
          </>
        )}

        {/* Content */}
        <div style={{ flex: 1 }}>
          {children}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0d0d0d' }}>
      {Sidebar}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </div>
    </div>
  )
}
