'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/schedule', label: 'Schedule' },
  { href: '/standings', label: 'Standings' },
  { href: '/stats', label: 'Stats' },
  { href: '/teams', label: 'Teams' },
  { href: '/rules', label: 'Rules' },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()

  return (
    <nav style={{ backgroundColor: '#111111', borderBottom: '1px solid #2a2a2a' }} className="sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="IMBA Logo"
              className="h-10 w-auto"
              style={{ filter: 'none' }}
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
                const fallback = target.nextElementSibling as HTMLElement
                if (fallback) fallback.style.display = 'flex'
              }}
            />
            <span
              className="hidden"
              style={{
                backgroundColor: '#4A9FE3',
                color: '#ffffff',
                fontWeight: 900,
                fontSize: '20px',
                width: '40px',
                height: '40px',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px'
              }}
            >
              I
            </span>
            <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '20px' }}>IMBA</div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              const isExternal = link.href.startsWith('http')
              const linkStyle = {
                color: (!isExternal && pathname === link.href) ? '#4A9FE3' : '#cccccc',
                fontWeight: (!isExternal && pathname === link.href) ? 700 : 500,
                fontSize: '14px',
                textDecoration: 'none',
                transition: 'color 0.2s',
              }
              return isExternal ? (
                <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" style={linkStyle}
                  onMouseEnter={(e) => { (e.target as HTMLElement).style.color = '#ffffff' }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.color = '#cccccc' }}>
                  {link.label}
                </a>
              ) : (
                <Link key={link.href} href={link.href} style={linkStyle}
                  onMouseEnter={(e) => { if (pathname !== link.href) (e.target as HTMLElement).style.color = '#ffffff' }}
                  onMouseLeave={(e) => { if (pathname !== link.href) (e.target as HTMLElement).style.color = '#cccccc' }}>
                  {link.label}
                </Link>
              )
            })}
            <Link
              href="/register"
              style={{
                backgroundColor: '#4A9FE3',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '14px',
                padding: '8px 20px',
                borderRadius: '6px',
                textDecoration: 'none',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#2d7fc7' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#4A9FE3' }}
            >
              Register Now
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ color: '#ffffff', background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}
            aria-label="Toggle menu"
          >
            <div style={{ width: '24px', height: '2px', backgroundColor: '#ffffff', marginBottom: '5px', transition: 'transform 0.2s', transform: menuOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
            <div style={{ width: '24px', height: '2px', backgroundColor: '#ffffff', marginBottom: '5px', opacity: menuOpen ? 0 : 1 }} />
            <div style={{ width: '24px', height: '2px', backgroundColor: '#ffffff', transition: 'transform 0.2s', transform: menuOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div style={{ backgroundColor: '#1a1a1a', borderTop: '1px solid #2a2a2a' }} className="md:hidden py-4">
            {navLinks.map((link) => {
              const isExternal = link.href.startsWith('http')
              const mobileLinkStyle = {
                display: 'block',
                color: (!isExternal && pathname === link.href) ? '#4A9FE3' : '#cccccc',
                fontWeight: (!isExternal && pathname === link.href) ? 700 : 500,
                fontSize: '16px',
                padding: '12px 16px',
                textDecoration: 'none',
              }
              return isExternal ? (
                <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)} style={mobileLinkStyle}>
                  {link.label}
                </a>
              ) : (
                <Link key={link.href} href={link.href}
                  onClick={() => setMenuOpen(false)} style={mobileLinkStyle}>
                  {link.label}
                </Link>
              )
            })}
            <div className="px-4 pt-2">
              <Link
                href="/register"
                onClick={() => setMenuOpen(false)}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  backgroundColor: '#4A9FE3',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '16px',
                  padding: '12px',
                  borderRadius: '6px',
                  textDecoration: 'none',
                }}
              >
                Register Now
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
