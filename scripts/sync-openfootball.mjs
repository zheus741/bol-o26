// Sincroniza jogos/placares reais do openfootball -> seed.sql + banco Supabase.
// Rodar: node scripts/sync-openfootball.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = 'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'

const NAMES = {MEX:'México',RSA:'África do Sul',KOR:'Coreia do Sul',CZE:'Tchéquia',CAN:'Canadá',BIH:'Bósnia',QAT:'Catar',SUI:'Suíça',BRA:'Brasil',MAR:'Marrocos',HAI:'Haiti',SCO:'Escócia',USA:'EUA',PAR:'Paraguai',AUS:'Austrália',TUR:'Turquia',GER:'Alemanha',CUW:'Curaçao',CIV:'Costa do Marfim',ECU:'Equador',NED:'Holanda',JPN:'Japão',SWE:'Suécia',TUN:'Tunísia',BEL:'Bélgica',EGY:'Egito',IRN:'Irã',NZL:'Nova Zelândia',ESP:'Espanha',CPV:'Cabo Verde',KSA:'Arábia Saudita',URU:'Uruguai',FRA:'França',SEN:'Senegal',IRQ:'Iraque',NOR:'Noruega',ARG:'Argentina',ALG:'Argélia',AUT:'Áustria',JOR:'Jordânia',POR:'Portugal',COD:'Congo DR',UZB:'Uzbequistão',COL:'Colômbia',ENG:'Inglaterra',CRO:'Croácia',GHA:'Gana',PAN:'Panamá'}
const GROUPS = {A:['MEX','RSA','KOR','CZE'],B:['CAN','BIH','QAT','SUI'],C:['BRA','MAR','HAI','SCO'],D:['USA','PAR','AUS','TUR'],E:['GER','CUW','CIV','ECU'],F:['NED','JPN','SWE','TUN'],G:['BEL','EGY','IRN','NZL'],H:['ESP','CPV','KSA','URU'],I:['FRA','SEN','IRQ','NOR'],J:['ARG','ALG','AUT','JOR'],K:['POR','COD','UZB','COL'],L:['ENG','CRO','GHA','PAN']}
const RR = [[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]]
const BR = {r32:{73:['2A','2B'],74:['1E','3ABCDF'],75:['1F','2C'],76:['1C','2F'],77:['1I','3CDFGH'],78:['2E','2I'],79:['1A','3CEFHI'],80:['1L','3EHIJK'],81:['1D','3BEFIJ'],82:['1G','3AEHIJ'],83:['2K','2L'],84:['1H','2J'],85:['1B','3EFGIJ'],86:['1J','2H'],87:['1K','3DEIJL'],88:['2D','2G']},r16:{89:['W74','W77'],90:['W73','W75'],91:['W76','W78'],92:['W79','W80'],93:['W83','W84'],94:['W81','W82'],95:['W86','W88'],96:['W85','W87']},qf:{97:['W89','W90'],98:['W93','W94'],99:['W91','W92'],100:['W95','W96']},sf:{101:['W97','W98'],102:['W99','W100']},terceiro:{103:['L101','L102']},final:{104:['W101','W102']}}
const NAME2CODE = {'Mexico':'MEX','South Africa':'RSA','South Korea':'KOR','Czech Republic':'CZE','Canada':'CAN','Bosnia & Herzegovina':'BIH','Qatar':'QAT','Switzerland':'SUI','Brazil':'BRA','Morocco':'MAR','Haiti':'HAI','Scotland':'SCO','USA':'USA','Paraguay':'PAR','Australia':'AUS','Turkey':'TUR','Germany':'GER','Curaçao':'CUW','Ivory Coast':'CIV','Ecuador':'ECU','Netherlands':'NED','Japan':'JPN','Sweden':'SWE','Tunisia':'TUN','Belgium':'BEL','Egypt':'EGY','Iran':'IRN','New Zealand':'NZL','Spain':'ESP','Cape Verde':'CPV','Saudi Arabia':'KSA','Uruguay':'URU','France':'FRA','Senegal':'SEN','Iraq':'IRQ','Norway':'NOR','Argentina':'ARG','Algeria':'ALG','Austria':'AUT','Jordan':'JOR','Portugal':'POR','DR Congo':'COD','Uzbekistan':'UZB','Colombia':'COL','England':'ENG','Croatia':'CRO','Ghana':'GHA','Panama':'PAN'}
const FASE = {'Round of 32':'r32','Round of 16':'r16','Quarter-final':'qf','Semi-final':'sf','Match for third place':'terceiro','Final':'final'}

const q = (s) => s == null ? 'null' : "'" + String(s).replace(/'/g, "''") + "'"
const norm = (slot) => slot.includes('/') ? '3' + slot.slice(1).replace(/\//g, '') : slot
const pairKey = (a, b) => [a, b].sort().join('|')
const toUTC = (date, time) => {
  const mt = time.match(/(\d{1,2}):(\d{2})\s*UTC([+-]\d{1,2})/)
  if (!mt) return `${date}T19:00:00.000Z`
  const off = `${mt[3] < 0 ? '-' : '+'}${String(Math.abs(+mt[3])).padStart(2, '0')}:00`
  return new Date(`${date}T${mt[1].padStart(2, '0')}:${mt[2]}:00${off}`).toISOString()
}

// índice dos jogos de grupo (id 1..72) por grupo+par
const groupIdx = {}
let n = 1
for (const g of Object.keys(GROUPS)) for (const [i, j] of RR) groupIdx[g + ':' + pairKey(GROUPS[g][i], GROUPS[g][j])] = n++
// índice do mata-mata por par de slots
const koIdx = {}
for (const fase of Object.keys(BR)) for (const [id, [a, b]] of Object.entries(BR[fase])) koIdx[pairKey(a, b)] = { id: +id, fase }

const data = await (await fetch(SRC)).json()
const rows = []
let jogados = 0
for (const m of data.matches) {
  const ft = m.score?.ft
  const kickoff = toUTC(m.date, m.time)
  if (m.round.startsWith('Matchday')) {
    const g = (m.group || '').replace('Group ', '').trim()
    const h = NAME2CODE[m.team1], a = NAME2CODE[m.team2]
    if (!g || !h || !a) { console.warn('grupo não mapeado:', m.team1, m.team2); continue }
    const id = groupIdx[g + ':' + pairKey(h, a)]
    if (!id) { console.warn('id grupo não achado:', g, h, a); continue }
    rows.push({ id, fase: 'grupos', grupo: g, home_slot: h, away_slot: a, home_code: h, away_code: a,
      kickoff, venue: m.ground || null, home_score: ft ? ft[0] : null, away_score: ft ? ft[1] : null, status: ft ? 'encerrado' : 'agendado' })
    if (ft) jogados++
  } else {
    const s1 = norm(m.team1), s2 = norm(m.team2)
    const hit = koIdx[pairKey(s1, s2)]
    if (!hit) { console.warn('KO não mapeado:', m.team1, m.team2); continue }
    rows.push({ id: hit.id, fase: hit.fase, grupo: null, home_slot: s1, away_slot: s2, home_code: null, away_code: null,
      kickoff, venue: m.ground || null, home_score: ft ? ft[0] : null, away_score: ft ? ft[1] : null, status: ft ? 'encerrado' : 'agendado' })
    if (ft) jogados++
  }
}
rows.sort((a, b) => a.id - b.id)
console.log(`montados ${rows.length} jogos · ${jogados} já jogados`)

// 1) regenera seed.sql com dados reais
const L = []
L.push('-- SEED Bolão 26 — dados REAIS do openfootball (datas em UTC; exibir em BRT).')
L.push('insert into public.teams (code,nome,grupo) values')
L.push(Object.entries(GROUPS).flatMap(([g, cs]) => cs.map((c) => `(${q(c)},${q(NAMES[c])},${q(g)})`)).join(',\n')
  + '\non conflict (code) do update set nome=excluded.nome, grupo=excluded.grupo;')
L.push('')
L.push('insert into public.matches (id,fase,grupo,home_slot,away_slot,home_code,away_code,kickoff,home_score,away_score,status) values')
L.push(rows.map((r) => `(${r.id},${q(r.fase)},${q(r.grupo)},${q(r.home_slot)},${q(r.away_slot)},${q(r.home_code)},${q(r.away_code)},${q(r.kickoff)},${r.home_score ?? 'null'},${r.away_score ?? 'null'},${q(r.status)})`).join(',\n')
  + '\non conflict (id) do update set fase=excluded.fase,grupo=excluded.grupo,home_slot=excluded.home_slot,away_slot=excluded.away_slot,home_code=excluded.home_code,away_code=excluded.away_code,kickoff=excluded.kickoff,home_score=excluded.home_score,away_score=excluded.away_score,status=excluded.status;')
writeFileSync(join(ROOT, 'supabase', 'seed.sql'), L.join('\n'))
console.log('seed.sql regenerado com dados reais.')

// 2) upsert no banco — env de process.env (CI) ou .env.local (local)
let env = { ...process.env }
try {
  const local = Object.fromEntries(readFileSync(join(ROOT, '.env.local'), 'utf8').split('\n')
    .map((l) => l.trim()).filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] }))
  env = { ...local, ...env } // process.env tem prioridade (CI)
} catch { /* sem .env.local (CI) — usa só process.env */ }
const url = env.NEXT_PUBLIC_SUPABASE_URL, key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || url.includes('SEU-PROJECT') || !key) { console.log('Supabase não configurado — só gerei o seed.sql.'); process.exit(0) }

const sb = createClient(url, key, { auth: { persistSession: false } })
const teams = Object.entries(GROUPS).flatMap(([g, cs]) => cs.map((c) => ({ code: c, nome: NAMES[c], grupo: g })))
const t = await sb.from('teams').upsert(teams, { onConflict: 'code' })
if (t.error) { console.error('ERRO upsert teams:', t.error.message); console.error('-> rode supabase/setup_completo.sql primeiro.'); process.exit(1) }
let mm = await sb.from('matches').upsert(rows, { onConflict: 'id' })
if (mm.error && /venue/i.test(mm.error.message)) {
  console.warn('coluna venue ausente — sincronizando sem venue (rode o ALTER p/ ativar local do jogo).')
  const semVenue = rows.map(({ venue, ...r }) => r) // eslint-disable-line no-unused-vars
  mm = await sb.from('matches').upsert(semVenue, { onConflict: 'id' })
}
if (mm.error) { console.error('ERRO upsert matches:', mm.error.message); process.exit(1) }
console.log(`✅ banco sincronizado: ${teams.length} times, ${rows.length} jogos.`)
