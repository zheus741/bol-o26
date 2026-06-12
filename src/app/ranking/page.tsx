import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Row = { user_id: string; nome: string; apelido: string | null; pontos: number; cravadas: number }

const ini = (r: Row) => (r.apelido || r.nome || '?').slice(0, 2).toUpperCase()

export default async function Ranking() {
  let rows: Row[] = []
  let note: string | null = null

  if (!isSupabaseConfigured()) note = 'Configure o Supabase para ver o ranking.'
  else {
    try {
      const sb = await createClient()
      const { data } = await sb.from('v_ranking').select('user_id,nome,apelido,pontos,cravadas')
      rows = ((data as Row[]) ?? []).filter((r) => r.pontos > 0 || r.cravadas > 0)
      if (!rows.length) note = 'Ninguém pontuou ainda — os palpites contam quando os jogos encerram.'
    } catch { note = 'Não foi possível carregar o ranking.' }
  }

  const [first, second, third, ...rest] = rows

  return (
    <main className="wrap">
      <h2 className="day">Ranking</h2>
      {note && <p style={{ color: '#6b6991', fontWeight: 600 }}>{note}</p>}

      {rows.length > 0 && (
        <>
          <div className="podium">
            {second && <Pod r={second} pos={2} cls="second" />}
            {first && <Pod r={first} pos={1} cls="first" />}
            {third && <Pod r={third} pos={3} cls="third" />}
          </div>
          {rest.length > 0 && (
            <div className="lb">
              {rest.map((r, i) => (
                <div className="lrow" key={r.user_id}>
                  <div className="pos anton">{i + 4}</div>
                  <div className="who"><span className="av anton">{ini(r)}</span>
                    <span className="who-nm">{r.apelido || r.nome}</span>
                  </div>
                  <div className="tot anton">{r.pontos}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  )
}

function Pod({ r, pos, cls }: { r: { nome: string; apelido: string | null; pontos: number }; pos: number; cls: string }) {
  return (
    <div className={`pod ${cls}`}>
      <div className="rk anton">{pos}</div>
      <div className="av anton">{(r.apelido || r.nome || '?').slice(0, 2).toUpperCase()}</div>
      <div className="nm">{r.apelido || r.nome}</div>
      <div className="pt anton">{r.pontos}<small> pts</small></div>
    </div>
  )
}
