'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function AccountChip() {
  const [user, setUser] = useState<{ name: string } | null | undefined>(undefined)

  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data }) => {
      const u = data.user
      setUser(u ? { name: (u.user_metadata?.name as string) || u.email?.split('@')[0] || 'Você' } : null)
    })
  }, [])

  async function sair() {
    const sb = createClient()
    await sb.auth.signOut()
    window.location.href = '/'
  }

  if (user === undefined) return <div className="acct" aria-hidden />
  if (!user) return <div className="acct"><a className="enter" href="/login">Entrar</a></div>

  return (
    <div className="acct">
      <a className="who" href="/perfil" aria-label="Meu perfil">
        <span className="av">{user.name.slice(0, 2).toUpperCase()}</span>
        <span className="nm">{user.name}</span>
      </a>
      <button className="out" onClick={sair}>Sair</button>
    </div>
  )
}
