'use client'

import { useEffect, useState } from 'react'
import { createClient } from './client'

export type LiveMatch = {
  id: number; fase: string; grupo: string | null
  home_code: string | null; away_code: string | null
  home_slot: string; away_slot: string
  home_score: number | null; away_score: number | null
  status: string; kickoff: string | null; venue?: string | null; advances?: string | null
}

/**
 * Mantém os jogos sincronizados em tempo real via Supabase Realtime.
 * `initial` vem do servidor (sem flash); cada UPDATE no placar entra na hora.
 */
export function useLiveMatches(initial: LiveMatch[]): LiveMatch[] {
  const [matches, setMatches] = useState<LiveMatch[]>(initial)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('matches-live-' + Math.random().toString(36).slice(2, 9))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        (payload) => {
          const row = payload.new as LiveMatch
          if (!row?.id) return
          setMatches((prev) => {
            const i = prev.findIndex((m) => m.id === row.id)
            if (i < 0) return [...prev, row]
            const copy = prev.slice()
            copy[i] = { ...copy[i], ...row }
            return copy
          })
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return matches
}
