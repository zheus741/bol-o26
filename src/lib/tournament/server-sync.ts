import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildMatchRowsFromOpenfootball, TEAMS } from './data'

const SRC = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'
let lastSync = 0

/** Busca o openfootball e faz upsert dos jogos/placares no banco (service_role). */
export async function syncFromOpenfootball() {
  const of = await fetch(SRC, { cache: 'no-store' }).then((r) => r.json())
  const rows = buildMatchRowsFromOpenfootball(of)
  const sb = createAdminClient()
  await sb.from('teams').upsert(TEAMS, { onConflict: 'code' })
  let m = await sb.from('matches').upsert(rows, { onConflict: 'id' })
  if (m.error && /venue/i.test(m.error.message)) {
    m = await sb.from('matches').upsert(rows.map(({ venue, ...r }) => r), { onConflict: 'id' }) // eslint-disable-line @typescript-eslint/no-unused-vars
  }
  if (m.error) throw new Error(m.error.message)
  return { jogos: rows.length, jogados: rows.filter((r) => r.status === 'encerrado').length }
}

/**
 * Auto-cura: se existe jogo cujo apito já passou (>8min) mas ainda está 'agendado',
 * os dados estão velhos → dispara um sync. Debounce de 90s por instância p/ não martelar.
 * Roda quando alguém abre a home — não depende de cron externo.
 */
export async function maybeSelfHeal(matches: Array<{ status: string; kickoff?: string | null }>): Promise<boolean> {
  const now = Date.now()
  const stale = matches.some(
    (m) => m.status === 'agendado' && m.kickoff != null && new Date(m.kickoff).getTime() < now - 8 * 60_000,
  )
  if (!stale || now - lastSync < 90_000) return false
  lastSync = now
  try { await syncFromOpenfootball(); return true } catch { return false }
}
