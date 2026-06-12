// ============================================================================
// Dados oficiais FWC2026 (fonte: PDF FIFA Match Schedule v17)
// Fonte única da verdade da estrutura do torneio — usada no seed e no app.
// ============================================================================

export const NAMES: Record<string, string> = {
  MEX:'México',RSA:'África do Sul',KOR:'Coreia do Sul',CZE:'Tchéquia',
  CAN:'Canadá',BIH:'Bósnia',QAT:'Catar',SUI:'Suíça',
  BRA:'Brasil',MAR:'Marrocos',HAI:'Haiti',SCO:'Escócia',
  USA:'EUA',PAR:'Paraguai',AUS:'Austrália',TUR:'Turquia',
  GER:'Alemanha',CUW:'Curaçao',CIV:'Costa do Marfim',ECU:'Equador',
  NED:'Holanda',JPN:'Japão',SWE:'Suécia',TUN:'Tunísia',
  BEL:'Bélgica',EGY:'Egito',IRN:'Irã',NZL:'Nova Zelândia',
  ESP:'Espanha',CPV:'Cabo Verde',KSA:'Arábia Saudita',URU:'Uruguai',
  FRA:'França',SEN:'Senegal',IRQ:'Iraque',NOR:'Noruega',
  ARG:'Argentina',ALG:'Argélia',AUT:'Áustria',JOR:'Jordânia',
  POR:'Portugal',COD:'Congo DR',UZB:'Uzbequistão',COL:'Colômbia',
  ENG:'Inglaterra',CRO:'Croácia',GHA:'Gana',PAN:'Panamá',
}

// código FIFA -> slug flagcdn (bandeiras via https://flagcdn.com/<slug>.svg)
export const FLAG: Record<string, string> = {
  MEX:'mx',RSA:'za',KOR:'kr',CZE:'cz', CAN:'ca',BIH:'ba',QAT:'qa',SUI:'ch',
  BRA:'br',MAR:'ma',HAI:'ht',SCO:'gb-sct', USA:'us',PAR:'py',AUS:'au',TUR:'tr',
  GER:'de',CUW:'cw',CIV:'ci',ECU:'ec', NED:'nl',JPN:'jp',SWE:'se',TUN:'tn',
  BEL:'be',EGY:'eg',IRN:'ir',NZL:'nz', ESP:'es',CPV:'cv',KSA:'sa',URU:'uy',
  FRA:'fr',SEN:'sn',IRQ:'iq',NOR:'no', ARG:'ar',ALG:'dz',AUT:'at',JOR:'jo',
  POR:'pt',COD:'cd',UZB:'uz',COL:'co', ENG:'gb-eng',CRO:'hr',GHA:'gh',PAN:'pa',
}
export const flagUrl = (code: string | null | undefined) =>
  code && FLAG[code] ? `https://flagcdn.com/${FLAG[code]}.svg` : null

export const GROUPS: Record<string, string[]> = {
  A:['MEX','RSA','KOR','CZE'], B:['CAN','BIH','QAT','SUI'],
  C:['BRA','MAR','HAI','SCO'], D:['USA','PAR','AUS','TUR'],
  E:['GER','CUW','CIV','ECU'], F:['NED','JPN','SWE','TUN'],
  G:['BEL','EGY','IRN','NZL'], H:['ESP','CPV','KSA','URU'],
  I:['FRA','SEN','IRQ','NOR'], J:['ARG','ALG','AUT','JOR'],
  K:['POR','COD','UZB','COL'], L:['ENG','CRO','GHA','PAN'],
}

// round-robin: ordem de confrontos dentro do grupo (índices dos times)
export const RR: [number, number][] = [[0,1],[2,3],[0,2],[1,3],[0,3],[1,2]]

// mata-mata decodificado do PDF: nº do jogo -> [slot casa, slot fora]
export const BRACKET: Record<string, Record<number, [string, string]>> = {
  r32:{73:['2A','2B'],74:['1E','3ABCDF'],75:['1F','2C'],76:['1C','2F'],
       77:['1I','3CDFGH'],78:['2E','2I'],79:['1A','3CEFHI'],80:['1L','3EHIJK'],
       81:['1D','3BEFIJ'],82:['1G','3AEHIJ'],83:['2K','2L'],84:['1H','2J'],
       85:['1B','3EFGIJ'],86:['1J','2H'],87:['1K','3DEIJL'],88:['2D','2G']},
  r16:{89:['W74','W77'],90:['W73','W75'],91:['W76','W78'],92:['W79','W80'],
       93:['W83','W84'],94:['W81','W82'],95:['W86','W88'],96:['W85','W87']},
  qf:{97:['W89','W90'],98:['W93','W94'],99:['W91','W92'],100:['W95','W96']},
  sf:{101:['W97','W98'],102:['W99','W100']},
  terceiro:{103:['L101','L102']},
  final:{104:['W101','W102']},
}

// conjuntos elegíveis de cada slot de 3º colocado (extraídos do PDF)
export const THIRD_SLOTS: Record<string, string> = {
  '3ABCDF':'ABCDF','3CDFGH':'CDFGH','3CEFHI':'CEFHI','3EHIJK':'EHIJK',
  '3BEFIJ':'BEFIJ','3AEHIJ':'AEHIJ','3EFGIJ':'EFGIJ','3DEIJL':'DEIJL',
}

export type Fixture = {
  id: number
  fase: 'grupos' | 'r32' | 'r16' | 'qf' | 'sf' | 'terceiro' | 'final'
  grupo: string | null
  home_slot: string
  away_slot: string
}

// gera os 104 jogos. Grupos: ids 1..72 (provisórios; nº/data oficiais via sync).
// Mata-mata: ids 73..104 com as chaves exatas do PDF.
export function buildFixtures(): Fixture[] {
  const out: Fixture[] = []
  let n = 1
  for (const g of Object.keys(GROUPS)) {
    for (const [i, j] of RR) {
      out.push({ id: n++, fase: 'grupos', grupo: g, home_slot: GROUPS[g][i], away_slot: GROUPS[g][j] })
    }
  }
  for (const fase of ['r32','r16','qf','sf','terceiro','final'] as const) {
    for (const [id, [h, a]] of Object.entries(BRACKET[fase])) {
      out.push({ id: +id, fase, grupo: null, home_slot: h, away_slot: a })
    }
  }
  return out
}

export const TEAMS = Object.entries(GROUPS).flatMap(([g, codes]) =>
  codes.map((code) => ({ code, nome: NAMES[code], grupo: g })),
)
