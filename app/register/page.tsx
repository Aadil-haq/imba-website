'use client'

import { useState, useCallback, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, ExpressCheckoutElement, useStripe, useElements } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

const POSITIONS = [
  { value: 'PG', label: 'Point Guard (PG)' },
  { value: 'SG', label: 'Shooting Guard (SG)' },
  { value: 'SF', label: 'Small Forward (SF)' },
  { value: 'PF', label: 'Power Forward (PF)' },
  { value: 'C', label: 'Center (C)' },
  { value: 'G', label: 'Guard (G)' },
  { value: 'F', label: 'Forward (F)' },
]

const LEAGUES = [
  {
    id: 'D1 Comp Division',
    label: 'Division 1',
    description: 'MCL Qualifier',
    notes: [
      'Qualifies teams for MCL (Muslim Competitive League)',
      'Only 8 teams will be allowed to compete',
      'Teams not meeting the competition level may be moved down to D2',
      'Players may play in both D1 and D2 if they choose',
    ],
  },
  {
    id: 'D2 Division',
    label: 'Division 2',
    description: 'Recreational',
    notes: [
      'Management reserves the right to remove players from your team if we believe it exceeds the competition level',
      'Players may play in both D1 and D2 if they choose',
    ],
  },
]

const stripeAppearance = {
  theme: 'night' as const,
  variables: {
    colorPrimary: '#4A9FE3',
    colorBackground: '#111111',
    colorText: '#ffffff',
    colorDanger: '#e74c3c',
    borderRadius: '8px',
    colorTextPlaceholder: '#666666',
    colorTextSecondary: '#aaaaaa',
    spacingUnit: '5px',
  },
  rules: {
    '.Input': { border: '1px solid #333', backgroundColor: '#1a1a1a', color: '#ffffff' },
    '.Input:focus': { border: '1px solid #4A9FE3', boxShadow: 'none' },
    '.Tab': { border: '1px solid #333', backgroundColor: '#1a1a1a', color: '#cccccc' },
    '.Tab:hover': { color: '#ffffff', backgroundColor: '#222222' },
    '.Tab--selected': { border: '1px solid #4A9FE3', backgroundColor: '#0d2035', color: '#4A9FE3' },
    '.Tab--selected:hover': { backgroundColor: '#0d2035', color: '#4A9FE3' },
    '.TabLabel': { color: 'inherit' },
  },
}

// ── Embedded payment form (uses Stripe hooks, must be inside <Elements>) ──
function PaymentForm({ onBack, leagueLabel, finalAmount }: { onBack: () => void; leagueLabel: string; finalAmount: number }) {
  const stripe = useStripe()
  const elements = useElements()
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)
  const [hasExpressOptions, setHasExpressOptions] = useState(false)
  const displayPrice = `$${(finalAmount / 100).toFixed(0)}`

  const confirm = async () => {
    if (!stripe || !elements) return
    setPaying(true)
    setPayError(null)
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/register/success` },
    })
    if (error) {
      setPayError(error.message ?? 'Payment failed. Please try again.')
      setPaying(false)
    }
  }

  const handlePay = async (e: React.FormEvent) => { e.preventDefault(); await confirm() }

  return (
    <form onSubmit={handlePay}>
      <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '14px', padding: '28px', marginBottom: '20px' }}>
        <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '17px', marginBottom: '4px' }}>Payment</h3>
        <p style={{ color: '#555', fontSize: '13px', marginBottom: '24px' }}>{leagueLabel} registration · {displayPrice}</p>

        {/* Apple Pay / Google Pay only — hide Amazon Pay and others */}
        <ExpressCheckoutElement
          onConfirm={confirm}
          onReady={({ availablePaymentMethods }) => {
            const hasAny = availablePaymentMethods &&
              (availablePaymentMethods.applePay || availablePaymentMethods.googlePay)
            setHasExpressOptions(!!hasAny)
          }}
          options={{
            buttonHeight: 48,
            buttonType: { applePay: 'plain', googlePay: 'plain' },
            paymentMethods: {
              amazonPay: 'never',
              applePay: 'auto',
              googlePay: 'auto',
              klarna: 'never',
              link: 'never',
              paypal: 'never',
            },
          }}
        />

        {/* Divider — only shown when Apple/Google Pay is available */}
        {hasExpressOptions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#2a2a2a' }} />
            <span style={{ color: '#555', fontSize: '12px', whiteSpace: 'nowrap' }}>or pay with card</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#2a2a2a' }} />
          </div>
        )}

        <PaymentElement options={{ layout: 'accordion' }} />

        {payError && (
          <div style={{ color: '#e74c3c', fontSize: '13px', marginTop: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>⚠</span> {payError}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button type="button" onClick={onBack} style={{ flex: '0 0 auto', backgroundColor: 'transparent', color: '#888', fontWeight: 700, fontSize: '15px', padding: '16px 20px', borderRadius: '10px', border: '1px solid #333', cursor: 'pointer' }}>
          ← Back
        </button>
        <button type="submit" disabled={!stripe || paying} style={{ flex: 1, backgroundColor: (!stripe || paying) ? '#2a2a2a' : '#4A9FE3', color: '#fff', fontWeight: 800, fontSize: '17px', padding: '16px', borderRadius: '10px', border: 'none', cursor: (!stripe || paying) ? 'not-allowed' : 'pointer', transition: 'background-color 0.2s' }}>
          {paying ? 'Processing...' : `Pay ${displayPrice} →`}
        </button>
      </div>
    </form>
  )
}

// ── Main registration page ──
interface CaptainTeam {
  id: string
  teamName: string
  division: string
}

interface FormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  age: string
  position: string
  jerseyNumber: string
  jerseySize: string
  teamPref: string
}

export default function RegisterPage() {
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null)
  const [captainTeams, setCaptainTeams] = useState<CaptainTeam[]>([])
  const [form, setForm] = useState<FormData>({
    firstName: '', lastName: '', email: '', phone: '',
    age: '', position: 'G', jerseyNumber: '', jerseySize: '', teamPref: '',
  })

  useEffect(() => {
    fetch('/api/captain-signup')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setCaptainTeams(data) })
      .catch(() => {})
  }, [])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [waiverChecked, setWaiverChecked] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [discountInput, setDiscountInput] = useState('')
  const [discountState, setDiscountState] = useState<null | 'checking' | { valid: true; percentOff: number; amountOff: number; code: string } | { valid: false; error: string }>(null)
  const [finalAmount, setFinalAmount] = useState(8000)

  const applyDiscount = async () => {
    const code = discountInput.trim().toUpperCase()
    if (!code) return
    setDiscountState('checking')
    const res = await fetch(`/api/stripe/validate-promo?code=${encodeURIComponent(code)}`)
    const data = await res.json()
    if (data.valid) {
      const pct = data.percentOff ?? 0
      const off = data.amountOff ?? 0
      const discounted = pct === 100 ? 0 : off ? Math.max(0, 8000 - off) : Math.round(8000 * (1 - pct / 100))
      setDiscountState({ valid: true, percentOff: pct, amountOff: off, code: data.code })
      setFinalAmount(discounted)
    } else {
      setDiscountState({ valid: false, error: data.error ?? 'Invalid code' })
      setFinalAmount(8000)
    }
  }

  const selectedLeague = LEAGUES.find(l => l.id === selectedLeagueId)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.firstName.trim()) e.firstName = 'Required'
    if (!form.lastName.trim()) e.lastName = 'Required'
    if (!form.email.trim() || !form.email.includes('@')) e.email = 'Valid email required'
    if (!form.phone.trim()) e.phone = 'Required'
    if (!form.age.trim()) e.age = 'Required'
    if (!form.position) e.position = 'Required'
    if (!form.jerseyNumber.trim()) e.jerseyNumber = 'Required'
    if (!form.jerseySize) e.jerseySize = 'Required'
    if (!form.teamPref) e.teamPref = 'Required — your captain must register your team first'
    if (!waiverChecked) e.waiver = 'You must agree to the waiver to continue'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLeagueId) return
    if (!validate()) return
    setLoading(true)
    const appliedCode = discountState && discountState !== 'checking' && discountState.valid ? discountState.code : undefined
    try {
      const regRes = await fetch('/api/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          league: selectedLeagueId,
          paymentMethod: 'stripe',
          amount: finalAmount,
          teamPref: form.teamPref || null,
          ...(appliedCode ? { discountCode: appliedCode } : {}),
        }),
      })
      const regData = await regRes.json().catch(() => ({ error: `Server error (${regRes.status})` }))
      if (!regRes.ok) throw new Error(regData.error || 'Failed to register')

      // 100% off — skip payment entirely
      if (finalAmount === 0) {
        window.location.href = '/register/success'
        return
      }

      const piRes = await fetch('/api/stripe/payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId: regData.id,
          amount: finalAmount,
          email: form.email,
          firstName: form.firstName,
          lastName: form.lastName,
          league: selectedLeagueId,
        }),
      })
      const piData = await piRes.json().catch(() => ({ error: `Payment error (${piRes.status})` }))
      if (!piRes.ok) throw new Error(piData.error || 'Payment setup failed')

      setClientSecret(piData.clientSecret)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = useCallback(() => setClientSecret(null), [])

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

  return (
    <div style={{ backgroundColor: '#111111', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#0d0d0d', borderBottom: '1px solid #2a2a2a', padding: '24px 0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ color: '#4A9FE3', fontSize: '12px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '10px' }}>Irving Masjid Basketball Association</div>
          <h1 style={{ color: '#ffffff', fontSize: 'clamp(26px, 5vw, 40px)', fontWeight: 900, marginBottom: '8px' }}>
            {clientSecret ? `${selectedLeague?.label} — Payment` : selectedLeague ? `${selectedLeague.label} — Register` : 'Player Registration'}
          </h1>
          <p style={{ color: '#666', fontSize: 'clamp(14px, 3vw, 16px)' }}>
            {clientSecret ? 'Complete your payment below — you\'re almost in.' : selectedLeague ? `${selectedLeague.description} · $80 per player` : 'Select a division below to get started'}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">

          <div style={{ maxWidth: '620px' }}>
            {/* ── Step 2: Embedded payment ── */}
            {clientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
                <PaymentForm onBack={handleBack} leagueLabel={selectedLeague?.label ?? ''} finalAmount={finalAmount} />
              </Elements>
            ) : (
              /* ── Step 1: Registration form ── */
              <form onSubmit={handleContinue}>

                {/* League Picker */}
                <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '14px', padding: '28px', marginBottom: '20px' }}>
                  <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '17px', marginBottom: '6px' }}>Select Division</h3>
                  <p style={{ color: '#555', fontSize: '13px', marginBottom: '20px' }}>Choose the division you want to register for.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {LEAGUES.map(league => {
                      const isSelected = selectedLeagueId === league.id
                      return (
                        <button
                          key={league.id}
                          type="button"
                          onClick={() => setSelectedLeagueId(league.id)}
                          style={{
                            backgroundColor: isSelected ? '#0d2035' : '#111',
                            border: `2px solid ${isSelected ? '#4A9FE3' : '#2a2a2a'}`,
                            borderRadius: '10px',
                            padding: '14px 18px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ color: isSelected ? '#4A9FE3' : '#fff', fontWeight: 700, fontSize: '15px' }}>{league.label}</div>
                            <div style={{ color: '#666', fontSize: '12px', marginTop: '2px' }}>{league.description}</div>
                          </div>
                          <div style={{
                            width: '20px', height: '20px', borderRadius: '50%',
                            border: `2px solid ${isSelected ? '#4A9FE3' : '#444'}`,
                            backgroundColor: isSelected ? '#4A9FE3' : 'transparent',
                            flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {isSelected && <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#fff' }} />}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {selectedLeague && (<>

                {/* Personal Info */}
                <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '14px', padding: '28px', marginBottom: '20px' }}>
                  <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '17px', marginBottom: '22px' }}>Personal Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label style={labelStyle}>First Name *</label>
                      <input required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} style={inputStyle(errors.firstName)} placeholder="Ahmad" />
                      {errEl('firstName')}
                    </div>
                    <div>
                      <label style={labelStyle}>Last Name *</label>
                      <input required value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} style={inputStyle(errors.lastName)} placeholder="Hassan" />
                      {errEl('lastName')}
                    </div>
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={labelStyle}>Email *</label>
                    <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inputStyle(errors.email)} placeholder="ahmad@example.com" />
                    {errEl('email')}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label style={labelStyle}>Phone *</label>
                      <input required type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={inputStyle(errors.phone)} placeholder="(972) 555-0100" />
                      {errEl('phone')}
                    </div>
                    <div>
                      <label style={labelStyle}>Age *</label>
                      <input required type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} style={inputStyle(errors.age)} placeholder="Age" min="1" />
                      {errEl('age')}
                    </div>
                  </div>
                </div>

                {/* Basketball Info */}
                <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '14px', padding: '28px', marginBottom: '20px' }}>
                  <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '17px', marginBottom: '22px' }}>Basketball Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label style={labelStyle}>Position *</label>
                      <select required value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} style={{ ...inputStyle(errors.position), cursor: 'pointer' }}>
                        {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                      {errEl('position')}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label style={labelStyle}>Jersey Number *</label>
                      <input type="number" min="0" max="99" required value={form.jerseyNumber} onChange={e => setForm(f => ({ ...f, jerseyNumber: e.target.value }))} style={inputStyle(errors.jerseyNumber)} placeholder="e.g. 23" />
                      {errEl('jerseyNumber')}
                    </div>
                    <div>
                      <label style={labelStyle}>Jersey Size *</label>
                      <select required value={form.jerseySize} onChange={e => setForm(f => ({ ...f, jerseySize: e.target.value }))} style={{ ...inputStyle(errors.jerseySize), cursor: 'pointer' }}>
                        <option value="">Select size</option>
                        {['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {errEl('jerseySize')}
                    </div>
                  </div>
                  <div style={{ marginTop: '16px' }}>
                    <label style={labelStyle}>Team Name *</label>
                    {(() => {
                      const divisionTeams = captainTeams.filter(t => t.division === selectedLeagueId)
                      return divisionTeams.length > 0 ? (
                        <>
                          <select
                            value={form.teamPref}
                            onChange={e => { setForm(f => ({ ...f, teamPref: e.target.value })); if (errors.teamPref) setErrors(prev => { const n = { ...prev }; delete n.teamPref; return n }) }}
                            style={{ ...inputStyle(errors.teamPref), cursor: 'pointer' }}
                          >
                            <option value="">Select your team</option>
                            {divisionTeams.map(t => (
                              <option key={t.id} value={t.teamName}>{t.teamName}</option>
                            ))}
                          </select>
                          {errEl('teamPref')}
                        </>
                      ) : (
                        <div style={{ backgroundColor: '#111', border: `1px solid ${errors.teamPref ? '#e74c3c' : '#2a2a2a'}`, borderRadius: '8px', padding: '11px 14px', color: '#555', fontSize: '14px' }}>
                          No teams registered for this division yet.{' '}
                          <a href="/team-signup" style={{ color: '#4A9FE3', textDecoration: 'none' }}>Captain must sign up first →</a>
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* Waiver */}
                <div style={{ backgroundColor: '#1a1a1a', border: `1px solid ${errors.waiver ? '#e74c3c' : '#2a2a2a'}`, borderRadius: '14px', padding: '28px', marginBottom: '24px' }}>
                  <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '17px', marginBottom: '4px' }}>
                    Liability Waiver, Dress Code &amp; League Rules
                  </h3>
                  <p style={{ color: '#555', fontSize: '12px', marginBottom: '20px' }}>Please read the full agreement below before registering.</p>
                  <div style={{ backgroundColor: '#111', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '20px', maxHeight: '260px', overflowY: 'auto', marginBottom: '20px', lineHeight: 1.8 }}>
                    <p style={{ color: '#aaa', fontSize: '13px', marginBottom: '14px' }}>I agree that neither my team nor I will make a claim against ICI.</p>
                    <p style={{ color: '#ccc', fontSize: '12px', fontWeight: 700, marginBottom: '14px', letterSpacing: '0.02em' }}>
                      SPORTS INVOLVE PHYSICAL CONTACT BETWEEN PLAYERS, THAT SERIOUS ACCIDENTS OCCASIONALLY OCCUR DURING SUCH SPORTING ACTIVITIES, AND THAT PARTICIPANTS IN SUCH SPORTING ACTIVITIES OCCASIONALLY SUSTAIN SERIOUS PERSONAL INJURIES (INCLUDING DEATH) AND/OR PROPERTY DAMAGE, AS A CONSEQUENCE THEREOF.
                    </p>
                    <p style={{ color: '#ccc', fontSize: '12px', fontWeight: 700, marginBottom: '14px', letterSpacing: '0.02em' }}>
                      KNOWING THE RISKS OF PARTICIPATION, NEVERTHELESS, I HEREBY AGREE THAT MY TEAM AND I ASSUME THOSE RISKS AND RELEASE AND HOLD ICI &amp; IMBA HARMLESS.
                    </p>
                    <p style={{ color: '#aaa', fontSize: '13px', marginBottom: '14px' }}>I attest that my team is physically fit and has no known medical conditions which prohibit participation in this sport.</p>
                    <p style={{ color: '#ccc', fontSize: '12px', fontWeight: 700, marginBottom: '14px', letterSpacing: '0.02em' }}>
                      I HAVE CAREFULLY READ THIS AGREEMENT AND FULLY UNDERSTAND ITS CONTENTS. I AM AWARE THAT THIS IS A RELEASE OF LIABILITY FOR MYSELF AND MY TEAM AND A CONTRACT BETWEEN MYSELF, MY TEAM AND THE ORGANIZERS. I HAVE SIGNED IT OF MY OWN FREE WILL.
                    </p>
                    <p style={{ color: '#aaa', fontSize: '13px' }}>I also agree that league organizers may share my team&apos;s photograph or video with community members.</p>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                    <div style={{ position: 'relative', flexShrink: 0, marginTop: '1px' }}>
                      <input type="checkbox" checked={waiverChecked} onChange={e => { setWaiverChecked(e.target.checked); if (e.target.checked) setErrors(prev => { const n = { ...prev }; delete n.waiver; return n }) }} style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer', margin: 0 }} />
                      <div style={{ width: '20px', height: '20px', borderRadius: '5px', border: `2px solid ${waiverChecked ? '#4A9FE3' : errors.waiver ? '#e74c3c' : '#444'}`, backgroundColor: waiverChecked ? '#4A9FE3' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', pointerEvents: 'none' }}>
                        {waiverChecked && <svg width="12" height="9" viewBox="0 0 12 9" fill="none"><path d="M1 4L4.5 7.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                    </div>
                    <span style={{ color: waiverChecked ? '#fff' : '#888', fontSize: '14px', lineHeight: 1.5, transition: 'color 0.15s' }}>
                      I have read and agree to the Liability Waiver, Dress Code, and League Rules above. I understand this is a binding agreement.
                    </span>
                  </label>
                  {errors.waiver && <div style={{ color: '#e74c3c', fontSize: '12px', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}><span>⚠</span> {errors.waiver}</div>}
                </div>

                {/* Discount Code */}
                <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '14px', padding: '20px', marginBottom: '16px' }}>
                  <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '15px', marginBottom: '12px' }}>Discount Code</h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={discountInput}
                      onChange={e => { setDiscountInput(e.target.value.toUpperCase()); setDiscountState(null); setFinalAmount(8000) }}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), applyDiscount())}
                      placeholder="Enter code"
                      style={{ ...inputStyle(), flex: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    />
                    <button
                      type="button"
                      onClick={applyDiscount}
                      disabled={!discountInput.trim() || discountState === 'checking'}
                      style={{ backgroundColor: '#2a2a2a', color: '#fff', fontWeight: 700, fontSize: '14px', padding: '11px 18px', borderRadius: '8px', border: '1px solid #444', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      {discountState === 'checking' ? '...' : 'Apply'}
                    </button>
                  </div>
                  {discountState && discountState !== 'checking' && (
                    discountState.valid ? (
                      <div style={{ marginTop: '10px', color: '#27AE60', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        ✓ {discountState.percentOff === 100 ? 'Free registration — $0.00' : `${discountState.percentOff}% off — $${(finalAmount / 100).toFixed(2)}`}
                      </div>
                    ) : (
                      <div style={{ marginTop: '10px', color: '#e74c3c', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        ✗ {discountState.error}
                      </div>
                    )
                  )}
                </div>

                <button type="submit" disabled={loading} style={{ width: '100%', backgroundColor: loading ? '#2a2a2a' : '#4A9FE3', color: '#fff', fontWeight: 800, fontSize: '17px', padding: '16px', borderRadius: '10px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background-color 0.2s' }}>
                  {loading
                    ? (finalAmount === 0 ? 'Completing registration...' : 'Setting up payment...')
                    : finalAmount === 0 ? 'Complete Registration (Free) →' : `Continue to Payment — $${(finalAmount / 100).toFixed(0)} →`}
                </button>
                </>)}
              </form>
            )}
          </div>

          {/* Sidebar */}
          <div>
            <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '14px', padding: '24px', marginBottom: '16px', position: 'sticky', top: '80px' }}>
              <h3 style={{ color: '#4A9FE3', fontWeight: 700, fontSize: '13px', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '18px' }}>Season Details</h3>
              {[
                { label: 'Division', value: selectedLeague ? selectedLeague.label : '—' },
                { label: 'Location', value: 'Irving Masjid Gym' },
                { label: 'Game Days', value: 'Saturdays' },
                { label: 'Fee', value: '$80 / player' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #222' }}>
                  <span style={{ color: '#555', fontSize: '13px' }}>{item.label}</span>
                  <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>{item.value}</span>
                </div>
              ))}
            </div>
            <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderLeft: '3px solid #F5A623', borderRadius: '10px', padding: '18px' }}>
              <div style={{ color: '#F5A623', fontWeight: 700, fontSize: '12px', marginBottom: '10px', letterSpacing: '0.08em' }}>
                {selectedLeague ? `${selectedLeague.label} — NOTES` : 'NOTES'}
              </div>
              <ul style={{ color: '#666', fontSize: '13px', lineHeight: '2', paddingLeft: '16px', margin: 0 }}>
                {selectedLeague ? (
                  <>
                    {selectedLeague.notes.map((note, i) => <li key={i}>{note}</li>)}
                    <li>Payment required to confirm your spot</li>
                    <li>No refunds after registration</li>
                  </>
                ) : (
                  <>
                    <li>Select a division to see specific rules</li>
                    <li>Payment required to confirm your spot</li>
                    <li>No refunds after registration</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
