'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login failed')
      } else {
        router.push('/admin')
        router.refresh()
      }
    } catch {
      setError('Network error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ backgroundColor: '#111111', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '16px', padding: '40px', maxWidth: '400px', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ backgroundColor: '#4A9FE3', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '56px', height: '56px', borderRadius: '12px', marginBottom: '16px', fontSize: '24px' }}>
            🔒
          </div>
          <h1 style={{ color: '#ffffff', fontSize: '24px', fontWeight: 800 }}>Admin Login</h1>
          <p style={{ color: '#666', fontSize: '13px', marginTop: '4px' }}>IMBA Management Dashboard</p>
        </div>

        {error && (
          <div style={{ backgroundColor: '#4a1919', border: '1px solid #e74c3c', borderRadius: '6px', padding: '12px', marginBottom: '20px', color: '#e74c3c', fontSize: '14px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ color: '#cccccc', fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'block' }}>Username</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              style={{ width: '100%', backgroundColor: '#111', color: '#fff', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '10px 14px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
              placeholder="admin"
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ color: '#cccccc', fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'block' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', backgroundColor: '#111', color: '#fff', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '10px 14px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', backgroundColor: loading ? '#2a2a2a' : '#4A9FE3', color: '#fff',
              fontWeight: 700, fontSize: '15px', padding: '12px', borderRadius: '8px',
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}
