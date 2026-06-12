-- ============================================================================
-- BOLÃO DA COPA 2026 — schema inicial
-- Regras: placar exato = 3 pts · só o vencedor/empate = 1 pt · errou = 0
-- Palpite trava no apito inicial (trigger). Pontuação é calculada (views).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ── PERFIS ──────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text not null default '',
  apelido     text,
  avatar_url  text,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- cria profile automaticamente ao cadastrar usuário
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── SELEÇÕES ─────────────────────────────────────────────────────────────────
create table if not exists public.teams (
  code   text primary key,          -- 'BRA', 'FRA', ...
  nome   text not null,
  grupo  char(1)                     -- A..L (null para placeholders de mata-mata)
);

-- ── JOGOS ────────────────────────────────────────────────────────────────────
-- id = número oficial FIFA do jogo (1..104)
create table if not exists public.matches (
  id          int primary key,
  fase        text not null,                 -- grupos|r32|r16|qf|sf|terceiro|final
  grupo       char(1),                       -- A..L (só fase de grupos)
  home_slot   text not null,                 -- code do time OU slot ('1A','3CEFHI','W74')
  away_slot   text not null,
  home_code   text references public.teams(code),  -- preenchido quando resolvido
  away_code   text references public.teams(code),
  kickoff     timestamptz,                   -- horário em UTC (exibir em BRT no app)
  venue       text,                          -- cidade/sede do jogo
  home_score  int,
  away_score  int,
  status      text not null default 'agendado' -- agendado|ao_vivo|encerrado
);
alter table public.matches add column if not exists venue text;
create index if not exists matches_kickoff_idx on public.matches(kickoff);
create index if not exists matches_fase_idx    on public.matches(fase);

-- ── PALPITES ─────────────────────────────────────────────────────────────────
create table if not exists public.predictions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  match_id      int  not null references public.matches(id) on delete cascade,
  palpite_home  int  not null check (palpite_home between 0 and 99),
  palpite_away  int  not null check (palpite_away between 0 and 99),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, match_id)
);

-- trava o palpite no apito inicial (e impede trocar de jogo)
create or replace function public.lock_prediction()
returns trigger language plpgsql as $$
declare ko timestamptz;
begin
  select kickoff into ko from public.matches where id = new.match_id;
  if ko is not null and now() >= ko then
    raise exception 'Palpite encerrado: o jogo já começou (%).', ko
      using errcode = 'check_violation';
  end if;
  if tg_op = 'UPDATE' and new.match_id <> old.match_id then
    raise exception 'Não é permitido trocar o jogo do palpite.'
      using errcode = 'check_violation';
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_lock_prediction on public.predictions;
create trigger trg_lock_prediction
  before insert or update on public.predictions
  for each row execute function public.lock_prediction();

-- ── PONTUAÇÃO (calculada) ─────────────────────────────────────────────────────
-- 3 = placar exato · 1 = acertou só o resultado (vitória casa/empate/vitória fora)
create or replace function public.fn_pontos(ph int, pa int, rh int, ra int)
returns int language sql immutable as $$
  select case
    when rh is null or ra is null then 0
    when ph = rh and pa = ra then 3
    when sign(ph - pa) = sign(rh - ra) then 1
    else 0
  end
$$;

-- pontos por palpite (só jogos encerrados)
create or replace view public.v_palpite_pontos as
select
  p.id, p.user_id, p.match_id,
  p.palpite_home, p.palpite_away,
  m.home_score, m.away_score,
  public.fn_pontos(p.palpite_home, p.palpite_away, m.home_score, m.away_score) as pontos,
  (p.palpite_home = m.home_score and p.palpite_away = m.away_score) as cravou
from public.predictions p
join public.matches m on m.id = p.match_id
where m.status = 'encerrado' and m.home_score is not null;

-- ranking geral
create or replace view public.v_ranking as
select
  pr.id as user_id, pr.nome, pr.apelido, pr.avatar_url,
  coalesce(sum(vp.pontos),0)::int                          as pontos,
  count(vp.id) filter (where vp.cravou)::int               as cravadas,
  count(vp.id)::int                                         as palpites_pontuados
from public.profiles pr
left join public.v_palpite_pontos vp on vp.user_id = pr.id
group by pr.id, pr.nome, pr.apelido, pr.avatar_url
order by pontos desc, cravadas desc, pr.nome asc;

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.profiles    enable row level security;
alter table public.teams       enable row level security;
alter table public.matches     enable row level security;
alter table public.predictions enable row level security;

-- profiles: todos leem (ranking mostra nomes); cada um edita o próprio
drop policy if exists profiles_read   on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_read   on public.profiles for select using (true);
create policy profiles_update on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- teams / matches: leitura pública; escrita só admin (ou service_role)
drop policy if exists teams_read    on public.teams;
drop policy if exists matches_read  on public.matches;
drop policy if exists matches_admin on public.matches;
create policy teams_read   on public.teams   for select using (true);
create policy matches_read on public.matches for select using (true);
-- admin (profiles.is_admin) pode lançar/editar placar — cascateia tudo
create policy matches_admin on public.matches for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- predictions: cada um só vê/edita os PRÓPRIOS palpites (segredo até o apito)
drop policy if exists pred_select on public.predictions;
drop policy if exists pred_insert on public.predictions;
drop policy if exists pred_update on public.predictions;
create policy pred_select on public.predictions for select using (auth.uid() = user_id);
create policy pred_insert on public.predictions for insert with check (auth.uid() = user_id);
create policy pred_update on public.predictions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- views herdam RLS das tabelas base (security invoker) — ok para ranking agregado.
grant select on public.v_ranking, public.v_palpite_pontos to anon, authenticated;

-- ============================================================================
-- Realtime: publica mudanças de `matches` (placar ao vivo no carrossel)
-- ============================================================================
do $$ begin
  alter publication supabase_realtime add table public.matches;
exception when duplicate_object then null; end $$;
