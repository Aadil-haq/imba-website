'use client'

import { useState } from 'react'
import Link from 'next/link'

const DIVISIONS = [
  { id: 'D1 Comp Division', label: 'Division 1', description: 'MCL Qualifier' },
  { id: 'D2 Division', label: 'Division 2', description: 'Recreational' },
]

export default function CaptainSignupPage() {
  const [form, setForm] = useState({
    captainName: '',
    teamName: '',
    division: '',
    phone: '',
    email: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.captainName.trim()) e.captainName = 'Required'
    if (!form.teamName.trim()) e.teamName = 'Required'
    if (!form.division) e.division = 'Required'
    if (!form.phone.trim()) e.phone = 'Required'
    if (!form.email.trim() || !form.email.includes('@')) e.email = 'Valid email required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const res = await fetch('/api/captain-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed')
      setSubmitted(true)
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

  const errEl = (key: string) => errors[key] ? (
    <div style={{ color: '#e74c3c', fontSize: '11px', marginTop: '4px' }}>{errors[key]}</div>
  ) : null

  if (submitted) {
    return (
      <div style={{ backgroundColor: '#111', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '16px', padding: '48px', maxWidth: '520px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏀</div>
          <h2 style={{ color: '#27AE60', fontSize: '28px', fontWeight: 900, marginBottom: '12px' }}>Team Registered!</h2>
          <p style={{ color: '#888', fontSize: '15px', marginBottom: '8px', lineHeight: '1.6' }}>
            <span style={{ color: '#fff', fontWeight: 700 }}>{form.teamName}</span> has been registered for {DIVISIONS.find(d => d.id === form.division)?.label}.
          </p>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '28px', lineHeight: '1.6' }}>
            Your team will now appear in the player registration dropdown so your players can sign up.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/" style={{ backgroundColor: '#4A9FE3', color: '#fff', fontWeight: 700, fontSize: '14px', padding: '10px 24px', borderRadius: '6px', textDecoration: 'none' }}>
              Back to Home
            </Link>
            <button
              onClick={() => { setSubmitted(false); setForm({ captainName: '', teamName: '', division: '', phone: '', email: '' }) }}
              style={{ backgroundColor: '#1a1a1a', color: '#ccc', fontWeight: 600, fontSize: '14px', padding: '10px 24px', borderRadius: '6px', border: '1px solid #2a2a2a', cursor: 'pointer' }}
            >
              Register Another Team
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: '#111111', minHeight: '100vh' }}>
      <div style={{ backgroundColor: '#0d0d0d', borderBottom: '1px solid #2a2a2a', padding: '24px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ color: '#4A9FE3', fontSize: '12px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>Irving Masjid Basketball Association</div>
          <h1 style={{ color: '#ffffff', fontSize: 'clamp(26px, 5vw, 40px)', fontWeight: 900, marginBottom: '8px' }}>Captain Sign-Up</h1>
          <p style={{ color: '#666', fontSize: 'clamp(14px, 3vw, 16px)' }}>Register your team. Your players will select your team name when they sign up.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div style={{ maxWidth: '560px' }}>
          <form onSubmit={handleSubmit}>

            <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '14px', padding: '28px', marginBottom: '20px' }}>
              <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '17px', marginBottom: '22px' }}>Team Information</h3>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Captain Name *</label>
                <input
                  required
                  value={form.captainName}
                  onChange={e => setForm(f => ({ ...f, captainName: e.target.value }))}
                  style={inputStyle(errors.captainName)}
                  placeholder="Full name"
                />
                {errEl('captainName')}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Team Name *</label>
                <input
                  required
                  value={form.teamName}
                  onChange={e => setForm(f => ({ ...f, teamName: e.target.value }))}
                  style={inputStyle(errors.teamName)}
                  placeholder="e.g. Deen Dynasty"
                />
                {errEl('teamName')}
              </div>

              <div style={{ marginBottom: '0' }}>
                <label style={labelStyle}>Division *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {DIVISIONS.map(div => {
                    const isSelected = form.division === div.id
                    return (
                      <button
                        key={div.id}
                        type="button"
                        onClick={() => { setForm(f => ({ ...f, division: div.id })); if (errors.division) setErrors(prev => { const n = { ...prev }; delete n.division; return n }) }}
                        style={{
                          backgroundColor: isSelected ? '#0d2035' : '#111',
                          border: `2px solid ${isSelected ? '#4A9FE3' : errors.division ? '#e74c3c' : '#2a2a2a'}`,
                          borderRadius: '10px',
                          padding: '12px 16px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ color: isSelected ? '#4A9FE3' : '#fff', fontWeight: 700, fontSize: '14px' }}>{div.label}</div>
                          <div style={{ color: '#666', fontSize: '12px', marginTop: '2px' }}>{div.description}</div>
                        </div>
                        <div style={{
                          width: '18px', height: '18px', borderRadius: '50%',
                          border: `2px solid ${isSelected ? '#4A9FE3' : '#444'}`,
                          backgroundColor: isSelected ? '#4A9FE3' : 'transparent',
                          flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {isSelected && <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#fff' }} />}
                        </div>
                      </button>
                    )
                  })}
                </div>
                {errEl('division')}
              </div>
            </div>

            <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '14px', padding: '28px', marginBottom: '24px' }}>
              <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '17px', marginBottom: '22px' }}>Contact Information</h3>

              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Phone *</label>
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  style={inputStyle(errors.phone)}
                  placeholder="(972) 555-0100"
                />
                {errEl('phone')}
              </div>

              <div>
                <label style={labelStyle}>Email *</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  style={inputStyle(errors.email)}
                  placeholder="captain@example.com"
                />
                {errEl('email')}
              </div>
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
              }}
            >
              {loading ? 'Registering...' : 'Register Team →'}
            </button>

            <p style={{ color: '#555', fontSize: '13px', textAlign: 'center', marginTop: '16px' }}>
              Are you a player?{' '}
              <Link href="/register" style={{ color: '#4A9FE3', textDecoration: 'none' }}>Sign up here →</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
