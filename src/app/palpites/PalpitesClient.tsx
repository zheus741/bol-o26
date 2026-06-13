'use client'

import { useState } from 'react'
import { NAMES, flagUrl } from '@/lib/tournament/data'
import { createClient } from '@/lib/supabase/client'

export type MatchRow = {
  id: number; fase: string; grupo: string | null
  home_code: string; away_code: string
  home_score: number | null; away_score: number | null
  status: string; kickoff: string | null; venue?: string | null
}
export type PalpiteMap = Record<number, [number, number]>

const brtDay = (iso: string | null) => iso ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', day: '2-digit', month: 'short' }).format(new Date(iso)).replace('.', '').toUpperCase() : '—'
const brtTime = (iso: string | null) => iso ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) : ''
const pontos = (ph: number, pa: number, rh: number, ra: number) => (ph === rh && pa === ra ? 3 : Math.sign(ph - pa) === Math.sign(rh - ra) ? 1 : 0)

export function PalpitesClient({ matches, palpites, userId }: { matches: MatchRow[]; palpites: PalpiteMap; userId: string | null }) {
  const [state, setState] = useState<PalpiteMap>(palpites)
  const [saving, setSaving] = useState<number | null>(null)
  const [saved, setSaved] = useState<Set<number>>(new Set(Object.keys(palpites).map(Number)))
  const [toast, setToast] = useState(false)
  const now = Date.now()

  function setScore(id: number, sideIdx: 0 | 1, v: string) {
    const n = Math.max(0, Math.min(99, parseInt(v || '0', 10) || 0))
    setState((s) => { const cur = s[id] ?? [0, 0]; return { ...s, [id]: sideIdx === 0 ? [n, cur[1]] : [cur[0], n] } })
  }
  async function save(id: number) {
    if (!userId) { window.location.href = '/login?next=/palpites'; return }
    const [h, a] = state[id] ?? [0, 0]
    setSaving(id)
    const sb = createClient()
    const { error } = await sb.from('predictions').upsert({ user_id: userId, match_id: id, palpite_home: h, palpite_away: a }, { onConflict: 'user_id,match_id' })
    setSaving(null)
    if (!error) { setSaved((s) => new Set(s).add(id)); setToast(true); setTimeout(() => setToast(false), 2600) }
    else alert(error.message)
  }

  if (!matches.length) return <p style={{ color: '#6b6991', fontWeight: 600 }}>Nenhum jogo disponível ainda.</p>

  const byDay = new Map<string, MatchRow[]>()
  for (const m of matches) { const k = brtDay(m.kickoff); if (!byDay.has(k)) byDay.set(k, []); byDay.get(k)!.push(m) }

  return (
    <div className="pal-wrap">
      {[...byDay.entries()].map(([day, ms]) => (
        <div key={day}>
          <div className="pal-day">{day}</div>
          <div className="pal-list">
            {ms.map((m) => {
              const locked = !!m.kickoff && new Date(m.kickoff).getTime() <= now
              const done = m.status === 'encerrado' && m.home_score != null
              const pal = state[m.id]
              const pt = done && pal ? pontos(pal[0], pal[1], m.home_score!, m.away_score!) : null
              // caixas mostram: resultado real (se encerrado) ou o palpite
              const boxH = done ? m.home_score : pal?.[0]
              const boxA = done ? m.away_score : pal?.[1]
              return (
                <div className={`pal-row${locked ? ' locked' : ''}${done ? ' done' : ''}`} key={m.id}>
                  <div className="pal-status">{done ? 'FIM' : locked ? 'AO VIVO' : brtTime(m.kickoff)}</div>

                  <div className="pal-pair">
                    <div className="pal-team home">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="pal-flag" src={flagUrl(m.home_code)!} alt="" loading="lazy" decoding="async" />
                      <span className="pal-nm">{NAMES[m.home_code]}</span>
                    </div>
                    <input className="pal-sc" inputMode="numeric" disabled={locked} value={boxH ?? ''} placeholder="–" aria-label={`Placar ${NAMES[m.home_code]}`} onChange={(e) => setScore(m.id, 0, e.target.value)} />
                    <span className="pal-x" aria-hidden>×</span>
                    <input className="pal-sc" inputMode="numeric" disabled={locked} value={boxA ?? ''} placeholder="–" aria-label={`Placar ${NAMES[m.away_code]}`} onChange={(e) => setScore(m.id, 1, e.target.value)} />
                    <div className="pal-team away">
                      <span className="pal-nm">{NAMES[m.away_code]}</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="pal-flag" src={flagUrl(m.away_code)!} alt="" loading="lazy" decoding="async" />
                    </div>
                  </div>

                  <div className="pal-act">
                    {done ? (
                      <>
                        <span className="pal-mine">{pal ? `${pal[0]}×${pal[1]}` : '—'}</span>
                        <span className={`pchip p${pt}`}>+{pt}</span>
                      </>
                    ) : locked ? (
                      <span className="pal-lock">{pal ? `seu: ${pal[0]}×${pal[1]}` : 'sem palpite'}</span>
                    ) : saved.has(m.id) ? (
                      <button className="btn-mini" onClick={() => save(m.id)} disabled={saving === m.id}>{saving === m.id ? <span className="btn-spin dark" /> : <><Check />salvo · editar</>}</button>
                    ) : (
                      <button className="btn-primary mini" onClick={() => save(m.id)} disabled={saving === m.id}>{saving === m.id ? <span className="btn-spin" /> : 'Salvar'}</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
      <div className={`toast ${toast ? 'show' : ''}`} role="status" aria-live="polite">
        <Check />Palpite salvo
      </div>
    </div>
  )
}

function Check() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6L9 17l-5-5" /></svg>
}
