'use client'

import { useEffect, useState } from 'react'
import { NAMES, flagUrl } from '@/lib/tournament/data'
import { useLiveMatches, type LiveMatch } from '@/lib/supabase/use-live-matches'
import { createClient } from '@/lib/supabase/client'

const FASE_LABEL: Record<string, string> = {
  grupos: 'Fase de grupos', r32: '32-avos', r16: '16-avos', qf: 'Quartas', sf: 'Semis', terceiro: '3º lugar', final: 'Final',
}
function brt(iso: string | null): string {
  if (!iso) return ''
  try { return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) } catch { return '' }
}
function countdown(iso: string | null, now: number): string {
  if (!iso) return ''
  const d = new Date(iso).getTime() - now
  if (d <= 0) return ''
  const h = Math.floor(d / 3.6e6), m = Math.floor((d % 3.6e6) / 6e4)
  if (h >= 24) return `em ${Math.floor(h / 24)}d ${h % 24}h`
  if (h >= 1) return `em ${h}h ${m}min`
  return `em ${m}min`
}
function side(m: LiveMatch, s: 'home' | 'away') {
  const code = m[`${s}_code`]
  return { code, nome: code ? (NAMES[code] ?? code) : m[`${s}_slot`], flag: flagUrl(code), pending: !code }
}

export function LiveCarousel({ initial }: { initial: LiveMatch[] }) {
  const matches = useLiveMatches(initial)
  const [pal, setPal] = useState<Record<number, [number, number]>>({})
  const [authed, setAuthed] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])
  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      setAuthed(true)
      const { data: preds } = await sb.from('predictions').select('match_id,palpite_home,palpite_away').eq('user_id', data.user.id)
      const map: Record<number, [number, number]> = {}
      for (const p of preds ?? []) map[p.match_id] = [p.palpite_home, p.palpite_away]
      setPal(map)
    })
  }, [])

  const live = matches.filter((m) => m.status === 'ao_vivo')
  const upcoming = matches.filter((m) => m.status === 'agendado' && m.kickoff).sort((a, b) => (a.kickoff! < b.kickoff! ? -1 : 1))
  const recent = matches.filter((m) => m.status === 'encerrado').sort((a, b) => (a.kickoff! > b.kickoff! ? -1 : 1))
  const shown = [...live, ...upcoming, ...recent].slice(0, 12)
  const nextCd = upcoming[0] ? countdown(upcoming[0].kickoff, now) : ''

  return (
    <section className="live-sec">
      <div className="amplify-live" aria-hidden />
      <div className="wrap live-inner">
        <div className="live-head">
          <span className="live-dot" /> <h2 className="anton">Ao Vivo &amp; Próximos</h2>
          <span className="live-sub">atualiza em tempo real</span>
          {nextCd && <span className="live-next">Próximo jogo {nextCd}</span>}
        </div>
        {shown.length === 0 ? (
          <div className="live-empty">Sem jogos carregados ainda.</div>
        ) : (
          <div className="rail">
            {shown.map((m) => {
              const h = side(m, 'home'), a = side(m, 'away')
              const isLive = m.status === 'ao_vivo'
              const done = m.status === 'encerrado'
              const mine = pal[m.id]
              return (
                <article className={`mcard${isLive ? ' is-live' : ''}`} key={m.id}>
                  <div className="mc-top">
                    <span className="mc-tag">{FASE_LABEL[m.fase] ?? m.fase}{m.grupo ? ` · ${m.grupo}` : ''}</span>
                    {isLive ? <span className="mc-st live"><span className="live-dot sm" />AO VIVO</span>
                      : done ? <span className="mc-st done">Encerrado</span>
                      : <span className="mc-st soon">{brt(m.kickoff)}</span>}
                  </div>
                  <div className="mc-score">
                    <TeamRow t={h} score={m.home_score} live={done || isLive} />
                    <TeamRow t={a} score={m.away_score} live={done || isLive} />
                  </div>
                  <div className="mc-you">
                    {mine ? <span>seu palpite: <b>{mine[0]}×{mine[1]}</b></span>
                      : !done ? (authed
                        ? <a className="pend" href="/palpites">⚠ Falta palpitar</a>
                        : <a className="pend" href="/login">Entre para palpitar</a>)
                      : <span>sem palpite</span>}
                    {m.venue && <span className="mc-venue-mini">{m.venue}</span>}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

function TeamRow({ t, score, live }: { t: { nome: string; flag: string | null; pending: boolean }; score: number | null; live: boolean }) {
  return (
    <div className="mc-team">
      {t.flag
        // eslint-disable-next-line @next/next/no-img-element
        ? <img className="mc-flag" src={t.flag} alt="" loading="lazy" decoding="async" />
        : <span className="mc-flag ph" />}
      <span className={`mc-tn${t.pending ? ' pend' : ''}`}>{t.nome}</span>
      <span className={`mc-n anton${live ? '' : ' dim'}`}>{score ?? '–'}</span>
    </div>
  )
}
