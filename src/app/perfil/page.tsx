import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { NAMES } from '@/lib/tournament/data'

export const dynamic = 'force-dynamic'

function pts(p: P, m: M): number {
  const ph = p.palpite_home, pa = p.palpite_away, rh = m.home_score!, ra = m.away_score!
  if (m.fase === 'grupos') return ph === rh && pa === ra ? 3 : Math.sign(ph - pa) === Math.sign(rh - ra) ? 1 : 0
  const predAdv = ph > pa ? m.home_code : pa > ph ? m.away_code : p.penalti_winner
  if (!predAdv) return 0
  const exact = ph === rh && pa === ra
  const advOk = predAdv === m.advances
  if (exact && advOk) return 3
  if (exact) return 0
  return advOk ? 1 : 0
}
type M = { fase: string; home_code: string; away_code: string; home_score: number | null; away_score: number | null; status: string; grupo: string | null; advances: string | null }
type P = { match_id: number; palpite_home: number; palpite_away: number; penalti_winner: string | null; matches: M | M[] }

export default async function Perfil() {
  if (!isSupabaseConfigured()) {
    return <main className="wrap"><h2 className="day">Perfil</h2><p style={{ color: '#6b6991', fontWeight: 600 }}>Configure o Supabase.</p></main>
  }
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) {
    return <main className="wrap"><h2 className="day">Perfil</h2><p style={{ color: '#6b6991', fontWeight: 600 }}>Faça login para ver seu perfil.</p></main>
  }

  const { data: profile } = await sb.from('profiles').select('nome,apelido').eq('id', user.id).maybeSingle()
  const { data: ranking } = await sb.from('v_ranking').select('user_id,pontos,cravadas')
  const myRow = (ranking ?? []).find((r) => r.user_id === user.id)
  const posicao = (ranking ?? []).findIndex((r) => r.user_id === user.id) + 1

  const { data: preds } = await sb
    .from('predictions')
    .select('match_id,palpite_home,palpite_away,penalti_winner,matches(fase,home_code,away_code,home_score,away_score,status,kickoff,grupo,advances)')
    .eq('user_id', user.id)
    .order('match_id', { ascending: true })

  const nome = profile?.nome || user.email?.split('@')[0] || 'Jogador'
  const ini = nome.slice(0, 1).toUpperCase()

  const hist = ((preds ?? []) as unknown as P[]).map((p) => ({ p, m: (Array.isArray(p.matches) ? p.matches[0] : p.matches) as M }))

  return (
    <main className="wrap">
      <h2 className="day">Perfil</h2>
      <div className="pcard">
        <div className="amplify-live" aria-hidden />
        <div className="pcard-in">
          <div className="big-av anton">{ini}</div>
          <div>
            <h3 className="anton">{nome}</h3>
            <div className="psub">{user.email}</div>
          </div>
          <div className="pstats">
            <div><div className="v anton">{myRow?.pontos ?? 0}</div><div className="k">Pontos</div></div>
            <div><div className="v anton">{posicao || '–'}º</div><div className="k">Ranking</div></div>
            <div><div className="v anton">{myRow?.cravadas ?? 0}</div><div className="k">Cravadas</div></div>
            <div><div className="v anton">{hist.length}</div><div className="k">Palpites</div></div>
          </div>
        </div>
      </div>

      <h3 className="day" style={{ fontSize: 16, marginTop: 24 }}>Histórico</h3>
      {hist.length === 0 ? (
        <p style={{ color: '#6b6991', fontWeight: 600 }}>Você ainda não deu palpites. <a href="/palpites" style={{ color: 'var(--blue)' }}>Começar →</a></p>
      ) : (
        <div className="hist">
          {hist.map(({ p, m }) => {
            const done = m.status === 'encerrado' && m.home_score != null
            const pt = done ? pts(p, m) : null
            return (
              <div className="hrow" key={p.match_id}>
                <div className="hg">{NAMES[m.home_code]} × {NAMES[m.away_code]}<small>{m.grupo ? `Grupo ${m.grupo}` : 'Mata-mata'}</small></div>
                <div className="hc anton">{p.palpite_home}×{p.palpite_away}</div>
                <div className="hc real anton">{done ? `${m.home_score}×${m.away_score}` : '—'}</div>
                <div>{pt != null ? <span className={`pchip p${pt}`}>+{pt}</span> : <span className="pal-lock">aberto</span>}</div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
