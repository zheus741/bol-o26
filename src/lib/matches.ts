import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'
import type { LiveMatch } from '@/lib/supabase/use-live-matches'

export async function loadMatches(): Promise<LiveMatch[]> {
  if (!isSupabaseConfigured()) return []
  try {
    const sb = await createClient()
    const { data } = await sb.from('matches').select('*').order('kickoff', { ascending: true })
    return (data as LiveMatch[]) ?? []
  } catch {
    return []
  }
}
