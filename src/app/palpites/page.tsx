import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { PalpitesClient, type MatchRow, type PalpiteMap, type PenMap } from './PalpitesClient'

export const dynamic = 'force-dynamic'

export default async function Palpites() {
  if (!isSupabaseConfigured()) {
    return (
      <main className="wrap">
        <h2 className="day">Palpites</h2>
        <p style={{ color: '#6b6991', fontWeight: 600 }}>Configure o Supabase para dar palpites.</p>
      </main>
    )
  }

  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()

  // só jogos com os dois times definidos (grupos + mata-mata resolvido)
  const { data: matchesData } = await sb
    .from('matches')
    .select('id,fase,grupo,home_code,away_code,home_score,away_score,status,kickoff,advances')
    .not('home_code', 'is', null)
    .not('away_code', 'is', null)
    .order('kickoff', { ascending: true })

  const matches = (matchesData as MatchRow[]) ?? []

  const palpites: PalpiteMap = {}
  const pensInit: PenMap = {}
  if (user) {
    const { data: preds } = await sb
      .from('predictions')
      .select('match_id,palpite_home,palpite_away,penalti_winner')
      .eq('user_id', user.id)
    for (const p of preds ?? []) {
      palpites[p.match_id] = [p.palpite_home, p.palpite_away]
      if (p.penalti_winner) pensInit[p.match_id] = p.penalti_winner
    }
  }

  return (
    <main className="wrap">
      <h2 className="day">Palpites</h2>
      <p style={{ color: '#6b6991', fontWeight: 600, marginBottom: 16, maxWidth: 640 }}>
        Crava o placar antes do apito. Placar exato = <b>3 pts</b> · só o vencedor/empate = <b>1 pt</b>. Horários em BRT.
      </p>
      <PalpitesClient matches={matches} palpites={palpites} pensInit={pensInit} userId={user?.id ?? null} />
    </main>
  )
}
