import { isSupabaseConfigured } from '@/lib/supabase/server'
import { LoginForm } from './LoginForm'

export const dynamic = 'force-dynamic'

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = '/palpites' } = await searchParams
  const configured = isSupabaseConfigured()

  return (
    <main className="login-wrap">
      <div className="amplify-bg" aria-hidden />
      <div className="login-inner">
        <div className="login-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/logo.svg" alt="" className="login-logo" />
          <h1 className="anton">Bolão 26</h1>
          <p>Dá teu palpite. Crava o placar. Lidera o ranking.</p>
        </div>
        {!configured && (
          <div className="login-demo">⚙️ Modo demo — configure o Supabase para ativar o login.</div>
        )}
        <LoginForm configured={configured} next={next} />
        <p className="login-foot">Placar exato = 3 pts · só o vencedor = 1 pt</p>
      </div>
    </main>
  )
}
