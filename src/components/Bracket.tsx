import { NAMES, flagUrl } from '@/lib/tournament/data'
import { resolveSlot, solveThirds, type MatchLite } from '@/lib/tournament/standings'

// estrutura simétrica (do PDF/print): metade esquerda flui →, final no centro, direita ←
const LEFT = { r32: [74, 77, 73, 75, 83, 84, 81, 82], r16: [89, 90, 93, 94], qf: [97, 98], sf: [101] }
const RIGHT = { sf: [102], qf: [99, 100], r16: [91, 92, 95, 96], r32: [76, 78, 79, 80, 86, 88, 85, 87] }
const COLS_L: [string, number[]][] = [['16-avos', LEFT.r32], ['Oitavas', LEFT.r16], ['Quartas', LEFT.qf], ['Semi', LEFT.sf]]
const COLS_R: [string, number[]][] = [['Semi', RIGHT.sf], ['Quartas', RIGHT.qf], ['Oitavas', RIGHT.r16], ['16-avos', RIGHT.r32]]

const brt = (iso: string | null | undefined) => iso ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) : ''

type BracketMatch = MatchLite & { home_slot?: string; away_slot?: string; kickoff?: string | null }

export function Bracket({ matches }: { matches: BracketMatch[] }) {
  const byId = new Map(matches.map((m) => [m.id, m]))
  const thirds = solveThirds(matches)

  // time resolvido do lado: code real (openfootball) > slot de grupo (1A/3X via classificação) > pendente
  function resolveSide(m: BracketMatch | undefined, side: 'home' | 'away'): string | null {
    if (!m) return null
    const code = side === 'home' ? m.home_code : m.away_code
    if (code) return code
    const slot = (side === 'home' ? m.home_slot : m.away_slot) ?? ''
    return /^[123]/.test(slot) ? resolveSlot(slot, matches, thirds) : null
  }
  function Slot({ m, side, score, done }: { m: BracketMatch | undefined; side: 'home' | 'away'; score: number | null | undefined; done: boolean }) {
    const code = resolveSide(m, side)
    const slot = (side === 'home' ? m?.home_slot : m?.away_slot) ?? '?'
    const f = flagUrl(code)
    return (
      <div className="bk-slot">
        {f
          // eslint-disable-next-line @next/next/no-img-element
          ? <img className="bk-flag" src={f} alt="" loading="lazy" decoding="async" />
          : <span className="bk-flag ph" />}
        {code ? <b>{code}</b> : <i>{slot}</i>}
        {done && <span className="bk-sc">{score}</span>}
      </div>
    )
  }
  function Cell({ id }: { id: number }) {
    const m = byId.get(id)
    const done = !!m && m.status === 'encerrado' && m.home_score != null
    return (
      <div className="bk-cell">
        <div className="bk-meta"><span>J{id}</span><span>{done ? 'FIM' : brt(m?.kickoff)}</span></div>
        <Slot m={m} side="home" score={m?.home_score} done={done} />
        <Slot m={m} side="away" score={m?.away_score} done={done} />
      </div>
    )
  }
  const Round = ({ label, ids }: { label: string; ids: number[] }) => (
    <div className="bk-round">
      <div className="bk-h">{label}</div>
      <div className="bk-cells">{ids.map((id) => <Cell key={id} id={id} />)}</div>
    </div>
  )

  return (
    <div className="bk-scroll">
      <div className="bk2">
        <div className="bk-side">{COLS_L.map(([l, ids]) => <Round key={'l' + l} label={l} ids={ids} />)}</div>
        <div className="bk-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="bk-trofeu" src="/assets/trofeu.svg" alt="" />
          <div className="bk-round"><div className="bk-h">Final</div><div className="bk-cells"><Cell id={104} /></div></div>
          <div className="bk-round bk-third"><div className="bk-h">3º lugar</div><div className="bk-cells"><Cell id={103} /></div></div>
        </div>
        <div className="bk-side">{COLS_R.map(([l, ids]) => <Round key={'r' + l} label={l} ids={ids} />)}</div>
      </div>
    </div>
  )
}
