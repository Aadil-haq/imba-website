'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'

interface Registration {
  id: string; firstName: string; lastName: string; email: string; phone: string
  age: number; position: string; league: string; teamPref: string | null
  paymentMethod: string; paymentStatus: string; amount: number; season: string; createdAt: string
  jerseyNumber: string | null; jerseySize: string | null; discountCode: string | null
}

export default function AdminRegistrationsPage() {
  const [regs, setRegs] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'success' | 'error'>('success')
  const [filter, setFilter] = useState('all')
  const [view, setView] = useState<'registrations' | 'jerseys'>('registrations')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [rerostering, setRerostering] = useState(false)

  const load = async () => {
    const data = await fetch('/api/admin/registrations').then(r => r.json())
    setRegs(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg(text); setMsgType(type)
    setTimeout(() => setMsg(''), 3000)
  }

  const markPaid = async (id: string) => {
    const res = await fetch('/api/admin/registrations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, paymentStatus: 'paid' }),
    })
    if (res.ok) { showMsg('Marked as paid ✓'); load() }
    else showMsg('Failed to update', 'error')
  }

  const markPending = async (id: string) => {
    const res = await fetch('/api/admin/registrations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, paymentStatus: 'pending' }),
    })
    if (res.ok) { load() }
  }

  const deleteReg = async (id: string, name: string) => {
    if (!confirm(`Remove registration for ${name}? This cannot be undone.`)) return
    setDeletingId(id)
    const res = await fetch(`/api/admin/registrations?id=${id}`, { method: 'DELETE' })
    if (res.ok) { showMsg('Registration removed'); load() }
    else showMsg('Failed to remove', 'error')
    setDeletingId(null)
  }

  const reRosterAll = async () => {
    if (!confirm('This will add all paid registrants to their teams, creating any missing teams automatically. Continue?')) return
    setRerostering(true)
    const res = await fetch('/api/admin/registrations', {
      method: 'PUT',
      headers: { Authorization: 'Bearer imba-admin-2025' },
    })
    const data = await res.json()
    setRerostering(false)
    if (data.ok) {
      const rostered = data.results.filter((r: string) => r.includes('Rostered:')).length
      const already = data.results.filter((r: string) => r.includes('Already')).length
      showMsg(`✓ Done — ${rostered} players added, ${already} already rostered`)
    } else {
      showMsg('Error during re-roster', 'error')
    }
  }

  const exportJerseyCSV = () => {
    const paid = regs.filter(r => r.paymentStatus === 'paid')
    const rows = [
      ['Name', 'Team', 'Season', 'Jersey #', 'Jersey Size', 'Position'].join(','),
      ...paid.map(r => [
        `${r.firstName} ${r.lastName}`,
        r.teamPref ?? '',
        r.season,
        r.jerseyNumber ?? '',
        r.jerseySize ?? '',
        r.position,
      ].map(v => `"${v}"`).join(',')),
    ]
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'imba-jerseys.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = filter === 'all' ? regs : regs.filter(r => r.paymentStatus === filter)
  const totalRevenue = regs.filter(r => r.paymentStatus === 'paid').reduce((sum, r) => sum + r.amount, 0)
  const paidRegs = regs.filter(r => r.paymentStatus === 'paid')

  return (
    <AdminLayout>
      <div style={{ padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: '26px', fontWeight: 900 }}>Registrations</h1>
            <p style={{ color: '#555', fontSize: '14px' }}>Manage player registrations · Only mark paid after payment is confirmed</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={reRosterAll}
              disabled={rerostering}
              style={{ backgroundColor: rerostering ? '#2a2a2a' : '#1a3a1a', color: rerostering ? '#555' : '#27AE60', border: '1px solid #27AE60', borderRadius: '8px', padding: '10px 18px', fontWeight: 700, fontSize: '13px', cursor: rerostering ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
            >
              {rerostering ? '⏳ Rostering...' : '👤 Re-roster All Paid'}
            </button>
            <button
              onClick={exportJerseyCSV}
              style={{ backgroundColor: '#1a2a4a', color: '#4A9FE3', border: '1px solid #4A9FE3', borderRadius: '8px', padding: '10px 18px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              ↓ Export Jersey List (CSV)
            </button>
          </div>
        </div>

        {msg && (
          <div style={{
            backgroundColor: msgType === 'success' ? '#1a4731' : '#4a1919',
            border: `1px solid ${msgType === 'success' ? '#27AE60' : '#e74c3c'}`,
            color: msgType === 'success' ? '#27AE60' : '#e74c3c',
            padding: '10px 16px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px',
          }}>{msg}</div>
        )}

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Total', value: regs.length, color: '#888' },
            { label: 'Paid', value: paidRegs.length, color: '#27AE60' },
            { label: 'Pending', value: regs.filter(r => r.paymentStatus === 'pending').length, color: '#F5A623' },
            { label: 'Revenue', value: `$${(totalRevenue / 100).toFixed(2)}`, color: '#4A9FE3' },
          ].map(card => (
            <div key={card.label} style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '20px' }}>
              <div style={{ color: card.color, fontSize: '24px', fontWeight: 900 }}>{card.value}</div>
              <div style={{ color: '#555', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginTop: '4px' }}>{card.label}</div>
            </div>
          ))}
        </div>

        {/* View tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid #2a2a2a', paddingBottom: '0' }}>
          {(['registrations', 'jerseys'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '10px 20px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '13px',
              backgroundColor: 'transparent',
              color: view === v ? '#4A9FE3' : '#555',
              borderBottom: view === v ? '2px solid #4A9FE3' : '2px solid transparent',
            }}>
              {v === 'registrations' ? 'All Registrations' : '👕 Jersey List'}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#555', padding: '48px' }}>Loading...</div>
        ) : view === 'jerseys' ? (
          /* ── Jersey List View ── */
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <p style={{ color: '#555', fontSize: '13px' }}>
                Showing {paidRegs.length} paid registrant{paidRegs.length !== 1 ? 's' : ''} · Share this list with your jersey vendor
              </p>
              <button
                onClick={exportJerseyCSV}
                style={{ backgroundColor: '#1a2a4a', color: '#4A9FE3', border: '1px solid #4A9FE3', borderRadius: '6px', padding: '7px 14px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
              >
                ↓ Download CSV
              </button>
            </div>
            <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', overflow: 'hidden', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#111', borderBottom: '2px solid #4A9FE3' }}>
                    {['#', 'Name', 'Team', 'Season', 'Jersey #', 'Jersey Size', 'Position'].map(h => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: '#4A9FE3', fontWeight: 700, fontSize: '12px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paidRegs.map((reg, i) => (
                    <tr key={reg.id} style={{ backgroundColor: i % 2 === 0 ? '#1a1a1a' : '#141414', borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '12px 14px', color: '#444', fontSize: '13px' }}>{i + 1}</td>
                      <td style={{ padding: '12px 14px', color: '#fff', fontWeight: 600, fontSize: '14px' }}>{reg.firstName} {reg.lastName}</td>
                      <td style={{ padding: '12px 14px', color: '#4A9FE3', fontSize: '13px' }}>{reg.teamPref ?? <span style={{ color: '#444' }}>—</span>}</td>
                      <td style={{ padding: '12px 14px', color: '#888', fontSize: '12px' }}>{reg.season}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ color: '#fff', fontWeight: 900, fontSize: '20px' }}>{reg.jerseyNumber ?? <span style={{ color: '#444', fontSize: '13px' }}>—</span>}</span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {reg.jerseySize
                          ? <span style={{ backgroundColor: '#1a2a4a', color: '#4A9FE3', border: '1px solid #4A9FE3', borderRadius: '4px', padding: '3px 10px', fontSize: '12px', fontWeight: 700 }}>{reg.jerseySize}</span>
                          : <span style={{ color: '#444', fontSize: '13px' }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 14px', color: '#888', fontSize: '13px' }}>{reg.position}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {paidRegs.length === 0 && (
                <div style={{ textAlign: 'center', color: '#555', padding: '32px' }}>No paid registrations yet</div>
              )}
            </div>
          </div>
        ) : (
          /* ── Registrations View ── */
          <>
            <div style={{ backgroundColor: '#1a2a1a', border: '1px solid #27AE60', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>💡</span>
              <span style={{ color: '#27AE60', fontSize: '13px' }}>
                <strong>Payment policy:</strong> Only click &quot;Mark Paid&quot; once you have confirmed payment was received. Paid players are auto-added to their team roster.
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              {['all', 'pending', 'paid'].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                  backgroundColor: filter === f ? '#4A9FE3' : '#1a1a1a',
                  color: filter === f ? '#fff' : '#888',
                  fontWeight: 600, fontSize: '13px',
                  borderBottom: filter !== f ? '1px solid #2a2a2a' : 'none',
                }}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                  {f !== 'all' && <span style={{ marginLeft: '6px', fontSize: '11px', opacity: 0.7 }}>({regs.filter(r => r.paymentStatus === f).length})</span>}
                </button>
              ))}
            </div>

            <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', overflow: 'hidden', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#111', borderBottom: '2px solid #4A9FE3' }}>
                    {['Name', 'Contact', 'Division', 'Jersey', 'Payment', 'Status', 'Date', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: '#4A9FE3', fontWeight: 700, fontSize: '12px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((reg, i) => (
                    <tr key={reg.id} style={{ backgroundColor: i % 2 === 0 ? '#1a1a1a' : '#141414', borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>{reg.firstName} {reg.lastName}</div>
                        <div style={{ color: '#555', fontSize: '11px' }}>{reg.season} · {reg.position}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ color: '#ccc', fontSize: '13px' }}>{reg.email}</div>
                        <div style={{ color: '#555', fontSize: '12px' }}>{reg.phone}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          backgroundColor: reg.league?.includes('Comp') ? '#2a1a00' : '#0d1a0d',
                          color: reg.league?.includes('Comp') ? '#F5A623' : '#27AE60',
                          padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, display: 'inline-block',
                        }}>
                          {reg.league?.includes('Comp') ? '🏆 Comp' : '🏀 Rec'}
                        </span>
                        {reg.teamPref && <div style={{ color: '#555', fontSize: '11px', marginTop: '4px' }}>Pref: {reg.teamPref}</div>}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>{reg.jerseyNumber ?? <span style={{ color: '#444', fontSize: '12px' }}>—</span>}</div>
                        {reg.jerseySize && <div style={{ color: '#4A9FE3', fontSize: '11px', fontWeight: 700 }}>{reg.jerseySize}</div>}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: reg.amount < 8000 ? '#27AE60' : '#ccc', fontSize: '13px', fontWeight: 700 }}>
                            ${(reg.amount / 100).toFixed(2)}
                          </span>
                          {reg.amount === 0 && (
                            <span style={{ backgroundColor: '#1a4731', color: '#27AE60', border: '1px solid #27AE60', borderRadius: '3px', padding: '1px 5px', fontSize: '10px', fontWeight: 700 }}>FREE</span>
                          )}
                          {reg.amount > 0 && reg.amount < 8000 && (
                            <span style={{ backgroundColor: '#2a1a00', color: '#F5A623', border: '1px solid #F5A623', borderRadius: '3px', padding: '1px 5px', fontSize: '10px', fontWeight: 700 }}>
                              {Math.round((1 - reg.amount / 8000) * 100)}% OFF
                            </span>
                          )}
                        </div>
                        {reg.discountCode && (
                          <div style={{ color: '#F5A623', fontSize: '10px', fontWeight: 700, marginTop: '2px' }}>🏷 {reg.discountCode}</div>
                        )}
                        <div style={{ color: '#555', fontSize: '11px' }}>{reg.paymentMethod}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                          backgroundColor: reg.paymentStatus === 'paid' ? '#1a4731' : '#3a2a00',
                          color: reg.paymentStatus === 'paid' ? '#27AE60' : '#F5A623',
                        }}>
                          {reg.paymentStatus === 'paid' ? '✓ PAID' : '⏳ PENDING'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#555', fontSize: '12px' }}>
                        {new Date(reg.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {reg.paymentStatus === 'pending' ? (
                            <button onClick={() => markPaid(reg.id)} style={{ backgroundColor: '#1a4731', color: '#27AE60', border: '1px solid #27AE60', borderRadius: '4px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                              Mark Paid
                            </button>
                          ) : (
                            <button onClick={() => markPending(reg.id)} style={{ backgroundColor: '#3a2a00', color: '#F5A623', border: '1px solid #F5A623', borderRadius: '4px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                              Revert
                            </button>
                          )}
                          <button
                            onClick={() => deleteReg(reg.id, `${reg.firstName} ${reg.lastName}`)}
                            disabled={deletingId === reg.id}
                            style={{ backgroundColor: '#4a1919', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: '4px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', opacity: deletingId === reg.id ? 0.5 : 1 }}
                          >
                            {deletingId === reg.id ? '...' : 'Remove'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div style={{ textAlign: 'center', color: '#555', padding: '32px' }}>No registrations found</div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
