'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'

interface Registration {
  id: string; firstName: string; lastName: string; email: string; phone: string
  age: number; position: string; league: string; teamPref: string | null
  paymentMethod: string; paymentStatus: string; amount: number; season: string; createdAt: string
  jerseyNumber: string | null; jerseySize: string | null; discountCode: string | null
}

interface Captain {
  id: string; teamName: string; division: string; league?: string; active?: boolean
  captainName: string | null; captainEmail: string | null; captainPhone: string | null
  rosterCount?: number; createdAt: string
}

export default function AdminRegistrationsPage() {
  const [regs, setRegs] = useState<Registration[]>([])
  const [captains, setCaptains] = useState<Captain[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState<'success' | 'error'>('success')
  const [filter, setFilter] = useState('paid')
  const [sectionFilter, setSectionFilter] = useState('all')
  const [view, setView] = useState<'registrations' | 'jerseys' | 'captains'>('registrations')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [rerostering, setRerostering] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [refundingId, setRefundingId] = useState<string | null>(null)
  const [syncingRefunds, setSyncingRefunds] = useState(false)

  const load = async () => {
    const data = await fetch('/api/admin/registrations').then(r => r.json())
    setRegs(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  const loadCaptains = async () => {
    const data = await fetch('/api/admin/captains', { headers: { Authorization: 'Bearer imba-admin-2025' } }).then(r => r.json())
    setCaptains(Array.isArray(data) ? data : [])
  }

  useEffect(() => { load(); loadCaptains() }, [])

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

  const markRefunded = async (id: string, name: string) => {
    if (!confirm(`Mark ${name} as REFUNDED? This will remove them from their team roster.`)) return
    setRefundingId(id)
    const res = await fetch('/api/admin/registrations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, paymentStatus: 'refunded' }),
    })
    if (res.ok) { showMsg(`✓ Refunded — ${name} removed from roster`); load() }
    else showMsg('Failed to process refund', 'error')
    setRefundingId(null)
  }

  const deleteReg = async (id: string, name: string) => {
    if (!confirm(`Remove registration for ${name}? This cannot be undone.`)) return
    setDeletingId(id)
    const res = await fetch(`/api/admin/registrations?id=${id}`, { method: 'DELETE' })
    if (res.ok) { showMsg('Registration removed'); load() }
    else showMsg('Failed to remove', 'error')
    setDeletingId(null)
  }

  const syncFromStripe = async () => {
    setSyncing(true)
    const res = await fetch('/api/admin/stripe-backfill', {
      method: 'POST',
      headers: { Authorization: 'Bearer imba-admin-2025' },
    })
    const data = await res.json()
    setSyncing(false)
    if (data.ok) {
      showMsg(`✓ Synced — ${data.updated} records updated from Stripe`)
      load()
    } else {
      showMsg(data.error || 'Sync failed', 'error')
    }
  }

  const syncRefundsFromStripe = async () => {
    setSyncingRefunds(true)
    const res = await fetch('/api/admin/stripe-sync-refunds', {
      method: 'POST',
      headers: { Authorization: 'Bearer imba-admin-2025' },
    })
    const data = await res.json()
    setSyncingRefunds(false)
    if (data.ok) {
      showMsg(
        data.refunded > 0
          ? `✓ Found ${data.refunded} refund${data.refunded !== 1 ? 's' : ''} — roster updated`
          : `✓ No new refunds found (checked ${data.checked} registrations)`
      )
      load()
    } else {
      showMsg(data.error || 'Sync failed', 'error')
    }
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
    const paid = sectionScoped.filter(r => r.paymentStatus === 'paid')
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
    const sectionSuffix = sectionFilter === 'all' ? '' : `-${sectionFilter.split('||')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
    a.href = url; a.download = `imba-jerseys${sectionSuffix}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  // Full price varies by league — 35+ Draft is $115, older Rec/Comp league registrations were $80
  const fullPriceFor = (league: string) => league?.includes('35+') ? 11500 : 8000

  // Section = league + season combined (e.g. "35+ Draft · Summer 2026", "D2 Comp Division · Summer 2026") —
  // season alone isn't specific enough since multiple leagues share the same season label.
  const sectionKey = (r: Registration) => `${r.league}||${r.season}`
  const sectionLabel = (r: Registration) => `${r.league} · ${r.season}`
  const sectionCounts = new Map<string, { label: string; count: number }>()
  for (const r of regs) {
    const key = sectionKey(r)
    const existing = sectionCounts.get(key)
    if (existing) existing.count++
    else sectionCounts.set(key, { label: sectionLabel(r), count: 1 })
  }
  const sections = Array.from(sectionCounts.entries()).sort((a, b) => b[1].count - a[1].count)
  const sectionScoped = sectionFilter === 'all' ? regs : regs.filter(r => sectionKey(r) === sectionFilter)

  const discountRegs = sectionScoped.filter(r => r.discountCode != null || (r.paymentStatus === 'paid' && r.amount < fullPriceFor(r.league)))
  const refundedRegs = sectionScoped.filter(r => r.paymentStatus === 'refunded')
  const filtered = filter === 'all' ? sectionScoped
    : filter === 'discount' ? discountRegs
    : filter === 'refunded' ? refundedRegs
    : sectionScoped.filter(r => r.paymentStatus === filter)
  const paidRegs = sectionScoped.filter(r => r.paymentStatus === 'paid')
  const totalRevenue = paidRegs.reduce((sum, r) => sum + r.amount, 0)
  const totalRefunded = refundedRegs.reduce((sum, r) => sum + r.amount, 0)
  const netRevenue = totalRevenue - totalRefunded

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
              onClick={syncFromStripe}
              disabled={syncing}
              style={{ backgroundColor: syncing ? '#2a2a2a' : '#1a1a3a', color: syncing ? '#555' : '#a855f7', border: '1px solid #a855f7', borderRadius: '8px', padding: '10px 18px', fontWeight: 700, fontSize: '13px', cursor: syncing ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
            >
              {syncing ? '⏳ Syncing...' : '⚡ Sync from Stripe'}
            </button>
            <button
              onClick={syncRefundsFromStripe}
              disabled={syncingRefunds}
              style={{ backgroundColor: syncingRefunds ? '#2a2a2a' : '#2a0d0d', color: syncingRefunds ? '#555' : '#e74c3c', border: '1px solid #e74c3c', borderRadius: '8px', padding: '10px 18px', fontWeight: 700, fontSize: '13px', cursor: syncingRefunds ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
            >
              {syncingRefunds ? '⏳ Checking...' : '↩ Sync Refunds from Stripe'}
            </button>
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

        {/* Section selector */}
        {sections.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <label style={{ color: '#666', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>Section</label>
            <select
              value={sectionFilter}
              onChange={e => setSectionFilter(e.target.value)}
              style={{
                backgroundColor: '#1a1a1a', color: '#fff', border: '1px solid #2a2a2a',
                borderRadius: '6px', padding: '8px 12px', fontSize: '14px', fontWeight: 700,
                outline: 'none', cursor: 'pointer', minWidth: '260px',
              }}
            >
              <option value="all">All Sections ({regs.length})</option>
              {sections.map(([key, { label, count }]) => (
                <option key={key} value={key}>{label} ({count})</option>
              ))}
            </select>
          </div>
        )}

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
            { label: 'Total', value: sectionScoped.length, color: '#888' },
            { label: 'Paid', value: paidRegs.length, color: '#27AE60' },
            { label: 'Pending', value: sectionScoped.filter(r => r.paymentStatus === 'pending').length, color: '#F5A623' },
            { label: 'Refunded', value: refundedRegs.length, color: '#e74c3c', sub: totalRefunded > 0 ? `-$${(totalRefunded / 100).toFixed(2)}` : undefined },
            { label: 'Net Revenue', value: `$${(netRevenue / 100).toFixed(2)}`, color: '#4A9FE3' },
          ].map(card => (
            <div key={card.label} style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '20px' }}>
              <div style={{ color: card.color, fontSize: '24px', fontWeight: 900 }}>{card.value}</div>
              <div style={{ color: '#555', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginTop: '4px' }}>{card.label}</div>
              {(card as any).sub && <div style={{ color: '#e74c3c', fontSize: '11px', marginTop: '4px' }}>{(card as any).sub}</div>}
            </div>
          ))}
        </div>

        {/* View tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid #2a2a2a', paddingBottom: '0' }}>
          {(['registrations', 'jerseys', 'captains'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '10px 20px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '13px',
              backgroundColor: 'transparent',
              color: view === v ? '#4A9FE3' : '#555',
              borderBottom: view === v ? '2px solid #4A9FE3' : '2px solid transparent',
            }}>
              {v === 'registrations' ? 'All Registrations' : v === 'jerseys' ? '👕 Jersey List' : `🧢 Team Captains (${captains.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#555', padding: '48px' }}>Loading...</div>
        ) : view === 'captains' ? (
          /* ── Team Captains View ── */
          <div>
            <p style={{ color: '#555', fontSize: '13px', marginBottom: '16px' }}>
              Everyone who has registered a team through the D1/D2 captain sign-up (imbaonline.com/team-signup), newest first.
            </p>
            <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', overflow: 'hidden', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#111', borderBottom: '2px solid #4A9FE3' }}>
                    {['Team', 'Captain', 'Phone', 'Email', 'Division', 'Signed Up'].map(h => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: '#4A9FE3', fontWeight: 700, fontSize: '12px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {captains.map((c, i) => {
                    const isD1 = c.division?.includes('D1') || c.division?.includes('Comp')
                    return (
                    <tr key={c.id} style={{ backgroundColor: i % 2 === 0 ? '#1a1a1a' : '#141414', borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>{c.teamName}</div>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#ccc', fontSize: '14px' }}>{c.captainName ?? <span style={{ color: '#444' }}>—</span>}</td>
                      <td style={{ padding: '12px 14px', color: '#ccc', fontSize: '13px' }}>{c.captainPhone ?? <span style={{ color: '#444' }}>—</span>}</td>
                      <td style={{ padding: '12px 14px', color: '#ccc', fontSize: '13px' }}>{c.captainEmail ?? <span style={{ color: '#444' }}>—</span>}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          backgroundColor: isD1 ? '#2a1a00' : '#0d1a2a',
                          color: isD1 ? '#F5A623' : '#4A9FE3',
                          padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 700,
                        }}>
                          {isD1 ? 'D1 Comp' : 'D2'}
                        </span>
                        <div style={{ color: '#555', fontSize: '11px', marginTop: '3px' }}>Winter 2026</div>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#555', fontSize: '12px' }}>
                        {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
              {captains.length === 0 && (
                <div style={{ textAlign: 'center', color: '#555', padding: '32px' }}>No captains have signed up yet</div>
              )}
            </div>
          </div>
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

            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {[
                { key: 'paid', label: '✅ Paid', count: sectionScoped.filter(r => r.paymentStatus === 'paid').length, activeColor: '#27AE60' },
                { key: 'pending', label: '⏳ Pending', count: sectionScoped.filter(r => r.paymentStatus === 'pending').length, activeColor: '#F5A623' },
                { key: 'discount', label: '🏷 Discount', count: discountRegs.length, activeColor: '#a855f7' },
                { key: 'refunded', label: '🔴 Refunded', count: refundedRegs.length, activeColor: '#e74c3c' },
                { key: 'all', label: 'All', count: sectionScoped.length, activeColor: '#4A9FE3' },
              ].map(({ key, label, count, activeColor }) => (
                <button key={key} onClick={() => setFilter(key)} style={{
                  padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 700, fontSize: '13px',
                  backgroundColor: filter === key ? activeColor : '#1a1a1a',
                  color: filter === key ? '#fff' : '#666',
                  border: `1px solid ${filter === key ? activeColor : '#2a2a2a'}`,
                  transition: 'all 0.15s',
                }}>
                  {label}
                  <span style={{ marginLeft: '6px', fontSize: '11px', opacity: 0.8 }}>({count})</span>
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
                          backgroundColor: reg.league?.includes('Comp') ? '#2a1a00' : reg.league?.includes('Draft') ? '#1a1a3a' : '#0d1a0d',
                          color: reg.league?.includes('Comp') ? '#F5A623' : reg.league?.includes('Draft') ? '#8B5CF6' : '#27AE60',
                          padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, display: 'inline-block',
                        }}>
                          {reg.league?.includes('Comp') ? '🏆 Comp' : reg.league?.includes('Draft') ? '🎯 Draft' : '🏀 Rec'}
                        </span>
                        {reg.teamPref && <div style={{ color: '#555', fontSize: '11px', marginTop: '4px' }}>Pref: {reg.teamPref}</div>}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>{reg.jerseyNumber ?? <span style={{ color: '#444', fontSize: '12px' }}>—</span>}</div>
                        {reg.jerseySize && <div style={{ color: '#4A9FE3', fontSize: '11px', fontWeight: 700 }}>{reg.jerseySize}</div>}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ color: reg.amount < fullPriceFor(reg.league) ? '#27AE60' : '#ccc', fontSize: '14px', fontWeight: 700 }}>
                            ${(reg.amount / 100).toFixed(2)}
                          </span>
                          {reg.amount === 0 && (
                            <span style={{ backgroundColor: '#1a4731', color: '#27AE60', border: '1px solid #27AE60', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', fontWeight: 800, letterSpacing: '0.05em' }}>FREE</span>
                          )}
                          {reg.amount > 0 && reg.amount < fullPriceFor(reg.league) && (
                            <span style={{ backgroundColor: '#2a1500', color: '#F5A623', border: '1px solid #F5A623', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', fontWeight: 800 }}>
                              {Math.round((1 - reg.amount / fullPriceFor(reg.league)) * 100)}% OFF
                            </span>
                          )}
                        </div>
                        {(reg.discountCode || reg.amount < fullPriceFor(reg.league)) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                            <span style={{ backgroundColor: '#1e0a3c', color: '#a855f7', border: '1px solid #a855f7', borderRadius: '4px', padding: '2px 7px', fontSize: '10px', fontWeight: 800, letterSpacing: '0.04em' }}>
                              🏷 {reg.discountCode ?? 'DISCOUNT'}
                            </span>
                          </div>
                        )}
                        <div style={{ color: '#444', fontSize: '11px', marginTop: '3px' }}>{reg.paymentMethod}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 800,
                          backgroundColor: reg.paymentStatus === 'paid' ? '#0d2b1a' : reg.paymentStatus === 'refunded' ? '#2a0d0d' : '#2a1e00',
                          color: reg.paymentStatus === 'paid' ? '#2ecc71' : reg.paymentStatus === 'refunded' ? '#e74c3c' : '#F5A623',
                          border: `1px solid ${reg.paymentStatus === 'paid' ? '#2ecc71' : reg.paymentStatus === 'refunded' ? '#e74c3c' : '#F5A623'}`,
                          letterSpacing: '0.06em',
                        }}>
                          {reg.paymentStatus === 'paid'
                            ? <><span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#2ecc71', display: 'inline-block' }} />PAID</>
                            : reg.paymentStatus === 'refunded'
                            ? <><span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#e74c3c', display: 'inline-block' }} />REFUNDED</>
                            : <><span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#F5A623', display: 'inline-block' }} />PENDING</>
                          }
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
                          ) : reg.paymentStatus === 'paid' ? (
                            <>
                              <button onClick={() => markPending(reg.id)} style={{ backgroundColor: '#3a2a00', color: '#F5A623', border: '1px solid #F5A623', borderRadius: '4px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>
                                Revert
                              </button>
                              <button
                                onClick={() => markRefunded(reg.id, `${reg.firstName} ${reg.lastName}`)}
                                disabled={refundingId === reg.id}
                                style={{ backgroundColor: '#2a0d0d', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: '4px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, cursor: refundingId === reg.id ? 'not-allowed' : 'pointer', opacity: refundingId === reg.id ? 0.5 : 1 }}
                              >
                                {refundingId === reg.id ? '...' : '↩ Refund'}
                              </button>
                            </>
                          ) : (
                            <span style={{ color: '#555', fontSize: '11px', fontStyle: 'italic' }}>refunded</span>
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
