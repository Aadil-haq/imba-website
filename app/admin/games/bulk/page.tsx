'use client'

import { useState, useEffect } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import Link from 'next/link'

interface Team { id: string; name: string; color: string; league: string }
interface SeasonRow { season: string; league: string; active: boolean }

interface ImportRow {
  _id: string   // local React key only
  week: string
  homeTeamId: string
  awayTeamId: string
  date: string
  time: string
  location: string
}

const inputS: React.CSSProperties = {
  backgroundColor: '#111', color: '#fff', border: '1px solid #2a2a2a',
  borderRadius: '6px', padding: '6px 10px', fontSize: '13px', outline: 'none',
  width: '100%', boxSizing: 'border-box',
}
const selectS: React.CSSProperties = { ...inputS, cursor: 'pointer' }
const labelS: React.CSSProperties = { color: '#999', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px' }

const WEEK_OPTIONS = [
  ...[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16].map(w => ({ value: String(w), label: `Week ${w}` })),
  { value: '96', label: 'Round 1 (Playoffs)' },
  { value: '97', label: 'Quarterfinals' },
  { value: '98', label: 'Semi Finals' },
  { value: '99', label: 'Finals' },
]

let rowCounter = 0
function newRow(defaults: Partial<ImportRow> = {}): ImportRow {
  return {
    _id: `row-${++rowCounter}`,
    week: '1',
    homeTeamId: '',
    awayTeamId: '',
    date: '',
    time: '7:00 PM',
    location: 'Irving Masjid Gym',
    ...defaults,
  }
}

export default function BulkImportPage() {
  const [allSeasons, setAllSeasons] = useState<SeasonRow[]>([])
  const [allTeams, setAllTeams] = useState<Team[]>([])
  const [seasonTeams, setSeasonTeams] = useState<Team[]>([])
  const [selectedSeason, setSelectedSeason] = useState('')
  const [selectedLeague, setSelectedLeague] = useState('Comp')
  const [rows, setRows] = useState<ImportRow[]>([newRow(), newRow(), newRow()])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null)
  const [globalError, setGlobalError] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/seasons').then(r => r.json()),
      fetch('/api/teams').then(r => r.json()),
    ]).then(([seasons, teams]) => {
      const s: SeasonRow[] = Array.isArray(seasons) ? seasons : []
      const t: Team[] = Array.isArray(teams) ? teams : []
      setAllSeasons(s)
      setAllTeams(t)
      const active = s.find(x => x.active) ?? s[0]
      if (active) {
        setSelectedSeason(active.season)
        setSelectedLeague(active.league)
      }
    })
  }, [])

  // Load season-specific teams
  useEffect(() => {
    if (!selectedSeason) return
    fetch(`/api/admin/season-teams?season=${encodeURIComponent(selectedSeason)}`)
      .then(r => r.json())
      .then(data => {
        const active: Team[] = Array.isArray(data.active) ? data.active : []
        setSeasonTeams(active.length > 0 ? active : allTeams)
      })
      .catch(() => setSeasonTeams(allTeams))
  }, [selectedSeason, allTeams])

  const updateRow = (id: string, field: keyof ImportRow, value: string) => {
    setRows(prev => prev.map(r => r._id === id ? { ...r, [field]: value } : r))
  }

  const addRows = (count = 1) => {
    setRows(prev => [...prev, ...Array.from({ length: count }, () => newRow())])
  }

  const removeRow = (id: string) => {
    setRows(prev => prev.filter(r => r._id !== id))
  }

  const clearAll = () => {
    setRows([newRow(), newRow(), newRow()])
    setResult(null)
    setGlobalError('')
  }

  // Fill down the date/week from the row above (convenience)
  const fillDown = (id: string, field: 'date' | 'week' | 'time' | 'location') => {
    const idx = rows.findIndex(r => r._id === id)
    if (idx <= 0) return
    const val = rows[idx - 1][field]
    updateRow(id, field, val)
  }

  const filledRows = rows.filter(r => r.homeTeamId && r.awayTeamId && r.date)

  const handleImport = async () => {
    if (filledRows.length === 0) {
      setGlobalError('Fill in at least one complete row (Home Team, Away Team, Date).')
      return
    }
    setImporting(true)
    setResult(null)
    setGlobalError('')

    const payload = filledRows.map(r => ({
      homeTeamId: r.homeTeamId,
      awayTeamId: r.awayTeamId,
      date: r.date,
      time: r.time || '7:00 PM',
      location: r.location || 'Irving Masjid Gym',
      week: parseInt(r.week) || 1,
      season: selectedSeason,
      league: selectedLeague,
    }))

    try {
      const res = await fetch('/api/admin/games/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer imba-admin-2025',
        },
        body: JSON.stringify({ games: payload }),
      })
      const data = await res.json()
      if (!res.ok) {
        setGlobalError(data.error || 'Import failed')
      } else {
        setResult(data)
        if (data.created > 0) {
          // Clear successfully imported rows, keep empty ones
          setRows([newRow(), newRow(), newRow()])
        }
      }
    } catch {
      setGlobalError('Network error — please try again')
    } finally {
      setImporting(false)
    }
  }

  const teamsForPicker = seasonTeams.length > 0 ? seasonTeams : allTeams
  const sortedTeams = [...teamsForPicker].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <AdminLayout>
      <div style={{ padding: '32px', maxWidth: '1200px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <Link href="/admin/games" style={{ color: '#555', fontSize: '13px', textDecoration: 'none', fontWeight: 600 }}>← Games</Link>
            </div>
            <h1 style={{ color: '#fff', fontSize: '26px', fontWeight: 900, margin: 0 }}>Bulk Schedule Import</h1>
            <p style={{ color: '#555', fontSize: '14px', marginTop: '4px' }}>
              Enter the full season schedule here. No scripts needed — just fill in the table and click Import.
            </p>
          </div>
        </div>

        {/* Season + League selectors */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap', backgroundColor: '#141414', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '16px 20px', alignItems: 'flex-end' }}>
          <div style={{ minWidth: '220px' }}>
            <label style={labelS}>Season *</label>
            <select value={selectedSeason} onChange={e => setSelectedSeason(e.target.value)} style={selectS}>
              <option value="">Select season…</option>
              {allSeasons.map(s => (
                <option key={`${s.season}-${s.league}`} value={s.season}>{s.season}{s.active ? ' ●' : ''}</option>
              ))}
            </select>
          </div>
          <div style={{ minWidth: '160px' }}>
            <label style={labelS}>League *</label>
            <select value={selectedLeague} onChange={e => setSelectedLeague(e.target.value)} style={selectS}>
              {['Comp', 'Rec', '35+', 'Rec League', 'U17'].map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div style={{ color: '#555', fontSize: '12px', paddingBottom: '6px' }}>
            {sortedTeams.length} teams available for this season
          </div>
        </div>

        {/* Result banner */}
        {result && (
          <div style={{
            backgroundColor: result.created > 0 ? '#0a3a1a' : '#3a1a0a',
            border: `1px solid ${result.created > 0 ? '#27AE60' : '#F5A623'}`,
            color: result.created > 0 ? '#27AE60' : '#F5A623',
            padding: '14px 18px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px',
          }}>
            <div style={{ fontWeight: 700, marginBottom: result.errors.length > 0 ? '8px' : 0 }}>
              ✓ {result.created} game{result.created !== 1 ? 's' : ''} imported successfully
              {result.skipped > 0 && ` · ${result.skipped} row${result.skipped !== 1 ? 's' : ''} skipped`}
            </div>
            {result.errors.map((e, i) => (
              <div key={i} style={{ color: '#F5A623', fontSize: '12px' }}>{e}</div>
            ))}
          </div>
        )}

        {globalError && (
          <div style={{ backgroundColor: '#3a0a0a', border: '1px solid #e74c3c', color: '#e74c3c', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontWeight: 600 }}>
            {globalError}
          </div>
        )}

        {/* Games table */}
        <div style={{ backgroundColor: '#141414', border: '1px solid #2a2a2a', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px' }}>
          {/* Table header */}
          <div style={{ backgroundColor: '#0d0d0d', borderBottom: '1px solid #2a2a2a', padding: '10px 14px', display: 'grid', gridTemplateColumns: '90px 1fr 1fr 130px 110px 1fr 32px', gap: '8px', alignItems: 'center' }}>
            {['Round', 'Home Team', 'Away Team', 'Date', 'Time', 'Location', ''].map(h => (
              <div key={h} style={{ color: '#4A9FE3', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {rows.map((row, idx) => {
              const isFilled = !!(row.homeTeamId && row.awayTeamId && row.date)
              return (
                <div
                  key={row._id}
                  style={{
                    padding: '8px 14px',
                    display: 'grid',
                    gridTemplateColumns: '90px 1fr 1fr 130px 110px 1fr 32px',
                    gap: '8px',
                    alignItems: 'center',
                    backgroundColor: idx % 2 === 0 ? '#141414' : '#111',
                    borderBottom: '1px solid #1a1a1a',
                    opacity: isFilled ? 1 : 0.8,
                  }}
                >
                  {/* Week */}
                  <select value={row.week} onChange={e => updateRow(row._id, 'week', e.target.value)} style={selectS}>
                    {WEEK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>

                  {/* Home Team */}
                  <select
                    value={row.homeTeamId}
                    onChange={e => updateRow(row._id, 'homeTeamId', e.target.value)}
                    style={{ ...selectS, borderColor: row.homeTeamId && row.homeTeamId === row.awayTeamId ? '#e74c3c' : '#2a2a2a' }}
                  >
                    <option value="">Home team…</option>
                    {sortedTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>

                  {/* Away Team */}
                  <select
                    value={row.awayTeamId}
                    onChange={e => updateRow(row._id, 'awayTeamId', e.target.value)}
                    style={{ ...selectS, borderColor: row.awayTeamId && row.homeTeamId === row.awayTeamId ? '#e74c3c' : '#2a2a2a' }}
                  >
                    <option value="">Away team…</option>
                    {sortedTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>

                  {/* Date */}
                  <div style={{ position: 'relative' }}>
                    <input
                      type="date"
                      value={row.date}
                      onChange={e => updateRow(row._id, 'date', e.target.value)}
                      style={inputS}
                    />
                    {idx > 0 && !row.date && (
                      <button
                        onClick={() => fillDown(row._id, 'date')}
                        title="Copy date from row above"
                        style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: '10px', padding: '2px' }}
                      >↑</button>
                    )}
                  </div>

                  {/* Time */}
                  <input
                    value={row.time}
                    onChange={e => updateRow(row._id, 'time', e.target.value)}
                    style={inputS}
                    placeholder="7:00 PM"
                  />

                  {/* Location */}
                  <input
                    value={row.location}
                    onChange={e => updateRow(row._id, 'location', e.target.value)}
                    style={inputS}
                    placeholder="Irving Masjid Gym"
                  />

                  {/* Delete row */}
                  <button
                    onClick={() => removeRow(row._id)}
                    style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: '16px', padding: '4px', lineHeight: 1, borderRadius: '4px' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#e74c3c')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#333')}
                    title="Remove row"
                  >×</button>
                </div>
              )
            })}
          </div>
        </div>

        {/* Table controls */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => addRows(1)}
            style={{ backgroundColor: '#1a1a1a', color: '#4A9FE3', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            + Add Row
          </button>
          <button onClick={() => addRows(5)}
            style={{ backgroundColor: '#1a1a1a', color: '#4A9FE3', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            + Add 5 Rows
          </button>
          <button onClick={clearAll}
            style={{ backgroundColor: '#1a1a1a', color: '#888', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            Clear All
          </button>
          <span style={{ color: '#444', fontSize: '13px', marginLeft: 'auto' }}>
            {filledRows.length} of {rows.length} rows ready to import
          </span>
        </div>

        {/* Import button */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={handleImport}
            disabled={importing || filledRows.length === 0 || !selectedSeason}
            style={{
              backgroundColor: importing || filledRows.length === 0 || !selectedSeason ? '#2a2a2a' : '#27AE60',
              color: '#fff', fontWeight: 800, fontSize: '15px',
              padding: '12px 32px', borderRadius: '8px', border: 'none',
              cursor: importing || filledRows.length === 0 || !selectedSeason ? 'not-allowed' : 'pointer',
              opacity: importing || filledRows.length === 0 || !selectedSeason ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {importing ? 'Importing…' : `Import ${filledRows.length} Game${filledRows.length !== 1 ? 's' : ''}`}
          </button>
          <Link href="/admin/games"
            style={{ color: '#555', fontSize: '13px', textDecoration: 'none', fontWeight: 600 }}>
            ← Back to Games
          </Link>
        </div>

        {/* Instructions */}
        <div style={{ marginTop: '32px', backgroundColor: '#0d0d0d', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '16px 20px' }}>
          <div style={{ color: '#555', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Tips</div>
          <ul style={{ color: '#555', fontSize: '13px', lineHeight: 1.8, margin: 0, paddingLeft: '18px' }}>
            <li>A row is only imported if it has a Home Team, Away Team, and Date filled in.</li>
            <li>Click the <strong style={{ color: '#888' }}>↑</strong> arrow on a blank date to copy the date from the row above.</li>
            <li>Time defaults to <strong style={{ color: '#888' }}>7:00 PM</strong> and location to <strong style={{ color: '#888' }}>Irving Masjid Gym</strong> if left empty.</li>
            <li>After importing, go to <Link href="/admin/games" style={{ color: '#4A9FE3' }}>Games</Link> to verify and enter scores.</li>
            <li>Use <strong style={{ color: '#888' }}>+ Add 5 Rows</strong> to quickly build out a full season — a typical season has 40–60 games.</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  )
}
