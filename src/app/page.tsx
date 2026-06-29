import { NAMES } from '@/lib/tournament/data'
import { isSupabaseConfigured } from '@/lib/supabase/server'
import { loadMatches } from '@/lib/matches'
import { maybeSelfHeal } from '@/lib/tournament/server-sync'
import { LiveCarousel } from '@/components/LiveCarousel'
import { Bracket } from '@/components/Bracket'

export const dynamic = 'force-dynamic'

export default async function Home() {
  let matches = await loadMatches()
  if (await maybeSelfHeal(matches)) matches = await loadMatches()
  const configured = isSupabaseConfigured()

  const final = matches.find((m) => m.id === 104)
  const champion = final?.status === 'encerrado' ? (final.advances as string | null) : null
  const koPlayed = matches.filter((m) => m.fase !== 'grupos' && m.status === 'encerrado').length

  return (
    <>
      {!configured && (
        <div className="setup"><div className="wrap">⚙️ Modo demo — configure o Supabase em <code>.env.local</code>.</div></div>
      )}

      {/* HERO — fase final / rumo à taça */}
      <section className="hero">
        <div className="hero-amplify" aria-hidden />
        <div className="wrap hero-in">
          <div className="hero-copy">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="hero-weare" src="/assets/weare26.svg" alt="We Are 26" />
            {champion ? (
              <>
                <p className="hero-kicker reveal">Temos campeão</p>
                <h1 className="hero-title anton reveal" style={{ animationDelay: '80ms' }}>{NAMES[champion] ?? champion}<span className="hero-cup">🏆</span></h1>
                <p className="hero-sub reveal" style={{ animationDelay: '160ms' }}>Campeão da Copa do Mundo FIFA 26™</p>
              </>
            ) : (
              <>
                <p className="hero-kicker reveal">Fase final</p>
                <h1 className="hero-title anton reveal" style={{ animationDelay: '80ms' }}>Rumo<br />à taça</h1>
                <p className="hero-sub reveal" style={{ animationDelay: '160ms' }}>O mata-mata começou — {koPlayed} de 32 jogos decididos. Crava teus palpites até cada apito.</p>
              </>
            )}
            <a href="/palpites" className="hero-cta reveal" style={{ animationDelay: '240ms' }}>Dar meus palpites</a>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="hero-trofeu" src="/assets/trofeu.svg" alt="Taça da Copa do Mundo FIFA 26" />
        </div>
      </section>

      <LiveCarousel initial={matches} />

      <main className="wrap">
        <h2 className="day reveal">Caminho até a taça</h2>
      </main>
      <Bracket matches={matches} />

      <main className="wrap">
        <p style={{ color: '#9a98ba', fontSize: 12, fontWeight: 600, margin: '20px 0 40px' }}>
          Placar exato = 3 pts · só o vencedor = 1 pt · no mata-mata, empate exige acertar quem passa nos pênaltis.{' '}
          <a href="/grupos" style={{ color: 'var(--blue)' }}>Ver fase de grupos →</a>
        </p>
      </main>
    </>
  )
}
