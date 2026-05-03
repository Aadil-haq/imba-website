export const metadata = { title: 'Rules | IMBA' }

const Section = ({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) => (
  <div style={{ backgroundColor: '#141414', border: '1px solid #1e1e1e', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px' }}>
    <div style={{ padding: '16px 24px', borderBottom: `2px solid ${accent}`, background: `linear-gradient(90deg, ${accent}14 0%, transparent 60%)` }}>
      <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '17px', margin: 0 }}>{title}</h2>
    </div>
    <ul style={{ margin: 0, padding: '20px 24px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {children}
    </ul>
  </div>
)

const Rule = ({ children, highlight }: { children: React.ReactNode; highlight?: 'warn' | 'danger' | 'good' }) => {
  const colors = {
    warn:   { bg: '#2a1e00', border: '#F5A623', text: '#F5A623' },
    danger: { bg: '#2a0a0a', border: '#e74c3c', text: '#e74c3c' },
    good:   { bg: '#0a2a14', border: '#27AE60', text: '#27AE60' },
  }
  const c = highlight ? colors[highlight] : null
  return (
    <li style={{
      display: 'flex', alignItems: 'flex-start', gap: '10px',
      padding: c ? '10px 14px' : '4px 0',
      backgroundColor: c?.bg ?? 'transparent',
      border: c ? `1px solid ${c.border}` : 'none',
      borderRadius: c ? '8px' : '0',
      borderLeft: c ? `3px solid ${c.border}` : '2px solid #2a2a2a',
      paddingLeft: c ? '14px' : '12px',
    }}>
      <span style={{ color: '#555', fontSize: '16px', lineHeight: '1.5', flexShrink: 0 }}>—</span>
      <span style={{ color: c?.text ?? '#ccc', fontSize: '14px', lineHeight: 1.7 }}>{children}</span>
    </li>
  )
}

export default function RulesPage() {
  return (
    <div style={{ backgroundColor: '#0f0f0f', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#0d0d0d', borderBottom: '1px solid #1a1a1a', padding: '40px 0' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ color: '#4A9FE3', fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '10px' }}>
            D2 Summer 2026
          </div>
          <h1 style={{ color: '#fff', fontSize: 'clamp(28px,5vw,48px)', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '10px' }}>
            League Rulebook
          </h1>
          <p style={{ color: '#555', fontSize: '15px' }}>
            IMBA D2 Summer — Official Regulations, Logistics &amp; Rules
          </p>
        </div>
      </div>

      {/* Quick stats bar */}
      <div style={{ backgroundColor: '#111', borderBottom: '1px solid #1a1a1a', padding: '18px 0' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
            {[
              { label: 'Game Days', value: 'Saturdays' },
              { label: 'Time', value: '2:00 – 7:30 PM' },
              { label: 'Season', value: 'May 30 – Aug 16' },
              { label: 'Halves', value: '2 × 20 min' },
              { label: 'Refs', value: '2 per game' },
              { label: 'Foul Out', value: '6 fouls' },
            ].map(i => (
              <div key={i.label}>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: '15px' }}>{i.value}</div>
                <div style={{ color: '#444', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{i.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8" style={{ padding: '40px 16px 60px' }}>

        {/* Regulations & Logistics */}
        <Section title="📋 Regulations & Logistics" accent="#4A9FE3">
          <Rule highlight="good">Seven regular season games and one playoff game guaranteed per team</Rule>
          <Rule>Games will be played at the <strong style={{ color: '#fff' }}>Islamic Center of Irving</strong> — 2555 Esters Rd. Irving, TX 75062</Rule>
          <Rule>Game days will be on <strong style={{ color: '#fff' }}>Saturdays after Thuhr (2:00 PM – 7:30 PM)</strong></Rule>
          <Rule>Aimed start–end dates: <strong style={{ color: '#fff' }}>May 30th – August 16th</strong></Rule>
          <Rule highlight="warn">Please arrive 5–10 minutes before your game so we may start on time</Rule>
          <Rule>The league will have <strong style={{ color: '#fff' }}>two certified referees</strong> per game</Rule>
          <Rule>Stats tracked: rebounds, assists, points, steals, 3-pointers made, free throws made, field goals made and blocks</Rule>
          <Rule>Standings are based on <strong style={{ color: '#fff' }}>record → head-to-head → point differential</strong></Rule>
          <Rule highlight="danger">A forfeit is an automatic loss and <strong>–25 in point differential</strong></Rule>
          <Rule>There will be <strong style={{ color: '#fff' }}>two 20-minute halves</strong></Rule>
          <Rule>Clock only stops in the <strong style={{ color: '#fff' }}>last two minutes</strong> of the second half</Rule>
          <Rule>Clock will also stop on a made basket in the <strong style={{ color: '#fff' }}>last minute</strong></Rule>
          <Rule>Two timeouts per half</Rule>
          <Rule highlight="danger">If a player commits <strong>six fouls</strong> they will be disqualified from the game</Rule>
          <Rule>If a game is tied at the end of the second half there will be a <strong style={{ color: '#fff' }}>3-minute overtime</strong></Rule>
          <Rule>Each team has <strong style={{ color: '#fff' }}>1 timeout in overtime</strong> — timeouts do NOT carry over from regulation</Rule>
          <Rule>Fouls from the second half carry over to overtime</Rule>
          <Rule>Bonus is after <strong style={{ color: '#fff' }}>7 team fouls</strong></Rule>
          <Rule>Double Bonus is after <strong style={{ color: '#fff' }}>10 team fouls</strong></Rule>
          <Rule>Jump balls will be determined by <strong style={{ color: '#fff' }}>possession arrow</strong></Rule>
          <Rule>Two games will be played at the same time</Rule>
        </Section>

        {/* Playoffs */}
        <Section title="🏆 Playoffs & Scheduling" accent="#F5A623">
          <Rule highlight="good">All teams will make the playoffs</Rule>
          <Rule>Playoffs will be <strong style={{ color: '#fff' }}>bracket based, single elimination</strong></Rule>
          <Rule highlight="good">First four seeds will receive a <strong>bye</strong></Rule>
          <Rule>There will be <strong style={{ color: '#fff' }}>4 rounds</strong>: Wild Card → Quarterfinals → Semifinals → Finals</Rule>
          <Rule>Wild Card matchups: 5v12 · 6v11 · 7v10 · 8v9</Rule>
          <Rule>Following rounds are based on results of the previous round</Rule>
          <Rule highlight="warn">Game dates are subject to change based on gym, player and referee availability</Rule>
        </Section>

        {/* Standings */}
        <Section title="📊 Standings & Seedings" accent="#27AE60">
          <Rule>Standings are based on <strong style={{ color: '#fff' }}>record → head-to-head → point differential</strong></Rule>
          <Rule>Standings will be finalized after all regular season games are complete</Rule>
          <Rule>Updated standings will be posted on the website after every week</Rule>
          <Rule>If teams are still tied (point differential, record, no head-to-head matchup) we will use <strong style={{ color: '#fff' }}>strength of schedule</strong></Rule>
        </Section>

        {/* Substitutions & Rosters */}
        <Section title="👥 Substitutions & Rosters" accent="#a855f7">
          <Rule highlight="warn">All players must be on the submitted roster <strong>before</strong> they arrive to the game</Rule>
          <Rule highlight="danger">Teams <strong>cannot</strong> pick up players on game day unless there is an emergency</Rule>
          <Rule>All players must check in with the scorekeeper before the game</Rule>
          <Rule>If a team does not have enough players due to injuries or fouling out, organizers will pick a replacement</Rule>
          <Rule>If a team needs a substitution they must communicate with the league admins beforehand</Rule>
          <Rule highlight="danger">If a team plays an ineligible player, the team receives a <strong>technical foul</strong> and the player is removed</Rule>
        </Section>

        {/* Rules & Punishments */}
        <Section title="⚖️ Rules & Punishments" accent="#e74c3c">
          <Rule highlight="warn">Any cursing will result in a <strong>technical foul</strong></Rule>
          <Rule highlight="danger">Starting a fight → <strong>automatic ejection from the tournament</strong></Rule>
          <Rule highlight="danger">Retaliating → <strong>one game suspension</strong></Rule>
          <Rule highlight="danger">Physical altercations of any kind → <strong>automatic ejection from the tournament</strong></Rule>
          <Rule>Organizers will determine and enforce all punishments and rules</Rule>
          <Rule highlight="warn">Every team must arrive at least <strong>5 minutes</strong> before their scheduled game</Rule>
          <Rule>A game may start with only <strong style={{ color: '#fff' }}>4 players</strong></Rule>
          <Rule>If a team cannot field enough players within <strong style={{ color: '#fff' }}>5 minutes</strong> of tip-off, the opposing team is awarded 2 technical free throws</Rule>
          <Rule>After every additional 5 minutes without enough players, 2 more free throws are awarded</Rule>
          <Rule highlight="danger">After <strong>15 minutes</strong> the game will be forfeited</Rule>
          <Rule highlight="danger">If a player has not paid before the first game, they will <strong>not be allowed to play</strong></Rule>
          <Rule highlight="warn">If a player does not have their jersey it will be a <strong>technical foul</strong> unless arranged with organizers in advance</Rule>
        </Section>

        {/* Contact */}
        <div style={{ backgroundColor: '#141414', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ color: '#fff', fontWeight: 800, fontSize: '17px', marginBottom: '18px' }}>📬 Contact</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'Email', value: 'imba.mgmt@gmail.com', href: 'mailto:imba.mgmt@gmail.com' },
              { label: 'Phone', value: '(917) 975-9266', href: 'tel:+19179759266' },
              { label: 'Instagram', value: '@imba_0fficial', href: 'https://www.instagram.com/imba_0fficial/' },
            ].map(c => (
              <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ color: '#444', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', width: '72px', flexShrink: 0 }}>{c.label}</span>
                <a href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
                  style={{ color: '#4A9FE3', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>
                  {c.value}
                </a>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
