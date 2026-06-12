import type { Metadata } from 'next'
import './globals.css'
import { TopNav, BottomNav } from '@/components/Nav'

export const metadata: Metadata = {
  title: 'Bolão 26 — Copa do Mundo FIFA 2026',
  description: 'Bolão da Copa: palpites, classificação e chaveamento ao vivo.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <header className="app-h">
          <div className="wrap">
            <a className="brand" href="/" style={{ textDecoration: 'none', color: '#fff' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="mark" src="/assets/logo.svg" alt="FIFA World Cup 26" />
              <div><h1>Bolão 26</h1><small>We Are 26</small></div>
            </a>
            <TopNav />
          </div>
        </header>
        {children}
        <BottomNav />
      </body>
    </html>
  )
}
