'use client'

import AdminLayout from '@/components/admin/AdminLayout'
import { useState, useEffect } from 'react'

export default function StripeAdminPage() {
  const [status, setStatus] = useState<'loading' | 'configured' | 'not_configured'>('loading')

  useEffect(() => {
    fetch('/api/stripe/status')
      .then(r => r.json())
      .then(d => setStatus(d.configured ? 'configured' : 'not_configured'))
      .catch(() => setStatus('not_configured'))
  }, [])

  const card = (title: string, children: React.ReactNode) => (
    <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
      <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '16px', marginBottom: '16px' }}>{title}</h3>
      {children}
    </div>
  )

  const step = (num: number, text: string, sub?: string) => (
    <div style={{ display: 'flex', gap: '14px', marginBottom: '16px', alignItems: 'flex-start' }}>
      <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#4A9FE3', color: '#fff', fontWeight: 800, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
        {num}
      </div>
      <div>
        <div style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>{text}</div>
        {sub && <div style={{ color: '#555', fontSize: '13px', marginTop: '3px', lineHeight: 1.5 }}>{sub}</div>}
      </div>
    </div>
  )

  const code = (text: string) => (
    <div style={{ backgroundColor: '#0d0d0d', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '12px 16px', fontFamily: 'monospace', fontSize: '13px', color: '#4A9FE3', marginTop: '8px', overflowX: 'auto', whiteSpace: 'pre' }}>
      {text}
    </div>
  )

  return (
    <AdminLayout>
      <div style={{ padding: '32px', maxWidth: '740px' }}>
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ color: '#fff', fontSize: '26px', fontWeight: 900 }}>Stripe Payment Setup</h1>
          <p style={{ color: '#555', fontSize: '14px', marginTop: '6px' }}>Accept credit card, debit card, Apple Pay and Google Pay online</p>
        </div>

        {/* Status Banner */}
        <div style={{
          backgroundColor: status === 'configured' ? '#1a4731' : '#3a2a00',
          border: `1px solid ${status === 'configured' ? '#27AE60' : '#F5A623'}`,
          borderRadius: '10px',
          padding: '16px 20px',
          marginBottom: '28px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span style={{ fontSize: '24px' }}>{status === 'configured' ? '✅' : status === 'loading' ? '⏳' : '⚠️'}</span>
          <div>
            <div style={{ color: status === 'configured' ? '#27AE60' : '#F5A623', fontWeight: 700, fontSize: '15px' }}>
              {status === 'loading' ? 'Checking Stripe status...' : status === 'configured' ? 'Stripe is connected and ready' : 'Stripe is not yet configured'}
            </div>
            <div style={{ color: '#888', fontSize: '13px', marginTop: '2px' }}>
              {status === 'configured'
                ? 'Players can pay online. Payments auto-mark as paid via webhook.'
                : 'Follow the steps below to connect your Stripe account.'}
            </div>
          </div>
        </div>

        {card('How it works', (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              {[
                { icon: '📝', title: 'Player registers', desc: 'Fills out form on your site' },
                { icon: '💳', title: 'Stripe checkout', desc: 'Pays securely via credit card, Apple Pay, etc.' },
                { icon: '✅', title: 'Auto-confirmed', desc: 'Registration marked paid automatically' },
              ].map(item => (
                <div key={item.title} style={{ backgroundColor: '#111', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>{item.icon}</div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>{item.title}</div>
                  <div style={{ color: '#555', fontSize: '12px' }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {card('Setup instructions', (
          <div>
            {step(1, 'Create a free Stripe account', 'Go to stripe.com and sign up. It\'s free — Stripe takes a small fee per transaction (2.9% + 30¢).')}
            {step(2, 'Get your API keys',
              'In your Stripe dashboard → Developers → API keys. Copy your Secret key and Publishable key.')}
            {step(3, 'Open the .env file in your project',
              'Edit /Users/aadilhaq/imba-website/.env and replace the placeholder values:')}
            {code(`STRIPE_SECRET_KEY=sk_live_your_real_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_real_key_here
STRIPE_PUBLISHABLE_KEY=pk_live_your_real_key_here`)}

            {step(4, 'Set up the webhook',
              'In Stripe dashboard → Developers → Webhooks → Add endpoint:\n• URL: https://your-domain.com/api/stripe/webhook\n• Event: checkout.session.completed\n\nCopy the webhook signing secret and add it:')}
            {code(`STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret`)}

            {step(5, 'Restart the server', 'Stop and restart `npm run dev` (or redeploy if on Vercel) to load the new env variables.')}

            <div style={{ backgroundColor: '#1a3a5c', border: '1px solid #4A9FE3', borderRadius: '8px', padding: '14px 16px', marginTop: '16px' }}>
              <div style={{ color: '#4A9FE3', fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>
                💡 Testing first?
              </div>
              <div style={{ color: '#888', fontSize: '13px', lineHeight: 1.6 }}>
                Use your <strong style={{ color: '#ccc' }}>test mode</strong> keys first (starts with sk_test_ and pk_test_).
                Use card number <strong style={{ color: '#ccc' }}>4242 4242 4242 4242</strong>, any future expiry, any CVC to test payments without real money.
              </div>
            </div>
          </div>
        ))}

        {card('Registration fee', (
          <div>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '12px' }}>
              Currently set to <strong style={{ color: '#fff' }}>$80.00</strong> per player. To change the amount, edit <code style={{ color: '#4A9FE3', backgroundColor: '#111', padding: '2px 6px', borderRadius: '3px', fontSize: '12px' }}>.env</code>:
            </p>
            {code('REGISTRATION_FEE=8000   # in cents — 8000 = $80.00')}
            <p style={{ color: '#555', fontSize: '13px', marginTop: '12px' }}>Also update the display text on the registration page and in the checkout session in <code style={{ color: '#4A9FE3', backgroundColor: '#111', padding: '2px 6px', borderRadius: '3px', fontSize: '12px' }}>/app/api/stripe/checkout/route.ts</code>.</p>
          </div>
        ))}

        {card('Manual payments', (
          <div>
            <p style={{ color: '#888', fontSize: '14px', lineHeight: 1.7 }}>
              If someone pays in cash or via e-transfer, go to <strong style={{ color: '#fff' }}>Registrations</strong> in the sidebar and click <span style={{ backgroundColor: '#1a4731', color: '#27AE60', padding: '2px 8px', borderRadius: '3px', fontSize: '12px', fontWeight: 700 }}>Mark Paid</span> on their record once you&apos;ve confirmed payment. Registrations are always <span style={{ backgroundColor: '#3a2a00', color: '#F5A623', padding: '2px 8px', borderRadius: '3px', fontSize: '12px', fontWeight: 700 }}>PENDING</span> by default.
            </p>
          </div>
        ))}
      </div>
    </AdminLayout>
  )
}
