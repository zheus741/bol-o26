'use client'

import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/', label: 'Mata-mata', icon: 'M6 4v6h6M6 20v-6h6M12 7h6M12 17h6' },
  { href: '/grupos', label: 'Grupos', icon: 'M4 5h16v14H4zM4 10h16M10 10v9' },
  { href: '/palpites', label: 'Palpites', icon: 'M4 6h16M4 12h16M4 18h10' },
  { href: '/ranking', label: 'Ranking', icon: 'M6 20V10M12 20V4M18 20v-7' },
  { href: '/perfil', label: 'Perfil', icon: 'M12 12a4 4 0 100-8 4 4 0 000 8ZM4 21c0-4 4-6 8-6s8 2 8 6' },
]

function active(path: string, href: string) {
  return href === '/' ? path === '/' : path.startsWith(href)
}

export function TopNav() {
  const path = usePathname()
  return (
    <nav className="nav">
      {LINKS.map((l) => (
        <a key={l.href} href={l.href} className={active(path, l.href) ? 'on' : ''}>{l.label}</a>
      ))}
    </nav>
  )
}

export function BottomNav() {
  const path = usePathname()
  return (
    <nav className="bottomnav">
      {LINKS.map((l) => (
        <a key={l.href} href={l.href} className={active(path, l.href) ? 'on' : ''}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d={l.icon} /></svg>
          {l.label}
        </a>
      ))}
    </nav>
  )
}
