'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'

interface Settings {
  hero_tagline: string
  hero_title_line1: string
  hero_title_line2: string
  hero_subtitle: string
  hero_cta_primary: string
  hero_cta_secondary: string
  stat_teams: string
  stat_season: string
  stat_location: string
  stat_fee: string
  section_games_title: string
  section_standings_title: string
  section_scorers_title: string
  section_news_title: string
  season_label: string
  cta_subtitle: string
  cta_button_text: string
}

const FIELDS: { key: keyof Settings; label: string; hint?: string; textarea?: boolean }[] = [
  // Hero
  { key: 'hero_tagline',       label: 'Hero Tag (above title)',   hint: 'e.g. "Spring 2025 Season"' },
  { key: 'hero_title_line1',   label: 'Hero Title — Line 1',      hint: 'White text, e.g. "Irving Masjid"' },
  { key: 'hero_title_line2',   label: 'Hero Title — Line 2',      hint: 'Blue text, e.g. "Basketball Association"' },
  { key: 'hero_subtitle',      label: 'Hero Subtitle',            hint: 'Gray text under title', textarea: true },
  { key: 'hero_cta_primary',   label: 'Primary Button Text',      hint: 'e.g. "View Schedule"' },
  { key: 'hero_cta_secondary', label: 'Secondary Button Text',    hint: 'e.g. "Register Now"' },
  // Stats row
  { key: 'stat_teams',    label: 'Stat — Teams',    hint: 'e.g. "8"' },
  { key: 'stat_season',   label: 'Stat — Season',   hint: 'e.g. "Fall 2025"' },
  { key: 'stat_location', label: 'Stat — Location', hint: 'e.g. "Irving Masjid"' },
  { key: 'stat_fee',      label: 'Stat — Fee',      hint: 'e.g. "$80"' },
  // Section headings
  { key: 'section_games_title',     label: 'Section — Upcoming Games heading' },
  { key: 'section_standings_title', label: 'Section — Standings heading' },
  { key: 'section_scorers_title',   label: 'Section — Top Scorers heading' },
  { key: 'section_news_title',      label: 'Section — News/Announcements heading' },
  // CTA
  { key: 'cta_subtitle',    label: 'CTA — Subtitle text', hint: 'e.g. "Join IMBA today — limited spots available."', textarea: true },
  { key: 'cta_button_text', label: 'CTA — Button text',  hint: 'e.g. "Register Now"' },
  // Other
  { key: 'season_label', label: 'Current Season Label', hint: 'Used across the whole site' },
]

const GROUPS = [
  { title: 'Hero Section', keys: ['hero_tagline','hero_title_line1','hero_title_line2','hero_subtitle','hero_cta_primary','hero_cta_secondary'] },
  { title: 'Stats Row',    keys: ['stat_teams','stat_season','stat_location','stat_fee'] },
  { title: 'Section Headings', keys: ['section_games_title','section_standings_title','section_scorers_title','section_news_title'] },
  { title: 'CTA Section (Bottom Banner)', keys: ['cta_subtitle','cta_button_text'] },
  { title: 'Global',       keys: ['season_label'] },
]

export default function HomepageEditorPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/homepage')
      .then(r => r.json())
      .then(data => { setSettings(data); setLoading(false) })
  }, [])

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    setMsg('')
    const res = await fetch('/api/admin/homepage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    setSaving(false)
    setMsg(res.ok ? '✓ Homepage saved! Refresh the public site to see changes.' : '✗ Error saving.')
    setTimeout(() => setMsg(''), 5000)
  }

  const inputBase = {
    width: '100%',
    backgroundColor: '#111',
    color: '#fff',
    border: '1px solid #2a2a2a',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '15px',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  }

  if (loading) return (
    <AdminLayout>
      <div style={{ padding: '32px', color: '#555' }}>Loading homepage settings...</div>
    </AdminLayout>
  )

  return (
    <AdminLayout>
      <div style={{ padding: '32px', maxWidth: '780px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: '26px', fontWeight: 900 }}>Homepage Editor</h1>
            <p style={{ color: '#555', fontSize: '13px', marginTop: '4px' }}>
              Edit text that appears on the public homepage
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#4A9FE3', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}
            >
              Preview Site ↗
            </a>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                backgroundColor: saving ? '#2a2a2a' : '#4A9FE3',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 24px',
                fontWeight: 700,
                fontSize: '14px',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {msg && (
          <div style={{
            backgroundColor: msg.startsWith('✓') ? '#0a3a1a' : '#3a0a0a',
            border: `1px solid ${msg.startsWith('✓') ? '#27AE60' : '#e74c3c'}`,
            color: msg.startsWith('✓') ? '#27AE60' : '#e74c3c',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: '14px',
            fontWeight: 600,
          }}>
            {msg}
          </div>
        )}

        {/* Live preview strip */}
        {settings && (
          <div style={{
            backgroundColor: '#0d0d0d',
            border: '1px solid #2a2a2a',
            borderRadius: '12px',
            padding: '28px',
            marginBottom: '32px',
            textAlign: 'center',
          }}>
            <div style={{ color: '#4A9FE3', fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px' }}>
              {settings.hero_tagline}
            </div>
            <div style={{ color: '#fff', fontSize: '22px', fontWeight: 900, lineHeight: 1.2, marginBottom: '6px' }}>
              {settings.hero_title_line1}{' '}
              <span style={{ color: '#4A9FE3' }}>{settings.hero_title_line2}</span>
            </div>
            <div style={{ color: '#888', fontSize: '13px', marginBottom: '16px' }}>{settings.hero_subtitle}</div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '20px' }}>
              <span style={{ backgroundColor: '#4A9FE3', color: '#fff', padding: '6px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>{settings.hero_cta_primary}</span>
              <span style={{ border: '2px solid #4A9FE3', color: '#4A9FE3', padding: '6px 16px', borderRadius: '6px', fontSize: '12px', fontWeight: 700 }}>{settings.hero_cta_secondary}</span>
            </div>
            <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                { label: 'Teams', value: settings.stat_teams },
                { label: 'Season', value: settings.stat_season },
                { label: 'Location', value: settings.stat_location },
                { label: 'Fee', value: settings.stat_fee },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ color: '#4A9FE3', fontWeight: 900, fontSize: '16px' }}>{s.value}</div>
                  <div style={{ color: '#444', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ color: '#333', fontSize: '11px', marginTop: '14px' }}>↑ Live preview of your hero section</div>
          </div>
        )}

        {/* Field groups */}
        {settings && GROUPS.map(group => (
          <div key={group.title} style={{ backgroundColor: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
            <h3 style={{ color: '#fff', fontWeight: 700, fontSize: '15px', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid #222' }}>
              {group.title}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {group.keys.map(key => {
                const field = FIELDS.find(f => f.key === key)!
                const value = settings[key as keyof Settings] ?? ''
                return (
                  <div key={key}>
                    <label style={{ color: '#aaa', fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px', letterSpacing: '0.04em' }}>
                      {field.label}
                      {field.hint && <span style={{ color: '#444', fontWeight: 400, marginLeft: '8px' }}>{field.hint}</span>}
                    </label>
                    {field.textarea ? (
                      <textarea
                        value={value}
                        onChange={e => setSettings(s => s ? { ...s, [key]: e.target.value } : s)}
                        rows={2}
                        style={{ ...inputBase, resize: 'vertical', lineHeight: 1.6 }}
                      />
                    ) : (
                      <input
                        type="text"
                        value={value}
                        onChange={e => setSettings(s => s ? { ...s, [key]: e.target.value } : s)}
                        style={inputBase}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            backgroundColor: saving ? '#2a2a2a' : '#4A9FE3',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 32px',
            fontWeight: 700,
            fontSize: '15px',
            cursor: saving ? 'not-allowed' : 'pointer',
            width: '100%',
          }}
        >
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>
    </AdminLayout>
  )
}
