// Gera supabase/seed.sql a partir da data oficial. Rodar: node scripts/gen-seed.mjs
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const NAMES = {MEX:'México',RSA:'África do Sul',KOR:'Coreia do Sul',CZE:'Tchéquia',CAN:'Canadá',BIH:'Bósnia',QAT:'Catar',SUI:'Suíça',BRA:'Brasil',MAR:'Marrocos',HAI:'Haiti',SCO:'Escócia',USA:'EUA',PAR:'Paraguai',AUS:'Austrália',TUR:'Turquia',GER:'Alemanha',CUW:'Curaçao',CIV:'Costa do Marfim',ECU:'Equador',NED:'Holanda',JPN:'Japão',SWE:'Suécia',TUN:'Tunísia',BEL:'Bélgica',EGY:'Egito',IRN:'Irã',NZL:'Nova Zelândia',ESP:'Espanha',CPV:'Cabo Verde',KSA:'Arábia Saudita',URU:'Uruguai',FRA:'França',SEN:'Senegal',IRQ:'Iraque',NOR:'Noruega',ARG:'Argentina',ALG:'Argélia',AUT:'Áustria',JOR:'Jordânia',POR:'Portugal',COD:'Congo DR',UZB:'Uzbequistão',COL:'Colômbia',ENG:'Inglaterra',CRO:'Croácia',GHA:'Gana',PAN:'Panamá'}
const GROUPS = {A:['MEX','RSA','KOR','CZE'],B:['CAN','BIH','QAT','SUI'],C:['BRA','MAR','HAI','SCO'],D:['USA','PAR','AUS','TUR'],E:['GER','CUW','CIV','ECU'],F:['NED','JPN','SWE','TUN'],G:['BEL','EGY','IRN','NZL'],H:['ESP','CPV','KSA','URU'],I:['FRA','SEN','IRQ','NOR'],J:['ARG','ALG','AUT','JOR'],K:['POR','COD','UZB','COL'],L:['ENG','CRO','GHA','PAN']}
const RR = [[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]]
const BR = {r32:{73:['2A','2B'],74:['1E','3ABCDF'],75:['1F','2C'],76:['1C','2F'],77:['1I','3CDFGH'],78:['2E','2I'],79:['1A','3CEFHI'],80:['1L','3EHIJK'],81:['1D','3BEFIJ'],82:['1G','3AEHIJ'],83:['2K','2L'],84:['1H','2J'],85:['1B','3EFGIJ'],86:['1J','2H'],87:['1K','3DEIJL'],88:['2D','2G']},r16:{89:['W74','W77'],90:['W73','W75'],91:['W76','W78'],92:['W79','W80'],93:['W83','W84'],94:['W81','W82'],95:['W86','W88'],96:['W85','W87']},qf:{97:['W89','W90'],98:['W93','W94'],99:['W91','W92'],100:['W95','W96']},sf:{101:['W97','W98'],102:['W99','W100']},terceiro:{103:['L101','L102']},final:{104:['W101','W102']}}
const koDate = {r32:'2026-06-28',r16:'2026-07-04',qf:'2026-07-09',sf:'2026-07-14',terceiro:'2026-07-18',final:'2026-07-19'}

const q = (s) => "'" + String(s).replace(/'/g, "''") + "'"
const day = (off) => { const d = new Date(Date.UTC(2026, 5, 11)); d.setUTCDate(d.getUTCDate() + off); return d.toISOString().slice(0, 10) }

const L = []
L.push('-- SEED Bolão 26 — gerado de data oficial (PDF FWC2026).')
L.push('-- Datas/horários PROVISÓRIOS (UTC); substituir pelo sync openfootball (exibir em BRT).')
L.push('')
L.push('insert into public.teams (code,nome,grupo) values')
const tv = []
for (const g of Object.keys(GROUPS)) for (const c of GROUPS[g]) tv.push(`(${q(c)},${q(NAMES[c])},${q(g)})`)
L.push(tv.join(',\n') + '\non conflict (code) do update set nome=excluded.nome, grupo=excluded.grupo;')
L.push('')
L.push('insert into public.matches (id,fase,grupo,home_slot,away_slot,home_code,away_code,kickoff) values')
const mv = []
let n = 1
for (const g of Object.keys(GROUPS)) {
  for (const [i, j] of RR) {
    const id = n++, h = GROUPS[g][i], a = GROUPS[g][j]
    const ko = `${day(Math.floor((id - 1) / 6))}T19:00:00Z`
    mv.push(`(${id},'grupos',${q(g)},${q(h)},${q(a)},${q(h)},${q(a)},${q(ko)})`)
  }
}
for (const fase of ['r32','r16','qf','sf','terceiro','final']) {
  for (const [id, [h, a]] of Object.entries(BR[fase])) {
    mv.push(`(${id},${q(fase)},null,${q(h)},${q(a)},null,null,${q(koDate[fase] + 'T19:00:00Z')})`)
  }
}
L.push(mv.join(',\n') + '\non conflict (id) do update set fase=excluded.fase, grupo=excluded.grupo, home_slot=excluded.home_slot, away_slot=excluded.away_slot, kickoff=excluded.kickoff;')
L.push('')

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'seed.sql')
writeFileSync(out, L.join('\n'))
console.log('seed.sql OK:', tv.length, 'times,', mv.length, 'jogos ->', out)
