'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function lancarPlacar(matchId: number, home: number | null, away: number | null, status: string) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { ok: false, error: 'Não autenticado.' }

  const { data: prof } = await sb.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!prof?.is_admin) return { ok: false, error: 'Sem permissão de admin.' }

  const { error } = await sb.from('matches')
    .update({ home_score: home, away_score: away, status })
    .eq('id', matchId)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/'); revalidatePath('/palpites'); revalidatePath('/ranking'); revalidatePath('/perfil')
  return { ok: true }
}
