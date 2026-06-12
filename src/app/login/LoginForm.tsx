'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type State = 'idle' | 'sending' | 'sent' | 'error'

export function LoginForm({ configured, next }: { configured: boolean; next: string }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [msg, setMsg] = useState('')

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!configured) { setState('error'); setMsg('App em modo demo — configure o Supabase no .env.local.'); return }
    setState('sending'); setMsg('')
    const supabase = createClient()
    const redirect = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } })
    if (error) { setState('error'); setMsg(error.message) }
    else { setState('sent'); setMsg('Link enviado! Confere seu e-mail pra entrar.') }
  }

  async function google() {
    if (!configured) { setState('error'); setMsg('App em modo demo — configure o Supabase no .env.local.'); return }
    setState('sending')
    const supabase = createClient()
    const redirect = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirect } })
    if (error) { setState('error'); setMsg(error.message) }
  }

  return (
    <div className="login-card">
      <button className="btn-google" onClick={google} disabled={state === 'sending'}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
          <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.9 1.5l2.7-2.6C16.9 1.7 14.7.8 12 .8 6.9.8 2.8 4.9 2.8 12s4.1 11.2 9.2 11.2c5.3 0 8.8-3.7 8.8-9 0-.6-.1-1.1-.2-1.6H12z"/>
        </svg>
        Entrar com Google
      </button>

      <div className="login-sep"><span>ou</span></div>

      <form onSubmit={sendMagicLink}>
        <label className="login-label">E-mail</label>
        <input
          className="login-input" type="email" required placeholder="voce@email.com"
          value={email} onChange={(e) => setEmail(e.target.value)} disabled={state === 'sending' || state === 'sent'}
          inputMode="email" autoComplete="email"
        />
        <button className="btn-primary" type="submit" disabled={state === 'sending' || state === 'sent'}>
          {state === 'sending' ? <span className="btn-spin" aria-hidden /> : null}
          {state === 'sent' ? 'Link enviado ✓' : 'Receber link mágico'}
        </button>
      </form>

      {msg && <p className={`login-msg ${state === 'error' ? 'err' : 'ok'}`}>{msg}</p>}
    </div>
  )
}
