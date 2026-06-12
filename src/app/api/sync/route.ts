import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildMatchRowsFromOpenfootball, TEAMS } from '@/lib/tournament/data'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SRC = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'

export async function GET(req: NextRequest) {
  // protegido: Vercel Cron envia "Authorization: Bearer <CRON_SECRET>"
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  try {
    const of = await fetch(SRC, { cache: 'no-store' }).then((r) => r.json())
    const rows = buildMatchRowsFromOpenfootball(of)
    const sb = createAdminClient()

    const t = await sb.from('teams').upsert(TEAMS, { onConflict: 'code' })
    if (t.error) return NextResponse.json({ ok: false, error: t.error.message }, { status: 500 })

    let m = await sb.from('matches').upsert(rows, { onConflict: 'id' })
    if (m.error && /venue/i.test(m.error.message)) {
      m = await sb.from('matches').upsert(rows.map(({ venue, ...r }) => r), { onConflict: 'id' }) // eslint-disable-line @typescript-eslint/no-unused-vars
    }
    if (m.error) return NextResponse.json({ ok: false, error: m.error.message }, { status: 500 })

    const jogados = rows.filter((r) => r.status === 'encerrado').length
    return NextResponse.json({ ok: true, times: TEAMS.length, jogos: rows.length, jogados })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
