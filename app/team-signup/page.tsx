'use client'

import { useState } from 'react'

const DIVISIONS = [
  { value: 'Comp', label: '🏆 Comp Division', desc: 'Competitive play' },
  { value: 'Rec',  label: '🏀 Rec Division',  desc: 'Recreational play' },
]

interface FormData {
  teamName: string
  captainName: string
  phone: string
  division: string
}

export default function TeamSignupPage() {
  const [form, setForm] = useState<FormData>({
    teamName: '', captainName: '', phone: '', division: 'Comp',
  })
  const [errors, setErrors] = useState<Partial<FormData>>({})
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [createdTeam, setCreatedTeam] = useState('')

  const validate = () => {
    const e: Partial<FormData> = {}
    if (!form.teamName.trim()) e.teamName = 'Required'
    if (!form.captainName.trim()) e.captainName = 'Required'
    if (!form.phone.trim()) e.phone = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const res = await fetch('/api/team-signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer imba-admin-2025',
        },
        body: JSON.stringify({
          teamName: form.teamName.trim(),
          captainName: form.captainName.trim(),
          division: form.division,
          phone: form.phone.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to register team')
      setCreatedTeam(form.teamName.trim())
      setDone(true)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'An error occurred. Please try again.')
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

  if (done) {
    return (
      <div style={{ backgroundColor: '#111111', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>🏀</div>
          <h1 style={{ color: '#27AE60', fontSize: '32px', fontWeight: 900, marginBottom: '12px' }}>Team Registered!</h1>
          <p style={{ color: '#aaa', fontSize: '18px', marginBottom: '8px' }}>
            <strong style={{ color: '#fff' }}>{createdTeam}</strong> is now active.
          </p>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '32px' }}>
            Your players can now select this team when they register.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="/register"
              style={{ backgroundColor: '#4A9FE3', color: '#fff', fontWeight: 700, fontSize: '14px', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none' }}
            >
              Player Registration →
            </a>
            <a
              href="/team-signup"
              onClick={() => { setDone(false); setForm({ teamName: '', captainName: '', phone: '', division: 'Comp' }) }}
              style={{ backgroundColor: '#2a2a2a', color: '#aaa', fontWeight: 700, fontSize: '14px', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none' }}
            >
              Register Another Team
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: '#111111', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#0d0d0d', borderBottom: '1px solid #2a2a2a', padding: '24px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ color: '#4A9FE3', fontSize: '12px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>
            Irving Masjid Basketball Association
          </div>
          <h1 style={{ color: '#ffffff', fontSize: 'clamp(26px, 5vw, 40px)', fontWeight: 900, marginBottom: '8px' }}>
            Captain Sign-Up
          </h1>
          <p style={{ color: '#666', fontSize: 'clamp(14px, 3vw, 16px)' }}>
            Register your team · D2 2026 Summer Season
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div style={{ maxWidth: '520px' }}>

          <form onSubmit={handleSubmit}>
            {/* Division */}
            <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '14px', padding: '28px', marginBottom: '20px' }}>
              <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '17px', marginBottom: '20px' }}>Division</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {DIVISIONS.map(d => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, division: d.value }))}
                    style={{
                      padding: '14px 12px',
                      borderRadius: '8px',
                      border: `2px solid ${form.division === d.value ? '#4A9FE3' : '#2a2a2a'}`,
                      backgroundColor: form.division === d.value ? '#0d2a3e' : '#111',
                      color: form.division === d.value ? '#4A9FE3' : '#666',
                      fontWeight: 700,
                      fontSize: '13px',
                      cursor: 'pointer',
                      textAlign: 'left' as const,
                      lineHeight: 1.4,
                    }}
                  >
                    <div>{d.label}</div>
                    <div style={{ color: form.division === d.value ? '#4A9FE380' : '#444', fontSize: '11px', fontWeight: 400, marginTop: '2px' }}>{d.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Team & Captain Info */}
            <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '14px', padding: '28px', marginBottom: '20px' }}>
              <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '17px', marginBottom: '20px' }}>Team Information</h3>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Team Name *</label>
                <input
                  value={form.teamName}
                  onChange={e => setForm(f => ({ ...f, teamName: e.target.value }))}
                  style={inputStyle(errors.teamName)}
                  placeholder="e.g. King of Kings"
                />
                {errEl(errors.teamName)}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Captain Full Name *</label>
                <input
                  value={form.captainName}
                  onChange={e => setForm(f => ({ ...f, captainName: e.target.value }))}
                  style={inputStyle(errors.captainName)}
                  placeholder="e.g. Ahmad Hassan"
                />
                {errEl(errors.captainName)}
              </div>

              <div>
                <label style={labelStyle}>Captain Phone *</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  style={inputStyle(errors.phone)}
                  placeholder="(972) 555-0100"
                />
                {errEl(errors.phone)}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                backgroundColor: loading ? '#2a4a6a' : '#4A9FE3',
                color: '#fff',
                fontWeight: 900,
                fontSize: '16px',
                padding: '16px',
                borderRadius: '10px',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.03em',
              }}
            >
              {loading ? 'Registering...' : 'Register Team →'}
            </button>

            <p style={{ color: '#444', fontSize: '12px', textAlign: 'center', marginTop: '14px' }}>
              After registering, share the player registration link with your teammates.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
