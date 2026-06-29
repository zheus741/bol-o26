import { GROUPS, NAMES, flagUrl } from '@/lib/tournament/data'
import { standings } from '@/lib/tournament/standings'
import { isSupabaseConfigured } from '@/lib/supabase/server'
import { loadMatches } from '@/lib/matches'

export const dynamic = 'force-dynamic'

export default async function Grupos() {
  const matches = await loadMatches()
  const configured = isSupabaseConfigured()

  return (
    <main className="wrap">
      <div className="page-head reveal">
        <h2 className="day" style={{ margin: '22px 2px 4px' }}>Fase de grupos</h2>
        <p style={{ color: '#6b6991', fontWeight: 600, margin: '0 2px 14px' }}>Classificação final dos 12 grupos.</p>
      </div>
      {!configured && <p style={{ color: '#6b6991', fontWeight: 600 }}>Configure o Supabase.</p>}
      <div className="zone-legend reveal">
        <span className="zl"><span className="dot q1" /> 1º e 2º avançaram</span>
        <span className="zl"><span className="dot q3" /> 3º — repescagem (8 melhores)</span>
      </div>
      <div className="groups-grid">
        {Object.keys(GROUPS).map((g, gi) => {
          const { sorted, done } = standings(g, matches)
          return (
            <div className="gcard reveal" style={{ animationDelay: `${gi * 40}ms` }} key={g}>
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
    </main>
  )
}
