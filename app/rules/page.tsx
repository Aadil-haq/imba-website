export const metadata = { title: 'Rules | IMBA' }

const LeagueHeader = ({ color, label, day, time }: { color: string; label: string; day: string; time: string }) => (
  <div style={{
    background: `linear-gradient(135deg, ${color}18 0%, #0d0d0d 70%)`,
    border: `1px solid ${color}33`,
    borderLeft: `4px solid ${color}`,
    borderRadius: '12px',
    padding: '20px 24px',
    marginBottom: '16px',
  }}>
    <div style={{ color, fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '6px' }}>{label}</div>
    <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
      {[
        { label: 'Game Day', value: day },
        { label: 'Time', value: time },
        { label: 'Season', value: 'May 30 – Aug 16' },
        { label: 'Games', value: '8 Regular + Playoffs' },
        { label: 'Halves', value: '2 × 20 min' },
        { label: 'Foul Out', value: '6 fouls' },
      ].map(i => (
        <div key={i.label}>
          <div style={{ color: '#fff', fontWeight: 800, fontSize: '15px' }}>{i.value}</div>
          <div style={{ color: '#444', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{i.label}</div>
        </div>
      ))}
    </div>
  </div>
)

const Section = ({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) => (
  <div style={{ backgroundColor: '#141414', border: '1px solid #1e1e1e', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
    <div style={{ padding: '14px 24px', borderBottom: `2px solid ${accent}`, background: `linear-gradient(90deg, ${accent}14 0%, transparent 60%)` }}>
      <h3 style={{ color: '#fff', fontWeight: 800, fontSize: '15px', margin: 0 }}>{title}</h3>
    </div>
    <ul style={{ margin: 0, padding: '18px 24px', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
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

const Divider = ({ label }: { label: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '36px 0 24px' }}>
    <div style={{ flex: 1, height: '1px', backgroundColor: '#1e1e1e' }} />
    <span style={{ color: '#444', fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</span>
    <div style={{ flex: 1, height: '1px', backgroundColor: '#1e1e1e' }} />
  </div>
)

export default function RulesPage() {
  return (
    <div style={{ backgroundColor: '#0f0f0f', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ backgroundColor: '#0d0d0d', borderBottom: '1px solid #1a1a1a', padding: '40px 0' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ color: '#4A9FE3', fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '10px' }}>
            Irving Masjid Basketball Association
          </div>
          <h1 style={{ color: '#fff', fontSize: 'clamp(28px,5vw,48px)', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '10px' }}>
            League Rulebook
          </h1>
          <p style={{ color: '#555', fontSize: '15px' }}>
            Official regulations, logistics &amp; rules for all three leagues
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8" style={{ padding: '40px 16px 60px' }}>

        {/* ── 35+ DRAFT LEAGUE ───────────────────────────────────────────── */}
        <LeagueHeader
          color="#27AE60"
          label="35+ Draft League"
          day="Fridays"
          time="7:10 – 10:30 PM"
        />

        <Section title="📋 35+ Draft — Logistics" accent="#27AE60">
          <Rule highlight="good">7-game regular season — each team plays every other team at least once</Rule>
          <Rule>Games played at the <strong style={{ color: '#fff' }}>Islamic Center of Irving</strong> — 2555 Esters Rd, Irving, TX 75062</Rule>
          <Rule>Game day: <strong style={{ color: '#fff' }}>Fridays after Isha (7:10 PM – 10:30 PM)</strong></Rule>
          <Rule>Season runs <strong style={{ color: '#fff' }}>October 31 – December 12, 2026</strong></Rule>
          <Rule highlight="warn">Please arrive 5–10 minutes before your game so we may start on time</Rule>
          <Rule>Three games per night — one court</Rule>
          <Rule>The league will have <strong style={{ color: '#fff' }}>certified referees</strong> per game</Rule>
        </Section>

        <Section title="🏀 35+ Draft — Format" accent="#27AE60">
          <Rule highlight="good">This is a <strong>draft league</strong> — players are drafted onto balanced teams by league organizers</Rule>
          <Rule>Teams are selected to ensure competitive balance across all rosters</Rule>
          <Rule>Players must be <strong style={{ color: '#fff' }}>35 years of age or older</strong> to participate</Rule>
          <Rule highlight="warn">Registration fee must be paid before the first game to be eligible to play</Rule>
          <Rule>Top teams at the end of the regular season will compete in a playoff round</Rule>
          <Rule>Standings: <strong style={{ color: '#fff' }}>record → head-to-head → point differential</strong></Rule>
        </Section>

        {/* ── D2 REC LEAGUE ──────────────────────────────────────────────── */}
        <Divider label="Division 2 — Recreational" />

        <LeagueHeader
          color="#4A9FE3"
          label="D2 Recreational"
          day="Saturdays"
          time="2:00 – 7:30 PM"
        />

        <Section title="📋 D2 Rec — Logistics" accent="#4A9FE3">
          <Rule highlight="good">Regular season games plus one guaranteed playoff game for every team</Rule>
          <Rule>Games played at the <strong style={{ color: '#fff' }}>Islamic Center of Irving</strong> — 2555 Esters Rd, Irving, TX 75062</Rule>
          <Rule>Game day: <strong style={{ color: '#fff' }}>Saturdays after Thuhr (2:00 PM – 7:30 PM)</strong></Rule>
          <Rule highlight="warn">Please arrive 5–10 minutes before your game so we may start on time</Rule>
          <Rule>Two games will be played simultaneously on both courts</Rule>
          <Rule>The league will have <strong style={{ color: '#fff' }}>two certified referees</strong> per game</Rule>
          <Rule>This league is designed for <strong style={{ color: '#fff' }}>recreational level</strong> players — all skill levels welcome</Rule>
        </Section>

        <Section title="🏆 D2 Rec — Playoffs" accent="#4A9FE3">
          <Rule highlight="good">All teams make the playoffs — single elimination bracket</Rule>
          <Rule>Bottom seeds compete in a <strong style={{ color: '#fff' }}>Play-In Round</strong> before the main bracket</Rule>
          <Rule highlight="warn">Play-In winners must be prepared to play twice on the same day</Rule>
          <Rule>Quarterfinals, Semifinals &amp; Finals are played on the <strong style={{ color: '#fff' }}>big court</strong></Rule>
          <Rule>Standings: <strong style={{ color: '#fff' }}>record → head-to-head → point differential</strong></Rule>
          <Rule highlight="warn">Game dates subject to change based on gym, player and referee availability</Rule>
        </Section>

        <Section title="📐 D2 Rec — Competition Level" accent="#4A9FE3">
          <Rule highlight="warn">Management reserves the right to move players to a different division if their skill level exceeds D2 standards</Rule>
          <Rule>D2 is intended to be <strong style={{ color: '#fff' }}>competitive but recreational</strong> — play hard and play fair</Rule>
          <Rule>Players may also register for <strong style={{ color: '#fff' }}>D1</strong> if they choose to compete at the higher level simultaneously</Rule>
        </Section>

        {/* ── D1 COMP LEAGUE ─────────────────────────────────────────────── */}
        <Divider label="Division 1 — Competitive" />

        <LeagueHeader
          color="#F5A623"
          label="D1 Competitive — MCL Qualifier"
          day="Saturdays"
          time="TBD"
        />

        <Section title="📋 D1 Comp — Logistics" accent="#F5A623">
          <Rule highlight="good">Regular season games plus playoffs — top teams qualify for MCL (Muslim Competitive League)</Rule>
          <Rule>Games played at the <strong style={{ color: '#fff' }}>Islamic Center of Irving</strong> — 2555 Esters Rd, Irving, TX 75062</Rule>
          <Rule highlight="warn">Please arrive 5–10 minutes before your game so we may start on time</Rule>
          <Rule>The league will have <strong style={{ color: '#fff' }}>two certified referees</strong> per game</Rule>
          <Rule>Only <strong style={{ color: '#fff' }}>8 teams</strong> will be allowed to compete in D1</Rule>
          <Rule highlight="warn">Teams not meeting the competition level may be moved down to D2 at organizers' discretion</Rule>
        </Section>

        <Section title="🏆 D1 Comp — Playoffs & MCL" accent="#F5A623">
          <Rule highlight="good">D1 serves as the <strong>qualifying league for MCL</strong> — Muslim Competitive League</Rule>
          <Rule>Top performing teams at the end of the season will represent IMBA in MCL</Rule>
          <Rule>Single elimination playoff bracket — seeded by regular season record</Rule>
          <Rule>Standings: <strong style={{ color: '#fff' }}>record → head-to-head → point differential</strong></Rule>
          <Rule highlight="warn">Game dates subject to change based on gym, player and referee availability</Rule>
        </Section>

        <Section title="📐 D1 Comp — Competition Level" accent="#F5A623">
          <Rule highlight="danger">D1 is a <strong>competitive division</strong> — high level of play expected</Rule>
          <Rule>Players may also register for <strong style={{ color: '#fff' }}>D2</strong> simultaneously if they choose</Rule>
          <Rule highlight="warn">If a team does not meet the competition level after games begin, they may be moved to D2</Rule>
          <Rule>Rosters are capped to maintain balance — organizers manage roster eligibility</Rule>
        </Section>

        {/* ── SHARED RULES ───────────────────────────────────────────────── */}
        <Divider label="Rules — All Leagues" />

        <Section title="⏱ Game Format (D1 &amp; D2)" accent="#a855f7">
          <Rule>Two <strong style={{ color: '#fff' }}>20-minute halves</strong></Rule>
          <Rule>Clock only stops in the <strong style={{ color: '#fff' }}>last two minutes</strong> of the second half</Rule>
          <Rule>Clock also stops on a made basket in the <strong style={{ color: '#fff' }}>last minute</strong></Rule>
          <Rule>Two timeouts per half</Rule>
          <Rule>If tied after regulation: <strong style={{ color: '#fff' }}>3-minute overtime</strong></Rule>
          <Rule>Each team has <strong style={{ color: '#fff' }}>1 timeout in overtime</strong> — timeouts do not carry over from regulation</Rule>
          <Rule>Fouls from the second half carry over to overtime</Rule>
          <Rule>Bonus after <strong style={{ color: '#fff' }}>7 team fouls</strong> · Double bonus after <strong style={{ color: '#fff' }}>10 team fouls</strong></Rule>
          <Rule highlight="danger">Six fouls → <strong>disqualified from the game</strong></Rule>
          <Rule>Jump balls decided by <strong style={{ color: '#fff' }}>possession arrow</strong></Rule>
          <Rule>Stats tracked: points, rebounds, assists, steals, blocks, 3-pointers made, free throws made, field goals made</Rule>
          <Rule highlight="danger">A forfeit is an automatic loss with <strong>–25 point differential</strong></Rule>
        </Section>

        <Section title="⏱ Game Format (35+ Draft)" accent="#27AE60">
          <Rule highlight="good"><strong>Half court</strong> — one basket, played on half the floor</Rule>
          <Rule highlight="good"><strong>Make it, take it</strong> — scoring team keeps possession</Rule>
          <Rule highlight="good">After a made basket, inbound from the <strong>top of the key</strong> — no check-up</Rule>
          <Rule>After a defensive stop or turnover, ball must be cleared <strong style={{ color: '#fff' }}>behind the three-point line</strong> before attacking</Rule>
          <Rule>Two <strong style={{ color: '#fff' }}>20-minute halves</strong> — same clock rules as D1/D2</Rule>
          <Rule>Two timeouts per half</Rule>
          <Rule>If tied after regulation: <strong style={{ color: '#fff' }}>3-minute overtime</strong>, 1 timeout, make it take it</Rule>
          <Rule>Bonus after <strong style={{ color: '#fff' }}>7 team fouls</strong> · Double bonus after <strong style={{ color: '#fff' }}>10 team fouls</strong></Rule>
          <Rule highlight="danger">Six fouls → <strong>disqualified from the game</strong></Rule>
          <Rule highlight="danger">A forfeit is an automatic loss with <strong>–25 point differential</strong></Rule>
        </Section>

        <Section title="👥 Substitutions & Rosters" accent="#a855f7">
          <Rule highlight="warn">All players must be on the submitted roster <strong>before</strong> they arrive to the game</Rule>
          <Rule highlight="danger">Teams <strong>cannot</strong> pick up players on game day unless there is an emergency</Rule>
          <Rule>All players must check in with the scorekeeper before the game</Rule>
          <Rule>If a team does not have enough players due to injuries or fouling out, organizers will pick a replacement</Rule>
          <Rule highlight="warn">Subs should only be brought in <strong>if needed</strong> — do not bring a sub if your roster is healthy</Rule>
          <Rule highlight="danger">Subs <strong>cannot exceed the skill level</strong> of the player they are subbing for</Rule>
          <Rule highlight="danger">Playing an ineligible player → <strong>technical foul</strong> and the player is removed</Rule>
        </Section>

        <Section title="⚖️ Rules & Punishments" accent="#e74c3c">
          <Rule highlight="warn">Any cursing → <strong>technical foul</strong></Rule>
          <Rule highlight="danger">Starting a fight → <strong>automatic ejection from the tournament</strong></Rule>
          <Rule highlight="danger">Retaliating → <strong>one game suspension</strong></Rule>
          <Rule highlight="danger">Physical altercations of any kind → <strong>automatic ejection from the tournament</strong></Rule>
          <Rule>Organizers will determine and enforce all punishments and rules</Rule>
          <Rule highlight="warn">Every team must arrive at least <strong>5 minutes</strong> before their scheduled game</Rule>
          <Rule>A game may start with only <strong style={{ color: '#fff' }}>4 players</strong></Rule>
          <Rule>If a team cannot field enough players within <strong style={{ color: '#fff' }}>5 minutes</strong> of tip-off, the opposing team receives 2 technical free throws</Rule>
          <Rule>After every additional 5 minutes without enough players, 2 more free throws are awarded</Rule>
          <Rule highlight="danger">After <strong>15 minutes</strong> the game will be forfeited</Rule>
          <Rule highlight="danger">If a player has not paid before the first game, they will <strong>not be allowed to play</strong></Rule>
          <Rule highlight="warn">No jersey → <strong>technical foul</strong> unless arranged with organizers in advance</Rule>
        </Section>

        {/* Contact */}
        <div style={{ backgroundColor: '#141414', border: '1px solid #1e1e1e', borderRadius: '12px', padding: '24px' }}>
          <h3 style={{ color: '#fff', fontWeight: 800, fontSize: '15px', marginBottom: '18px' }}>📬 Contact</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'Email',     value: 'imba.mgmt@gmail.com',    href: 'mailto:imba.mgmt@gmail.com' },
              { label: 'Phone',     value: '(917) 975-9266',         href: 'tel:+19179759266' },
              { label: 'Instagram', value: '@imba_0fficial',         href: 'https://www.instagram.com/imba_0fficial/' },
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
