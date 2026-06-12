'use client'

import { NAMES } from '@/lib/tournament/data'
import { useLiveMatches, type LiveMatch } from '@/lib/supabase/use-live-matches'

const FASE_LABEL: Record<string, string> = {
  grupos: 'Fase de grupos', r32: '32-avos', r16: '16-avos', qf: 'Quartas', sf: 'Semis', terceiro: '3º lugar', final: 'Final',
}

function brt(iso: string | null): string {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso))
  } catch { return '' }
}

function teamName(m: LiveMatch, side: 'home' | 'away') {
  const code = m[`${side}_code`]
  if (code) return { code, nome: NAMES[code] ?? code }
  return { code: m[`${side}_slot`], nome: '' } // ainda indefinido (mata-mata)
}

export function LiveCarousel({ initial }: { initial: LiveMatch[] }) {
  const matches = useLiveMatches(initial)

  const live = matches.filter((m) => m.status === 'ao_vivo')
  const upcoming = matches
    .filter((m) => m.status === 'agendado' && m.kickoff)
    .sort((a, b) => (a.kickoff! < b.kickoff! ? -1 : 1))
  const recent = matches
    .filter((m) => m.status === 'encerrado')
    .sort((a, b) => (a.kickoff! > b.kickoff! ? -1 : 1))

  const shown = [...live, ...upcoming, ...recent].slice(0, 10)

  return (
    <section className="live-sec">
      <div className="amplify-live" aria-hidden />
      <div className="wrap live-inner">
        <div className="live-head">
          <span className="live-dot" /> <h2 className="anton">Ao Vivo &amp; Próximos</h2>
          <span className="live-sub">atualiza em tempo real</span>
        </div>

        {shown.length === 0 ? (
          <div className="live-empty">Sem jogos carregados ainda — rode o setup do banco para popular a tabela.</div>
        ) : (
          <div className="rail">
            {shown.map((m) => {
              const h = teamName(m, 'home'), a = teamName(m, 'away')
              const isLive = m.status === 'ao_vivo'
              const done = m.status === 'encerrado'
              return (
                <article className={`mcard${isLive ? ' is-live' : ''}`} key={m.id}>
                  <div className="mc-top">
                    <span className="mc-tag">{FASE_LABEL[m.fase] ?? m.fase}{m.grupo ? ` · ${m.grupo}` : ''}</span>
                    {isLive ? <span className="mc-min"><span className="live-dot sm" /> AO VIVO</span>
                      : done ? <span className="mc-min done">FIM</span>
                      : <span className="mc-min soon">{brt(m.kickoff)}</span>}
                  </div>
                  <Row name={h.nome || h.code} score={m.home_score} pending={!h.nome} />
                  <Row name={a.nome || a.code} score={m.away_score} pending={!a.nome} />
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

function Row({ name, score, pending }: { name: string; score: number | null; pending: boolean }) {
  return (
    <div className="mc-row">
      <span className={`mc-nm${pending ? ' pend' : ''}`}>{name}</span>
      <span className="mc-sc anton">{score ?? '–'}</span>
    </div>
  )
}
