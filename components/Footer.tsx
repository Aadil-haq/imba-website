import Link from 'next/link'
import Image from 'next/image'

const footerLinks = [
  { href: '/schedule', label: 'Schedule' },
  { href: '/standings', label: 'Standings' },
  { href: '/stats', label: 'Stats Leaders' },
  { href: '/teams', label: 'Teams' },
  { href: 'https://forms.gle/dhRHPR2GqghCNTKv6', label: 'Captain Sign-Up' },
  { href: '/register', label: 'Player Registration' },
  { href: '/admin', label: 'Admin' },
]

export default function Footer() {
  return (
    <footer style={{ backgroundColor: '#0a0a0a', borderTop: '1px solid #2a2a2a' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div style={{ backgroundColor: '#fff', width: '44px', height: '44px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden', padding: '2px' }}>
                <Image src="/logo.png" alt="IMBA Logo" width={40} height={40} style={{ objectFit: 'contain' }} />
              </div>
              <div>
                <div style={{ color: '#ffffff', fontWeight: 800, fontSize: '20px' }}>IMBA</div>
                <div style={{ color: '#4A9FE3', fontSize: '12px', fontWeight: 600 }}>Irving Masjid Basketball</div>
              </div>
            </div>
            <p style={{ color: '#888888', fontSize: '14px', lineHeight: '1.6', marginBottom: '16px' }}>
              Bringing the community together through basketball. Play hard, play fair, play for the deen.
            </p>
            {/* Instagram */}
            <a
              href="https://www.instagram.com/imba_0fficial/"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#1a1a1a',
                border: '1px solid #2a2a2a',
                borderRadius: '8px',
                padding: '8px 14px',
                textDecoration: 'none',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                transition: 'border-color 0.2s',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f09433" />
                    <stop offset="25%" stopColor="#e6683c" />
                    <stop offset="50%" stopColor="#dc2743" />
                    <stop offset="75%" stopColor="#cc2366" />
                    <stop offset="100%" stopColor="#bc1888" />
                  </linearGradient>
                </defs>
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="url(#ig-grad)" strokeWidth="2" fill="none" />
                <circle cx="12" cy="12" r="4" stroke="url(#ig-grad)" strokeWidth="2" fill="none" />
                <circle cx="17.5" cy="6.5" r="1.2" fill="url(#ig-grad)" />
              </svg>
              @imba_0fficial
            </a>
          </div>

          {/* Quick Links */}
          <div>
            <h3 style={{ color: '#4A9FE3', fontWeight: 700, fontSize: '14px', marginBottom: '16px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Quick Links</h3>
            <div className="flex flex-col gap-2">
              {footerLinks.map((link) => {
                const isExternal = link.href.startsWith('http')
                const style = { color: '#888888', fontSize: '14px', textDecoration: 'none' }
                return isExternal ? (
                  <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" style={style} className="footer-link">
                    {link.label}
                  </a>
                ) : (
                  <Link key={link.href} href={link.href} style={style} className="footer-link">
                    {link.label}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Info */}
          <div>
            <h3 style={{ color: '#4A9FE3', fontWeight: 700, fontSize: '14px', marginBottom: '16px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Info</h3>
            <div className="flex flex-col gap-2">
              <p style={{ color: '#888888', fontSize: '14px' }}>
                <span style={{ color: '#cccccc', fontWeight: 600 }}>Location:</span><br />
                Irving Masjid Gym<br />
                Irving, TX
              </p>
              <p style={{ color: '#888888', fontSize: '14px', marginTop: '8px' }}>
                <span style={{ color: '#cccccc', fontWeight: 600 }}>Follow Us:</span><br />
                <a
                  href="https://www.instagram.com/imba_0fficial/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#4A9FE3', textDecoration: 'none' }}
                >
                  Instagram → @imba_0fficial
                </a>
              </p>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #2a2a2a', marginTop: '32px', paddingTop: '24px', textAlign: 'center' }}>
          <p style={{ color: '#555555', fontSize: '13px' }}>
            &copy; {new Date().getFullYear()} Irving Masjid Basketball Association. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
