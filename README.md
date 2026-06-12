# Bolão 26 — Copa do Mundo FIFA 2026

Bolão da Copa: palpites, classificação e chaveamento ao vivo.
Next.js 16 (App Router) + Supabase. Projeto **separado** do CIA.

## Regras
- Placar **exato** = **3 pts** · só o **vencedor/empate** = **1 pt** · errou = 0
- Palpite **trava no apito inicial** (trigger no banco)
- Pontuação **calculada** (views), nunca gravada
- Horários exibidos em **BRT** (Brasília)

## Stack
- Next 16 / React 19 / Tailwind v4
- `@supabase/ssr` (auth + RLS) · `@supabase/supabase-js`
- Motor de torneio em TS puro: `src/lib/tournament/` (classificação com desempate FIFA + solver dos 8 melhores 3ºs)

## Setup
1. `npm install` (feito)
2. Criar um projeto **novo** no [Supabase](https://supabase.com) (separado do CIA).
3. Copiar credenciais para `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   SUPABASE_SERVICE_ROLE_KEY=...   # server-only
   ```
4. No **SQL Editor** do Supabase, rodar nesta ordem:
   - `supabase/migrations/0001_init.sql` (tabelas, RLS, trigger de lock, views)
   - `supabase/seed.sql` (48 seleções, 12 grupos, 104 jogos, chave)
5. `npm run dev` → http://localhost:4343

Sem credenciais, o app roda em **modo demo** (estrutura do torneio renderiza; placares/ranking aguardam o banco).

## Estrutura
```
src/lib/tournament/data.ts        GROUPS, NAMES, BRACKET, THIRD_SLOTS (fonte da verdade)
src/lib/tournament/standings.ts   standings(), solveThirds(), resolveSlot()
src/lib/supabase/                 client / server / admin / proxy (middleware)
src/app/page.tsx                  Classificação + Chaveamento (lê placares do banco)
supabase/migrations/0001_init.sql schema
supabase/seed.sql                 gerado por scripts/gen-seed.mjs
```

## Pendências (próximos passos)
- **Auth** (magic link / Google) + telas de palpites/perfil/ranking completas (UI do protótipo)
- **Datas/horários reais** dos jogos: hoje provisórios. Sincronizar de **openfootball** (ou API) e converter ET→BRT. Ver `kickoff` em `matches`.
- **8 melhores 3ºs**: hoje via *solver por restrição* (válido, sem reencontro de grupo). Para fidelidade byte-a-byte com a FIFA, transcrever o **Anexo C** (495 linhas) do Regulamento 2026.
- **Lançar placar** (admin): Server Action com service_role atualizando `matches` → classificação/chave/ranking cascateiam.
- **Realtime** dos placares (Supabase Realtime) para a UI atualizar sozinha.
