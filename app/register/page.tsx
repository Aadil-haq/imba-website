'use client'

import { useState, useEffect } from 'react'

const DIVISION_2_OPTIONS = [
  'D2 Comp Division',
  'D2 Rec Division',
]

const POSITIONS = [
  { value: 'PG', label: 'Point Guard (PG)' },
  { value: 'SG', label: 'Shooting Guard (SG)' },
  { value: 'SF', label: 'Small Forward (SF)' },
  { value: 'PF', label: 'Power Forward (PF)' },
  { value: 'C', label: 'Center (C)' },
  { value: 'G', label: 'Guard (G)' },
  { value: 'F', label: 'Forward (F)' },
]

interface Team {
  id: string
  name: string
  color: string
  league?: string
}

interface FormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  age: string
  position: string
  league: string
  teamPref: string
  jerseyNumber: string
  jerseySize: string
}

export default function RegisterPage() {
  const [form, setForm] = useState<FormData>({
    firstName: '', lastName: '', email: '', phone: '',
    age: '', position: 'G', league: DIVISION_2_OPTIONS[0], teamPref: '',
    jerseyNumber: '', jerseySize: '',
  })
  const [errors, setErrors] = useState<Partial<FormData & { waiver: string }>>({})
  const [loading, setLoading] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [waiverChecked, setWaiverChecked] = useState(false)

  const selectedLeague = form.league.includes('Comp') ? 'Comp' : 'Rec'

  // Reload teams whenever the selected league changes — pulls teams for active seasons of that league
  useEffect(() => {
    fetch(`/api/teams?forSeason=${selectedLeague}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setTeams(data)
        } else {
          // Fallback: show all active teams filtered by league
          fetch('/api/teams?active=true')
            .then(r => r.json())
            .then(d => setTeams(Array.isArray(d) ? d : []))
            .catch(() => {})
        }
      })
      .catch(() => {})
    // Reset team selection when league changes
    setForm(f => ({ ...f, teamPref: '' }))
  }, [selectedLeague])

  const filteredTeams = teams

  const isComp = form.league.includes('Comp')

  const validate = () => {
    const e: Partial<FormData> = {}
    if (!form.firstName.trim()) e.firstName = 'Required'
    if (!form.lastName.trim()) e.lastName = 'Required'
    if (!form.email.trim() || !form.email.includes('@')) e.email = 'Valid email required'
    if (!form.phone.trim()) e.phone = 'Required'
    const age = parseInt(form.age)
    if (!form.age || isNaN(age) || age < 16) e.age = 'Must be 16+'
    if (!form.position) e.position = 'Required'
    if (!form.teamPref) e.teamPref = 'Please select a team'
    if (!form.jerseyNumber.trim()) (e as any).jerseyNumber = 'Required'
    if (!form.jerseySize) (e as any).jerseySize = 'Required'
    if (!waiverChecked) (e as any).waiver = 'You must agree to the waiver to continue'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)

    try {
      const res = await fetch('/api/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, paymentMethod: 'stripe', amount: 8000 }),
      })
      const data = await res.json().catch(() => ({ error: `Server error (${res.status})` }))
      if (!res.ok) throw new Error(data.error || 'Failed to register')

      const checkoutRes = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, registrationId: data.id }),
      })
      const checkoutData = await checkoutRes.json().catch(() => ({ error: `Payment server error (${checkoutRes.status})` }))

      if (checkoutData.url) {
        window.location.href = checkoutData.url
      } else {
        throw new Error(checkoutData.error || 'Payment setup failed. Contact the league admin.')
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = (hasError?: string) => ({
    width: '100%',
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    border: `1px solid ${hasError ? '#e74c3c' : '#333'}`,
    borderRadius: '8px',
    padding: '11px 14px',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
    cursor: 'auto',
  })

  const labelStyle = {
    color: '#aaaaaa',
    fontSize: '12px',
    fontWeight: 700 as const,
    marginBottom: '6px',
    display: 'block',
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
  }

  const errEl = (msg?: string) => msg ? (
    <div style={{ color: '#e74c3c', fontSize: '11px', marginTop: '4px' }}>{msg}</div>
  ) : null

  return (
    <div style={{ backgroundColor: '#111111', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#0d0d0d', borderBottom: '1px solid #2a2a2a', padding: '24px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ color: '#4A9FE3', fontSize: '12px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>Irving Masjid Basketball Association</div>
          <h1 style={{ color: '#ffffff', fontSize: 'clamp(26px, 5vw, 40px)', fontWeight: 900, marginBottom: '8px' }}>Register to Play</h1>
          <p style={{ color: '#666', fontSize: 'clamp(14px, 3vw, 16px)' }}>Join the Irving Masjid Basketball Association · $80 per player</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ maxWidth: '620px' }}>

            {/* Personal Info */}
            <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '14px', padding: '28px', marginBottom: '20px' }}>
              <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '17px', marginBottom: '22px' }}>Personal Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label style={labelStyle}>First Name *</label>
                  <input required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} style={inputStyle(errors.firstName)} placeholder="Ahmad" />
                  {errEl(errors.firstName)}
                </div>
                <div>
                  <label style={labelStyle}>Last Name *</label>
                  <input required value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} style={inputStyle(errors.lastName)} placeholder="Hassan" />
                  {errEl(errors.lastName)}
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Email *</label>
                <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inputStyle(errors.email)} placeholder="ahmad@example.com" />
                {errEl(errors.email)}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>Phone *</label>
                  <input required type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={inputStyle(errors.phone)} placeholder="(972) 555-0100" />
                  {errEl(errors.phone)}
                </div>
                <div>
                  <label style={labelStyle}>Age *</label>
                  <input required type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} style={inputStyle(errors.age)} placeholder="16+" min="16" />
                  {errEl(errors.age)}
                </div>
              </div>
            </div>

            {/* Basketball Info */}
            <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '14px', padding: '28px', marginBottom: '20px' }}>
              <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '17px', marginBottom: '22px' }}>Basketball Information</h3>

              {/* Division Selection */}
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Division & Season</label>
                <div style={{ backgroundColor: '#111', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <div style={{ width: '3px', height: '16px', backgroundColor: '#27AE60', borderRadius: '2px' }} />
                    <span style={{ color: '#27AE60', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      Division 2
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {DIVISION_2_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, league: opt, teamPref: '' }))}
                        style={{
                          padding: '12px 10px',
                          borderRadius: '8px',
                          border: `2px solid ${form.league === opt ? '#4A9FE3' : '#2a2a2a'}`,
                          backgroundColor: form.league === opt ? '#0d2a3e' : '#1a1a1a',
                          color: form.league === opt ? '#4A9FE3' : '#666',
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          textAlign: 'left',
                          lineHeight: 1.4,
                        }}
                      >
                        {opt.includes('Comp') ? (
                          <>
                            <div style={{ marginBottom: '2px' }}>🏆 Comp Division</div>
                            <div style={{ color: form.league === opt ? '#4A9FE380' : '#444', fontSize: '11px', fontWeight: 400 }}>D2 Division</div>
                          </>
                        ) : (
                          <>
                            <div style={{ marginBottom: '2px' }}>🏀 Rec Division</div>
                            <div style={{ color: form.league === opt ? '#4A9FE380' : '#444', fontSize: '11px', fontWeight: 400 }}>D2 Division</div>
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comp rules notice */}
                {isComp && (
                  <div style={{ backgroundColor: '#2a1a00', border: '1px solid #F5A623', borderRadius: '8px', padding: '14px', marginTop: '10px' }}>
                    <div style={{ color: '#F5A623', fontWeight: 700, fontSize: '12px', marginBottom: '8px', letterSpacing: '0.06em' }}>⚠️ COMP DIVISION RULES</div>
                    <ul style={{ color: '#aaa', fontSize: '12px', lineHeight: 2, margin: 0, paddingLeft: '16px' }}>
                      <li>Must be <strong style={{ color: '#fff' }}>16 or older</strong> to participate</li>
                      <li>Prior league experience not required, but teams may be <strong style={{ color: '#fff' }}>vetoed</strong> if skill level is too high or too low</li>
                      <li>Max <strong style={{ color: '#fff' }}>2 superstar players</strong> and <strong style={{ color: '#fff' }}>2 star players</strong> per team</li>
                    </ul>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label style={labelStyle}>Position *</label>
                  <select required value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} style={{ ...inputStyle(errors.position), cursor: 'pointer' }}>
                    {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                  {errEl(errors.position)}
                </div>
                <div>
                  <label style={labelStyle}>Team *</label>
                  <select
                    value={form.teamPref}
                    onChange={e => setForm(f => ({ ...f, teamPref: e.target.value }))}
                    style={{ ...inputStyle(errors.teamPref), cursor: 'pointer' }}
                  >
                    <option value="">Select your team</option>
                    {filteredTeams.map(t => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                  {errEl(errors.teamPref)}
                  {filteredTeams.length === 0 && (
                    <div style={{ color: '#555', fontSize: '11px', marginTop: '4px' }}>
                      No teams available yet for this division. Check back soon.
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label style={labelStyle}>Jersey Number *</label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    required
                    value={form.jerseyNumber}
                    onChange={e => setForm(f => ({ ...f, jerseyNumber: e.target.value }))}
                    style={inputStyle((errors as any).jerseyNumber)}
                    placeholder="e.g. 23"
                  />
                  {errEl((errors as any).jerseyNumber)}
                </div>
                <div>
                  <label style={labelStyle}>Jersey Size *</label>
                  <select
                    value={form.jerseySize}
                    required
                    onChange={e => setForm(f => ({ ...f, jerseySize: e.target.value }))}
                    style={{ ...inputStyle((errors as any).jerseySize), cursor: 'pointer' }}
                  >
                    <option value="">Select size</option>
                    {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {errEl((errors as any).jerseySize)}
                </div>
              </div>
            </div>

            {/* Payment */}
            <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '14px', padding: '28px', marginBottom: '24px' }}>
              <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '17px', marginBottom: '6px' }}>Payment</h3>
              <p style={{ color: '#555', fontSize: '13px', marginBottom: '20px' }}>Registration fee: $80.00</p>

              <div style={{ backgroundColor: '#111', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '18px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '28px' }}>💳</div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>Credit Card · Debit Card · Apple Pay · Google Pay</div>
                  <div style={{ color: '#555', fontSize: '12px', marginTop: '3px' }}>
                    You will be redirected to our secure checkout after submitting. All major cards accepted.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', color: '#555', fontSize: '12px' }}>
                <span>🔒</span>
                <span>Payments processed securely by Stripe. Your card details are never stored on our servers.</span>
              </div>
            </div>

            {/* Waiver */}
            <div style={{
              backgroundColor: '#1a1a1a',
              border: `1px solid ${(errors as any).waiver ? '#e74c3c' : '#2a2a2a'}`,
              borderRadius: '14px',
              padding: '28px',
              marginBottom: '24px',
            }}>
              <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '17px', marginBottom: '4px' }}>
                Liability Waiver, Dress Code &amp; League Rules
              </h3>
              <p style={{ color: '#555', fontSize: '12px', marginBottom: '20px' }}>
                Please read the full agreement below before registering.
              </p>

              {/* Scrollable waiver text */}
              <div style={{
                backgroundColor: '#111',
                border: '1px solid #2a2a2a',
                borderRadius: '10px',
                padding: '20px',
                maxHeight: '260px',
                overflowY: 'auto',
                marginBottom: '20px',
                lineHeight: 1.8,
              }}>
                <p style={{ color: '#aaa', fontSize: '13px', marginBottom: '14px' }}>
                  I agree that neither my team nor I will make a claim against ICI.
                </p>
                <p style={{ color: '#ccc', fontSize: '12px', fontWeight: 700, marginBottom: '14px', letterSpacing: '0.02em' }}>
                  SPORTS INVOLVE PHYSICAL CONTACT BETWEEN PLAYERS, THAT SERIOUS ACCIDENTS OCCASIONALLY
                  OCCUR DURING SUCH SPORTING ACTIVITIES, AND THAT PARTICIPANTS IN SUCH SPORTING ACTIVITIES
                  OCCASIONALLY SUSTAIN SERIOUS PERSONAL INJURIES (INCLUDING DEATH) AND/OR PROPERTY DAMAGE,
                  AS A CONSEQUENCE THEREOF.
                </p>
                <p style={{ color: '#ccc', fontSize: '12px', fontWeight: 700, marginBottom: '14px', letterSpacing: '0.02em' }}>
                  KNOWING THE RISKS OF PARTICIPATION, NEVERTHELESS, I HEREBY AGREE THAT MY TEAM AND I
                  ASSUME THOSE RISKS AND RELEASE AND HOLD ICI &amp; IMBA HARMLESS.
                </p>
                <p style={{ color: '#aaa', fontSize: '13px', marginBottom: '14px' }}>
                  I attest that my team is physically fit and has no known medical conditions which
                  prohibit participation in this sport.
                </p>
                <p style={{ color: '#ccc', fontSize: '12px', fontWeight: 700, marginBottom: '14px', letterSpacing: '0.02em' }}>
                  I HAVE CAREFULLY READ THIS AGREEMENT AND FULLY UNDERSTAND ITS CONTENTS. I AM AWARE
                  THAT THIS IS A RELEASE OF LIABILITY FOR MYSELF AND MY TEAM AND A CONTRACT BETWEEN
                  MYSELF, MY TEAM AND THE ORGANIZERS. I HAVE SIGNED IT OF MY OWN FREE WILL.
                </p>
                <p style={{ color: '#aaa', fontSize: '13px' }}>
                  I also agree that league organizers may share my team&apos;s photograph or video with
                  community members.
                </p>
              </div>

              {/* Checkbox */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                <div style={{ position: 'relative', flexShrink: 0, marginTop: '1px' }}>
                  <input
                    type="checkbox"
                    checked={waiverChecked}
                    onChange={e => {
                      setWaiverChecked(e.target.checked)
                      if (e.target.checked) setErrors(prev => { const n = { ...prev }; delete (n as any).waiver; return n })
                    }}
                    style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer', margin: 0 }}
                  />
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '5px',
                    border: `2px solid ${waiverChecked ? '#4A9FE3' : (errors as any).waiver ? '#e74c3c' : '#444'}`,
                    backgroundColor: waiverChecked ? '#4A9FE3' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s',
                    pointerEvents: 'none',
                  }}>
                    {waiverChecked && (
                      <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                        <path d="M1 4L4.5 7.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
                <span style={{ color: waiverChecked ? '#fff' : '#888', fontSize: '14px', lineHeight: 1.5, transition: 'color 0.15s' }}>
                  I have read and agree to the Liability Waiver, Dress Code, and League Rules above.
                  I understand this is a binding agreement.
                </span>
              </label>

              {(errors as any).waiver && (
                <div style={{ color: '#e74c3c', fontSize: '12px', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⚠</span> {(errors as any).waiver}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                backgroundColor: loading ? '#2a2a2a' : '#4A9FE3',
                color: '#fff',
                fontWeight: 800,
                fontSize: '17px',
                padding: '16px',
                borderRadius: '10px',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
                letterSpacing: '0.02em',
              }}
            >
              {loading ? 'Processing...' : 'Register & Pay $80 →'}
            </button>
          </form>

          {/* Sidebar */}
          <div>
            <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '14px', padding: '24px', marginBottom: '16px', position: 'sticky', top: '80px' }}>
              <h3 style={{ color: '#4A9FE3', fontWeight: 700, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '18px' }}>Season Details</h3>
              {[
                { label: 'League', value: 'IMBA D2' },
                { label: 'Location', value: 'Irving Masjid Gym' },
                { label: 'Game Days', value: 'Sundays' },
                { label: 'Times', value: '1:00 PM – 7:00 PM' },
                { label: 'Division', value: 'Division 2 (Comp & Rec)' },
                { label: 'Fee', value: '$80 / player' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #222' }}>
                  <span style={{ color: '#555', fontSize: '13px' }}>{item.label}</span>
                  <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>{item.value}</span>
                </div>
              ))}
            </div>

            <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderLeft: '3px solid #F5A623', borderRadius: '10px', padding: '18px' }}>
              <div style={{ color: '#F5A623', fontWeight: 700, fontSize: '12px', marginBottom: '10px', letterSpacing: '0.08em' }}>NOTES</div>
              <ul style={{ color: '#666', fontSize: '13px', lineHeight: '2', paddingLeft: '16px', margin: 0 }}>
                <li>Must be 16+ to participate</li>
                <li>No prior league experience required</li>
                <li>Teams may be vetoed if skill level doesn&apos;t fit</li>
                <li>Comp: max 2 superstar &amp; 2 star players per team</li>
                <li>Payment required to confirm your spot</li>
                <li>Team assignments sent via email</li>
                <li>No refunds after team assignments</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
