'use client'

import { useState } from 'react'
import { NAMES } from '@/lib/tournament/data'
import { createClient } from '@/lib/supabase/client'

export type MatchRow = {
  id: number; fase: string; grupo: string | null
  home_code: string; away_code: string
  home_score: number | null; away_score: number | null
  status: string; kickoff: string | null
}
export type PalpiteMap = Record<number, [number, number]>

function brtDay(iso: string | null) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', day: '2-digit', month: 'short' }).format(new Date(iso))
}
function brtTime(iso: string | null) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}
function pontos(ph: number, pa: number, rh: number, ra: number) {
  if (ph === rh && pa === ra) return 3
  if (Math.sign(ph - pa) === Math.sign(rh - ra)) return 1
  return 0
}

export function PalpitesClient({ matches, palpites, userId }: { matches: MatchRow[]; palpites: PalpiteMap; userId: string | null }) {
  const [state, setState] = useState<PalpiteMap>(palpites)
  const [saving, setSaving] = useState<number | null>(null)
  const [saved, setSaved] = useState<Set<number>>(new Set(Object.keys(palpites).map(Number)))
  const now = Date.now()

  function setScore(id: number, side: 0 | 1, v: string) {
    const n = Math.max(0, Math.min(99, parseInt(v || '0', 10) || 0))
    setState((s) => {
      const cur = s[id] ?? [0, 0]
      const next: [number, number] = side === 0 ? [n, cur[1]] : [cur[0], n]
      return { ...s, [id]: next }
    })
  }

  async function save(id: number) {
    if (!userId) { window.location.href = '/login?next=/palpites'; return }
    const [h, a] = state[id] ?? [0, 0]
    setSaving(id)
    const sb = createClient()
    const { error } = await sb.from('predictions').upsert(
      { user_id: userId, match_id: id, palpite_home: h, palpite_away: a },
      { onConflict: 'user_id,match_id' },
    )
    setSaving(null)
    if (!error) setSaved((s) => new Set(s).add(id))
    else alert(error.message)
  }

  if (!matches.length) {
    return <p style={{ color: '#6b6991', fontWeight: 600 }}>Nenhum jogo disponível ainda. Rode o setup do banco.</p>
  }

  return (
    <div className="pal-list">
      {matches.map((m) => {
        const locked = !!m.kickoff && new Date(m.kickoff).getTime() <= now
        const done = m.status === 'encerrado' && m.home_score != null
        const pal = state[m.id]
        const pts = done && pal ? pontos(pal[0], pal[1], m.home_score!, m.away_score!) : null
        return (
          <div className={`pal-row${locked ? ' locked' : ''}`} key={m.id}>
            <div className="pal-when">
              <span className="pal-dt">{brtDay(m.kickoff)}</span>
              <span className="pal-tm">{locked ? '🔒' : brtTime(m.kickoff)}</span>
            </div>
            <div className="pal-pair">
              <span className="pal-nm home">{NAMES[m.home_code] ?? m.home_code}</span>
              <input className="pal-sc" inputMode="numeric" disabled={locked}
                value={pal?.[0] ?? ''} placeholder="–" onChange={(e) => setScore(m.id, 0, e.target.value)} />
              <span className="pal-x">×</span>
              <input className="pal-sc" inputMode="numeric" disabled={locked}
                value={pal?.[1] ?? ''} placeholder="–" onChange={(e) => setScore(m.id, 1, e.target.value)} />
              <span className="pal-nm">{NAMES[m.away_code] ?? m.away_code}</span>
            </div>
            <div className="pal-act">
              {done ? (
                <span className={`pchip p${pts}`}>+{pts}</span>
              ) : locked ? (
                <span className="pal-lock">aguardando resultado</span>
              ) : saved.has(m.id) ? (
                <button className="btn-mini" onClick={() => save(m.id)} disabled={saving === m.id}>
                  {saving === m.id ? <span className="btn-spin dark" /> : '✓ salvo · editar'}
                </button>
              ) : (
                <button className="btn-primary mini" onClick={() => save(m.id)} disabled={saving === m.id}>
                  {saving === m.id ? <span className="btn-spin" /> : 'Salvar'}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
