import { NextResponse, type NextRequest } from 'next/server'
import { syncFromOpenfootball } from '@/lib/tournament/server-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  // protegido: Vercel Cron envia "Authorization: Bearer <CRON_SECRET>"
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  try {
    const r = await syncFromOpenfootball()
    return NextResponse.json({ ok: true, ...r })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
