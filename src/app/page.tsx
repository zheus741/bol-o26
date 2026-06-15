import { GROUPS, NAMES, flagUrl } from '@/lib/tournament/data'
import { standings } from '@/lib/tournament/standings'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { maybeSelfHeal } from '@/lib/tournament/server-sync'
import { LiveCarousel } from '@/components/LiveCarousel'
import { Bracket } from '@/components/Bracket'
import type { LiveMatch } from '@/lib/supabase/use-live-matches'

export const dynamic = 'force-dynamic'

async function loadMatches(): Promise<LiveMatch[]> {
  if (!isSupabaseConfigured()) return []
  try {
    const sb = await createClient()
    const { data } = await sb.from('matches').select('*').order('kickoff', { ascending: true })
    return (data as LiveMatch[]) ?? []
  } catch {
    return []
  }
}

export default async function Home() {
  let matches = await loadMatches()
  // auto-cura: se há jogo que já começou mas segue sem resultado, sincroniza na hora
  if (await maybeSelfHeal(matches)) matches = await loadMatches()
  const configured = isSupabaseConfigured()

  return (
    <>
      {!configured && (
        <div className="setup">
          <div className="wrap">
            ⚙️ Modo demo — configure o Supabase em <code>.env.local</code> e rode <code>supabase/setup_completo.sql</code> no SQL Editor.
          </div>
        </div>
      )}

      <LiveCarousel initial={matches} />

      <main className="wrap">
        <h2 className="day">Classificação</h2>
        <div className="zone-legend">
          <span className="zl"><span className="dot q1" /> 1º e 2º avançam</span>
          <span className="zl"><span className="dot q3" /> 3º disputa repescagem (8 melhores)</span>
        </div>
        <div className="groups-grid">
          {Object.keys(GROUPS).map((g) => {
            const { sorted, done } = standings(g, matches)
            return (
              <div className="gcard" key={g}>
                <div className="ghead">
                  <span className="gl">{g}</span> Grupo {g}
                  <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 800, color: done ? '#8a88ad' : 'var(--blue)' }}>
                    {done ? 'ENCERRADO' : 'EM ANDAMENTO'}
                  </span>
                </div>
                <table className="gtable">
                  <thead><tr><th></th><th>Time</th><th>J</th><th>SG</th><th>Pts</th></tr></thead>
                  <tbody>
                    {sorted.map((r, i) => (
                      <tr key={r.t} className={i < 2 ? 'q1' : i === 2 ? 'q3' : ''}>
                        <td className="pos">{i + 1}</td>
                        <td className="tm">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img className="g-flag" src={flagUrl(r.t)!} alt="" loading="lazy" decoding="async" />
                          <b>{r.t}</b><span>{NAMES[r.t]}</span>
                        </td>
                        <td>{r.J}</td>
                        <td>{r.SG > 0 ? '+' : ''}{r.SG}</td>
                        <td className="pt">{r.Pts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>

        <h2 className="day" style={{ marginTop: 34 }}>Chaveamento</h2>
      </main>

      <Bracket matches={matches} />

      <main className="wrap">
        <p style={{ color: '#9a98ba', fontSize: 12, fontWeight: 600, margin: '20px 0 40px' }}>
          Placar exato = 3 pts · só o vencedor/empate = 1 pt · palpite trava no apito (horários em BRT).
        </p>
      </main>
    </>
  )
}
