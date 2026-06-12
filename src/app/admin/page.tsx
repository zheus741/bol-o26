import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { AdminClient, type AdminMatch } from './AdminClient'

export const dynamic = 'force-dynamic'

export default async function Admin() {
  if (!isSupabaseConfigured()) {
    return <main className="wrap"><h2 className="day">Admin</h2><p style={{ color: '#6b6991', fontWeight: 600 }}>Configure o Supabase.</p></main>
  }
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return <main className="wrap"><h2 className="day">Admin</h2><p style={{ color: '#6b6991', fontWeight: 600 }}>Faça login.</p></main>

  const { data: prof } = await sb.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!prof?.is_admin) {
    return (
      <main className="wrap"><h2 className="day">Admin</h2>
        <p style={{ color: '#6b6991', fontWeight: 600, maxWidth: 600 }}>
          Acesso restrito. Marque seu usuário como admin no Supabase:
          <br /><code>update public.profiles set is_admin = true where id = &apos;{user.id}&apos;;</code>
        </p>
      </main>
    )
  }

  const { data: matches } = await sb.from('matches')
    .select('id,fase,grupo,home_code,away_code,home_slot,away_slot,home_score,away_score,status,kickoff')
    .order('kickoff', { ascending: true })

  return (
    <main className="wrap">
      <h2 className="day">Lançar placar</h2>
      <p style={{ color: '#6b6991', fontWeight: 600, marginBottom: 14 }}>
        Atualiza o placar oficial — classificação, chave, pontos e o carrossel ao vivo recalculam na hora.
      </p>
      <AdminClient matches={(matches as AdminMatch[]) ?? []} />
    </main>
  )
}
