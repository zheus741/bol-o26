'use client'

import { useState } from 'react'
import { NAMES } from '@/lib/tournament/data'
import { lancarPlacar } from './actions'

export type AdminMatch = {
  id: number; fase: string; grupo: string | null
  home_code: string | null; away_code: string | null; home_slot: string; away_slot: string
  home_score: number | null; away_score: number | null; status: string; kickoff: string | null
}

const label = (code: string | null, slot: string) => (code ? (NAMES[code] ?? code) : slot)
const brt = (iso: string | null) => iso ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) : ''

export function AdminClient({ matches }: { matches: AdminMatch[] }) {
  const [filter, setFilter] = useState<'all' | 'today'>('all')
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
  const list = matches.filter((m) => filter === 'all' || (m.kickoff && m.kickoff.slice(0, 10) <= today))

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button className={`fbtn ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>Todos</button>
        <button className={`fbtn ${filter === 'today' ? 'on' : ''}`} onClick={() => setFilter('today')}>Até hoje</button>
      </div>
      <div className="pal-list">
        {list.map((m) => <Row key={m.id} m={m} />)}
      </div>
    </>
  )
}

function Row({ m }: { m: AdminMatch }) {
  const [h, setH] = useState<string>(m.home_score?.toString() ?? '')
  const [a, setA] = useState<string>(m.away_score?.toString() ?? '')
  const [status, setStatus] = useState(m.status)
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState(false)

  async function save() {
    setSaving(true); setOk(false)
    const res = await lancarPlacar(m.id, h === '' ? null : +h, a === '' ? null : +a, status)
    setSaving(false)
    if (res.ok) { setOk(true); setTimeout(() => setOk(false), 2000) }
    else alert(res.error)
  }

  return (
    <div className="pal-row" style={{ background: '#fff', border: '1px solid var(--line)' }}>
      <div className="pal-when"><span className="pal-dt">#{m.id}</span><span className="pal-tm">{brt(m.kickoff)}</span></div>
      <div className="pal-pair">
        <span className="pal-nm home">{label(m.home_code, m.home_slot)}</span>
        <input className="pal-sc" inputMode="numeric" value={h} placeholder="–" onChange={(e) => setH(e.target.value.replace(/\D/g, '').slice(0, 2))} />
        <span className="pal-x">×</span>
        <input className="pal-sc" inputMode="numeric" value={a} placeholder="–" onChange={(e) => setA(e.target.value.replace(/\D/g, '').slice(0, 2))} />
        <span className="pal-nm">{label(m.away_code, m.away_slot)}</span>
      </div>
      <div className="pal-act" style={{ gap: 8 }}>
        <select className="adm-sel" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="agendado">agendado</option>
          <option value="ao_vivo">ao vivo</option>
          <option value="encerrado">encerrado</option>
        </select>
        <button className="btn-primary mini" onClick={save} disabled={saving}>
          {saving ? <span className="btn-spin" /> : ok ? '✓' : 'Lançar'}
        </button>
      </div>
    </div>
  )
}
