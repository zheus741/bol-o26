// ============================================================================
// Motor de classificação e chaveamento (puro — opera sobre as linhas de jogo).
// Desempate FIFA completo + solver dos 8 melhores 3ºs por restrição.
// Lê home_code/away_code/scores reais (orientação correta de cada jogo).
// ============================================================================
import { GROUPS, NAMES, THIRD_SLOTS } from './data'

export type MatchLite = {
  id: number; grupo: string | null
  home_code: string | null; away_code: string | null
  home_score: number | null; away_score: number | null
  status: string
}

export type TeamRow = {
  t: string; J: number; V: number; E: number; D: number
  GP: number; GC: number; Pts: number; SG: number; fair: number
  vs: Record<string, { gf: number; ga: number; pt: number }>
}

const isEncerrado = (m: MatchLite) =>
  m.status === 'encerrado' && m.home_score != null && m.away_score != null && m.home_code && m.away_code

function computeRows(g: string, matches: MatchLite[]): { rows: Record<string, TeamRow>; played: number } {
  const teams = GROUPS[g]
  const r: Record<string, TeamRow> = Object.fromEntries(
    teams.map((t) => [t, { t, J:0,V:0,E:0,D:0,GP:0,GC:0,Pts:0,SG:0,fair:0,vs:{} }]),
  )
  let played = 0
  for (const m of matches) {
    if (m.grupo !== g || !isEncerrado(m)) continue
    const a = m.home_code!, b = m.away_code!, ga = m.home_score!, gb = m.away_score!
    if (!r[a] || !r[b]) continue
    played++
    r[a].GP += ga; r[a].GC += gb; r[b].GP += gb; r[b].GC += ga
    r[a].vs[b] = { gf: ga, ga: gb, pt: ga > gb ? 3 : ga === gb ? 1 : 0 }
    r[b].vs[a] = { gf: gb, ga: ga, pt: gb > ga ? 3 : ga === gb ? 1 : 0 }
    if (ga > gb) { r[a].V++; r[b].D++; r[a].Pts += 3 }
    else if (gb > ga) { r[b].V++; r[a].D++; r[b].Pts += 3 }
    else { r[a].E++; r[b].E++; r[a].Pts++; r[b].Pts++ }
  }
  for (const x of Object.values(r)) { x.J = x.V + x.E + x.D; x.SG = x.GP - x.GC }
  return { rows: r, played }
}

function headToHead(set: TeamRow[]): TeamRow[] {
  return set
    .map((x) => {
      let pt = 0, gf = 0, ga = 0
      for (const y of set) if (y !== x && x.vs[y.t]) { pt += x.vs[y.t].pt; gf += x.vs[y.t].gf; ga += x.vs[y.t].ga }
      return { x, pt, gd: gf - ga, gf }
    })
    .sort((p, q) => q.pt - p.pt || q.gd - p.gd || q.gf - p.gf
      || p.x.fair - q.x.fair || NAMES[p.x.t].localeCompare(NAMES[q.x.t]))
    .map((o) => o.x)
}

export type Standing = { sorted: TeamRow[]; done: boolean }

export function standings(g: string, matches: MatchLite[]): Standing {
  const { rows: rowMap, played } = computeRows(g, matches)
  const rows = Object.values(rowMap)
  rows.sort((a, b) => b.Pts - a.Pts || b.SG - a.SG || b.GP - a.GP)
  const out: TeamRow[] = []
  let i = 0
  while (i < rows.length) {
    let j = i + 1
    while (j < rows.length && rows[j].Pts === rows[i].Pts && rows[j].SG === rows[i].SG && rows[j].GP === rows[i].GP) j++
    const cluster = rows.slice(i, j)
    out.push(...(cluster.length > 1 ? headToHead(cluster) : cluster))
    i = j
  }
  return { sorted: out, done: played === 6 }
}

export function rankedThirds(matches: MatchLite[]) {
  const thirds = Object.keys(GROUPS)
    .map((g) => { const s = standings(g, matches); return { g, row: s.sorted[2], done: s.done } })
    .filter((t) => t.done && t.row)
    .map((t) => ({ g: t.g, ...t.row }))
  thirds.sort((a, b) => b.Pts - a.Pts || b.SG - a.SG || b.GP - a.GP
    || a.fair - b.fair || NAMES[a.t].localeCompare(NAMES[b.t]))
  return thirds.slice(0, 8)
}

export function solveThirds(matches: MatchLite[]): Record<string, string> {
  const qualifying = rankedThirds(matches).map((x) => x.g)
  if (qualifying.length < 8) return {}
  const slots = Object.keys(THIRD_SLOTS)
  const assign: Record<string, string> = {}
  const bt = (k: number, used: Set<string>): boolean => {
    if (k === slots.length) return true
    for (const g of qualifying) {
      if (!used.has(g) && THIRD_SLOTS[slots[k]].includes(g)) {
        assign[slots[k]] = g; used.add(g)
        if (bt(k + 1, used)) return true
        used.delete(g); delete assign[slots[k]]
      }
    }
    return false
  }
  bt(0, new Set())
  return assign
}

// resolve "1A" | "2B" | "3CEFHI" -> code do time (ou null se indefinido)
export function resolveSlot(slot: string, matches: MatchLite[], thirds = solveThirds(matches)): string | null {
  if (/^[12]/.test(slot)) {
    const s = standings(slot[1], matches)
    return s.done ? s.sorted[+slot[0] - 1].t : null
  }
  if (/^3/.test(slot)) {
    const g = thirds[slot]
    return g ? standings(g, matches).sorted[2].t : null
  }
  return null // W##/L## dependem do mata-mata (resolvido quando os jogos saírem)
}
