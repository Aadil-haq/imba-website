import Link from 'next/link'

export default function RegisterSuccessPage() {
  return (
    <div style={{ backgroundColor: '#111', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '16px', padding: '48px', maxWidth: '520px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏀</div>
        <h2 style={{ color: '#27AE60', fontSize: '28px', fontWeight: 900, marginBottom: '12px' }}>Payment Successful!</h2>
        <p style={{ color: '#888', fontSize: '15px', marginBottom: '24px', lineHeight: '1.6' }}>
          Your registration and payment for IMBA Spring 2025 have been confirmed. You will receive a confirmation email shortly.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" style={{ backgroundColor: '#4A9FE3', color: '#fff', fontWeight: 700, fontSize: '14px', padding: '10px 24px', borderRadius: '6px', textDecoration: 'none' }}>
            Back to Home
          </Link>
          <Link href="/schedule" style={{ backgroundColor: '#1a1a1a', color: '#ccc', fontWeight: 600, fontSize: '14px', padding: '10px 24px', borderRadius: '6px', textDecoration: 'none', border: '1px solid #2a2a2a' }}>
            View Schedule
          </Link>
        </div>
      </div>
    </div>
  )
}
