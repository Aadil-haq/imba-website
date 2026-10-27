import Link from 'next/link'

const OPTIONS = [
  {
    href: '/team-signup',
    badge: '🏆 35+ Comp League',
    title: 'Captain Sign-Up',
    desc: 'Bring your own team. Only the team captain registers — one form covers the whole roster.',
    points: ['Captains only', 'No individual player fee', 'Team name, phone & email'],
    cta: 'Register My Team →',
    color: '#4A9FE3',
  },
  {
    href: '/register',
    badge: '🎯 35+ Draft League',
    title: 'Individual Player Registration',
    desc: "Sign up on your own and get drafted onto a team. $115 per player.",
    points: ['Individual sign-up', '$115 per player', "You'll be drafted onto a team"],
    cta: 'Register & Pay $115 →',
    color: '#27AE60',
  },
]

export default function SignupPage() {
  return (
    <div style={{ backgroundColor: '#111111', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#0d0d0d', borderBottom: '1px solid #2a2a2a', padding: '24px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ color: '#4A9FE3', fontSize: '12px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>
            Irving Masjid Basketball Association
          </div>
          <h1 style={{ color: '#ffffff', fontSize: 'clamp(26px, 5vw, 40px)', fontWeight: 900, marginBottom: '8px' }}>
            Sign Up
          </h1>
          <p style={{ color: '#666', fontSize: 'clamp(14px, 3vw, 16px)' }}>
            Choose the 35+ league that fits how you want to play
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', maxWidth: '900px' }}>
          {OPTIONS.map(opt => (
            <Link
              key={opt.href}
              href={opt.href}
              style={{
                display: 'block',
                backgroundColor: '#1a1a1a',
                border: '1px solid #2a2a2a',
                borderRadius: '16px',
                padding: '28px',
                textDecoration: 'none',
                transition: 'border-color 0.15s',
              }}
              className="signup-card"
            >
              <span style={{
                display: 'inline-block',
                backgroundColor: `${opt.color}22`,
                color: opt.color,
                fontSize: '12px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '6px',
                marginBottom: '16px',
              }}>
                {opt.badge}
              </span>
              <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 900, marginBottom: '10px' }}>{opt.title}</h2>
              <p style={{ color: '#888', fontSize: '14px', lineHeight: 1.6, marginBottom: '18px' }}>{opt.desc}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 22px 0' }}>
                {opt.points.map(p => (
                  <li key={p} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#aaa', fontSize: '13px', marginBottom: '8px' }}>
                    <span style={{ color: opt.color }}>●</span> {p}
                  </li>
                ))}
              </ul>
              <div style={{
                backgroundColor: opt.color,
                color: '#fff',
                fontWeight: 800,
                fontSize: '14px',
                padding: '12px',
                borderRadius: '8px',
                textAlign: 'center',
              }}>
                {opt.cta}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
