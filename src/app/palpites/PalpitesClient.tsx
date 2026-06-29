'use client'

import { useState } from 'react'
import { NAMES, flagUrl } from '@/lib/tournament/data'
import { createClient } from '@/lib/supabase/client'

export type MatchRow = {
  id: number; fase: string; grupo: string | null
  home_code: string; away_code: string
  home_score: number | null; away_score: number | null
  status: string; kickoff: string | null; venue?: string | null; advances?: string | null
}
export type PalpiteMap = Record<number, [number, number]>
export type PenMap = Record<number, string>

const brtDay = (iso: string | null) => iso ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', day: '2-digit', month: 'short' }).format(new Date(iso)).replace('.', '').toUpperCase() : '—'
const brtTime = (iso: string | null) => iso ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) : ''

// pontuação: grupos = exato 3 / vencedor 1; mata-mata = empate só conta se acertar o pênalti
function calcPts(m: MatchRow, pal: [number, number] | undefined, pen: string | undefined): number {
  if (!pal || m.home_score == null || m.away_score == null) return 0
  const [ph, pa] = pal, rh = m.home_score, ra = m.away_score
  if (m.fase === 'grupos') return ph === rh && pa === ra ? 3 : Math.sign(ph - pa) === Math.sign(rh - ra) ? 1 : 0
  const predAdv = ph > pa ? m.home_code : pa > ph ? m.away_code : pen
  if (!predAdv) return 0
  const exact = ph === rh && pa === ra
  const advOk = predAdv === m.advances
  if (exact && advOk) return 3
  if (exact) return 0
  if (advOk) return 1
  return 0
}

export function PalpitesClient({ matches, palpites, pensInit, userId }: { matches: MatchRow[]; palpites: PalpiteMap; pensInit: PenMap; userId: string | null }) {
  const [state, setState] = useState<PalpiteMap>(palpites)
  const [pens, setPens] = useState<PenMap>(pensInit)
  const [saving, setSaving] = useState<number | null>(null)
  const [saved, setSaved] = useState<Set<number>>(new Set(Object.keys(palpites).map(Number)))
  const [toast, setToast] = useState(false)
  const now = Date.now()

  function setScore(id: number, sideIdx: 0 | 1, v: string) {
    const n = Math.max(0, Math.min(99, parseInt(v || '0', 10) || 0))
    setState((s) => { const cur = s[id] ?? [0, 0]; return { ...s, [id]: sideIdx === 0 ? [n, cur[1]] : [cur[0], n] } })
  }
  async function save(id: number, m: MatchRow) {
    if (!userId) { window.location.href = '/login?next=/palpites'; return }
    const [h, a] = state[id] ?? [0, 0]
    const isKoDraw = m.fase !== 'grupos' && h === a
    if (isKoDraw && !pens[id]) { alert('Empate no mata-mata: escolha quem passa nos pênaltis.'); return }
    setSaving(id)
    const sb = createClient()
    const { error } = await sb.from('predictions').upsert(
      { user_id: userId, match_id: id, palpite_home: h, palpite_away: a, penalti_winner: isKoDraw ? pens[id] : null },
      { onConflict: 'user_id,match_id' },
    )
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
              const pt = done ? calcPts(m, pal, pens[m.id]) : null
              const boxH = done ? m.home_score : pal?.[0]
              const boxA = done ? m.away_score : pal?.[1]
              const isKo = m.fase !== 'grupos'
              const drawPick = pal != null && pal[0] === pal[1]
              const showPen = isKo && !locked && drawPick
              return (
                <div className={`pal-row${locked ? ' locked' : ''}${done ? ' done' : ''}${showPen ? ' has-pen' : ''}`} key={m.id}>
                  <div className="pal-status">{done ? 'FIM' : locked ? 'AO VIVO' : brtTime(m.kickoff)}</div>

                  <div className="pal-mid">
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
                    {showPen && (
                      <div className="pal-pen">
                        <span className="pal-pen-q">Empate — quem passa nos pênaltis?</span>
                        <div className="pal-pen-opts">
                          {[m.home_code, m.away_code].map((c) => (
                            <button key={c} type="button" className={`pen-opt${pens[m.id] === c ? ' on' : ''}`} onClick={() => setPens((p) => ({ ...p, [m.id]: c }))}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={flagUrl(c)!} alt="" loading="lazy" />{NAMES[c]}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pal-act">
                    {done ? (
                      <>
                        <span className="pal-mine">{pal ? `${pal[0]}×${pal[1]}${isKo && pal[0] === pal[1] && pens[m.id] ? ` (${pens[m.id]})` : ''}` : '—'}</span>
                        <span className={`pchip p${pt}`}>+{pt}</span>
                      </>
                    ) : locked ? (
                      <span className="pal-lock">{pal ? `seu: ${pal[0]}×${pal[1]}` : 'sem palpite'}</span>
                    ) : saved.has(m.id) ? (
                      <button className="btn-mini" onClick={() => save(m.id, m)} disabled={saving === m.id}>{saving === m.id ? <span className="btn-spin dark" /> : <><Check />salvo · editar</>}</button>
                    ) : (
                      <button className="btn-primary mini" onClick={() => save(m.id, m)} disabled={saving === m.id}>{saving === m.id ? <span className="btn-spin" /> : 'Salvar'}</button>
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
