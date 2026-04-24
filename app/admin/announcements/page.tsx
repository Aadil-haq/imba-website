'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'

interface Announcement {
  id: string
  title: string
  body: string
  league: string
  createdAt: string
}

const LEAGUES = ['All', 'Rec League', 'Comp League', '35+ League']

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [form, setForm] = useState({ title: '', body: '', league: 'All' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = () => {
    fetch('/api/admin/announcements')
      .then(r => r.json())
      .then(data => { setAnnouncements(data); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  const openNew = () => {
    setEditing(null)
    setForm({ title: '', body: '', league: 'All' })
    setShowForm(true)
  }

  const openEdit = (a: Announcement) => {
    setEditing(a)
    setForm({ title: a.title, body: a.body, league: a.league })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      setMsg('Title and body are required.')
      return
    }
    setSaving(true)
    setMsg('')
    try {
      const method = editing ? 'PATCH' : 'POST'
      const payload = editing ? { id: editing.id, ...form } : form
      const res = await fetch('/api/admin/announcements', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to save')
      setShowForm(false)
      load()
      setMsg(editing ? 'Announcement updated.' : 'Announcement posted.')
    } catch {
      setMsg('Error saving announcement.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this announcement?')) return
    await fetch(`/api/admin/announcements?id=${id}`, { method: 'DELETE' })
    load()
  }

  const inputStyle = {
    width: '100%',
    backgroundColor: '#111',
    color: '#fff',
    border: '1px solid #2a2a2a',
    borderRadius: '6px',
    padding: '10px 14px',
    fontSize: '15px',
    outline: 'none',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
  }

  return (
    <AdminLayout>
      <div style={{ padding: '32px', maxWidth: '800px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: '26px', fontWeight: 900 }}>Announcements</h1>
            <p style={{ color: '#555', fontSize: '13px', marginTop: '4px' }}>Post updates visible on the public site</p>
          </div>
          <button
            onClick={openNew}
            style={{ backgroundColor: '#4A9FE3', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
          >
            + New Announcement
          </button>
        </div>

        {msg && (
          <div style={{ backgroundColor: '#1a3a5c', border: '1px solid #4A9FE3', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: '#4A9FE3', fontSize: '14px' }}>
            {msg}
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '24px', marginBottom: '28px' }}>
            <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>
              {editing ? 'Edit Announcement' : 'New Announcement'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ color: '#aaa', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>TITLE</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Season Starts May 1st"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ color: '#aaa', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>LEAGUE</label>
                <select
                  value={form.league}
                  onChange={e => setForm(f => ({ ...f, league: e.target.value }))}
                  style={inputStyle}
                >
                  {LEAGUES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: '#aaa', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>MESSAGE</label>
                <textarea
                  value={form.body}
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  rows={5}
                  placeholder="Write your announcement here..."
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{ backgroundColor: '#4A9FE3', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 24px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? 'Saving...' : editing ? 'Update' : 'Post'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  style={{ backgroundColor: '#2a2a2a', color: '#aaa', border: 'none', borderRadius: '8px', padding: '10px 24px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div style={{ color: '#555', textAlign: 'center', padding: '40px' }}>Loading...</div>
        ) : announcements.length === 0 ? (
          <div style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '48px', textAlign: 'center', color: '#555' }}>
            No announcements yet. Click "+ New Announcement" to post one.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {announcements.map(a => (
              <div key={a.id} style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>{a.title}</span>
                      <span style={{
                        backgroundColor: a.league === 'All' ? '#1a3a5c' : '#1a3a2a',
                        color: a.league === 'All' ? '#4A9FE3' : '#27AE60',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}>{a.league}</span>
                    </div>
                    <p style={{ color: '#888', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>{a.body}</p>
                    <div style={{ color: '#444', fontSize: '11px', marginTop: '10px' }}>
                      {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button
                      onClick={() => openEdit(a)}
                      style={{ backgroundColor: '#2a2a2a', color: '#4A9FE3', border: '1px solid #333', borderRadius: '6px', padding: '6px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(a.id)}
                      style={{ backgroundColor: '#2a0000', color: '#e74c3c', border: '1px solid #3a0000', borderRadius: '6px', padding: '6px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
