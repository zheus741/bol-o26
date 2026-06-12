'use client'

import { NAMES, flagUrl } from '@/lib/tournament/data'
import { useLiveMatches, type LiveMatch } from '@/lib/supabase/use-live-matches'

const FASE_LABEL: Record<string, string> = {
  grupos: 'Fase de grupos', r32: '32-avos', r16: '16-avos', qf: 'Quartas', sf: 'Semis', terceiro: '3º lugar', final: 'Final',
}

function brt(iso: string | null): string {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
  } catch { return '' }
}

function side(m: LiveMatch, s: 'home' | 'away') {
  const code = m[`${s}_code`]
  return { code, nome: code ? (NAMES[code] ?? code) : m[`${s}_slot`], flag: flagUrl(code), pending: !code }
}

export function LiveCarousel({ initial }: { initial: LiveMatch[] }) {
  const matches = useLiveMatches(initial)
  const live = matches.filter((m) => m.status === 'ao_vivo')
  const upcoming = matches.filter((m) => m.status === 'agendado' && m.kickoff).sort((a, b) => (a.kickoff! < b.kickoff! ? -1 : 1))
  const recent = matches.filter((m) => m.status === 'encerrado').sort((a, b) => (a.kickoff! > b.kickoff! ? -1 : 1))
  const shown = [...live, ...upcoming, ...recent].slice(0, 12)

  return (
    <section className="live-sec">
      <div className="amplify-live" aria-hidden />
      <div className="wrap live-inner">
        <div className="live-head">
          <span className="live-dot" /> <h2 className="anton">Ao Vivo &amp; Próximos</h2>
          <span className="live-sub">atualiza em tempo real</span>
        </div>
        {shown.length === 0 ? (
          <div className="live-empty">Sem jogos carregados ainda.</div>
        ) : (
          <div className="rail">
            {shown.map((m) => {
              const h = side(m, 'home'), a = side(m, 'away')
              const isLive = m.status === 'ao_vivo'
              const done = m.status === 'encerrado'
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

                  {(m.venue || done) && (
                    <div className="mc-foot">
                      {done && <span className="mc-ft">FULL-TIME</span>}
                      {m.venue && <span className="mc-venue"><PinIcon />{m.venue}</span>}
                    </div>
                  )}
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
        ? <img className="mc-flag" src={t.flag} alt="" />
        : <span className="mc-flag ph" />}
      <span className={`mc-tn${t.pending ? ' pend' : ''}`}>{t.nome}</span>
      <span className={`mc-n anton${live ? '' : ' dim'}`}>{score ?? '–'}</span>
    </div>
  )
}

function PinIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" /><circle cx="12" cy="10" r="2.4" />
    </svg>
  )
}
