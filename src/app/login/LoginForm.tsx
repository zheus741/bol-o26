'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Mode = 'entrar' | 'criar'

export function LoginForm({ configured, next }: { configured: boolean; next: string }) {
  const [mode, setMode] = useState<Mode>('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ t: 'err' | 'ok'; m: string } | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!configured) { setMsg({ t: 'err', m: 'App em modo demo — configure o Supabase.' }); return }
    setBusy(true); setMsg(null)
    const supabase = createClient()
    if (mode === 'criar') {
      const { data, error } = await supabase.auth.signUp({
        email, password: senha, options: { data: { name: nome } },
      })
      if (error) { setBusy(false); setMsg({ t: 'err', m: error.message }); return }
      if (data.session) { window.location.href = next; return } // confirmação desligada
      setBusy(false); setMsg({ t: 'ok', m: 'Conta criada! Confirme pelo link no seu e-mail e depois entre.' })
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
      if (error) { setBusy(false); setMsg({ t: 'err', m: 'E-mail ou senha incorretos.' }); return }
      window.location.href = next
    }
  }

  async function google() {
    if (!configured) { setMsg({ t: 'err', m: 'App em modo demo — configure o Supabase.' }); return }
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    })
    if (error) { setBusy(false); setMsg({ t: 'err', m: error.message }) }
  }

  return (
    <div className="login-card">
      <div className="login-tabs">
        <button className={mode === 'entrar' ? 'on' : ''} onClick={() => setMode('entrar')} type="button">Entrar</button>
        <button className={mode === 'criar' ? 'on' : ''} onClick={() => setMode('criar')} type="button">Criar conta</button>
      </div>

      <button className="btn-google" onClick={google} disabled={busy} type="button">
        <GoogleG /> Continuar com Google
      </button>

      <div className="login-sep"><span>ou</span></div>

      <form onSubmit={submit}>
        {mode === 'criar' && (
          <>
            <label className="login-label">Nome</label>
            <input className="login-input" required value={nome} onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome" autoComplete="name" disabled={busy} />
          </>
        )}
        <label className="login-label">E-mail</label>
        <input className="login-input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@email.com" inputMode="email" autoComplete="email" disabled={busy} />
        <label className="login-label">Senha</label>
        <div className="pw-wrap">
          <input className="login-input" type={showPw ? 'text' : 'password'} required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)}
            placeholder="••••••" autoComplete={mode === 'criar' ? 'new-password' : 'current-password'} disabled={busy} />
          <button type="button" className="pw-toggle" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'}>
            {showPw ? 'ocultar' : 'mostrar'}
          </button>
        </div>
        <button className="btn-primary" type="submit" disabled={busy}>
          {busy ? <span className="btn-spin" /> : mode === 'criar' ? 'Criar conta' : 'Entrar'}
        </button>
      </form>

      {msg && <p className={`login-msg ${msg.t}`}>{msg.m}</p>}
    </div>
  )
}

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 5.1 29.4 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.6 20-21 0-1.2-.1-2.3-.4-3.5Z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 5.1 29.4 3 24 3 16 3 9.1 7.6 6.3 14.7Z" />
      <path fill="#4CAF50" d="M24 45c5.2 0 10-2 13.6-5.2l-6.3-5.2c-2 1.5-4.6 2.4-7.3 2.4-5.3 0-9.7-3.6-11.3-8.4l-6.5 5C9 40.3 15.9 45 24 45Z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.6l6.3 5.2C41.4 36 44 30.6 44 24c0-1.2-.1-2.3-.4-3.5Z" />
    </svg>
  )
}
