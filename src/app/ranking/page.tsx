import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Row = { user_id: string; nome: string; apelido: string | null; pontos: number; cravadas: number }

const nameOf = (r: Row) => r.nome || r.apelido || 'Jogador'
const ini = (r: Row) => nameOf(r).trim().slice(0, 2).toUpperCase()

export default async function Ranking() {
  let rows: Row[] = []
  let note: string | null = null

  if (!isSupabaseConfigured()) note = 'Configure o Supabase para ver o ranking.'
  else {
    try {
      const sb = await createClient()
      const { data } = await sb.from('v_ranking').select('user_id,nome,apelido,pontos,cravadas')
      rows = (data as Row[]) ?? []
      if (!rows.length) note = 'Ninguém entrou no bolão ainda. Seja o primeiro!'
    } catch { note = 'Não foi possível carregar o ranking.' }
  }

  const hasPoints = (rows[0]?.pontos ?? 0) > 0
  const [first, second, third, ...rest] = rows
  const listRows = hasPoints ? rest : rows
  const offset = hasPoints ? 4 : 1

  return (
    <main className="wrap">
      <h2 className="day">Ranking</h2>
      {note && <p style={{ color: '#6b6991', fontWeight: 600 }}>{note}</p>}

      {hasPoints && (
        <div className="podium">
          {second && <Pod r={second} pos={2} cls="second" />}
          {first && <Pod r={first} pos={1} cls="first" />}
          {third && <Pod r={third} pos={3} cls="third" />}
        </div>
      )}

      {rows.length > 0 && (
        <div className="lb">
          {listRows.map((r, i) => (
            <div className="lrow" key={r.user_id}>
              <div className="pos anton">{i + offset}</div>
              <div className="who">
                <span className="av">{ini(r)}</span>
                <span className="who-nm">{nameOf(r)}</span>
              </div>
              <div className="who-cr">{r.cravadas > 0 ? `${r.cravadas} cravadas` : ''}</div>
              <div className="tot anton">{r.pontos}</div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

function Pod({ r, pos, cls }: { r: Row; pos: number; cls: string }) {
  return (
    <div className={`pod ${cls}`}>
      <div className="rk anton">{pos}</div>
      <div className="av">{ini(r)}</div>
      <div className="nm">{nameOf(r)}</div>
      <div className="pt anton">{r.pontos}<small> pts</small></div>
    </div>
  )
}
