-- ============================================================
-- BOLÃO 26 — SETUP COMPLETO (re-rodável; dados reais do openfootball)
-- ============================================================

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
  home_score  int,
  away_score  int,
  status      text not null default 'agendado' -- agendado|ao_vivo|encerrado
);
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


-- SEED Bolão 26 — dados REAIS do openfootball (datas em UTC; exibir em BRT).
insert into public.teams (code,nome,grupo) values
('MEX','México','A'),
('RSA','África do Sul','A'),
('KOR','Coreia do Sul','A'),
('CZE','Tchéquia','A'),
('CAN','Canadá','B'),
('BIH','Bósnia','B'),
('QAT','Catar','B'),
('SUI','Suíça','B'),
('BRA','Brasil','C'),
('MAR','Marrocos','C'),
('HAI','Haiti','C'),
('SCO','Escócia','C'),
('USA','EUA','D'),
('PAR','Paraguai','D'),
('AUS','Austrália','D'),
('TUR','Turquia','D'),
('GER','Alemanha','E'),
('CUW','Curaçao','E'),
('CIV','Costa do Marfim','E'),
('ECU','Equador','E'),
('NED','Holanda','F'),
('JPN','Japão','F'),
('SWE','Suécia','F'),
('TUN','Tunísia','F'),
('BEL','Bélgica','G'),
('EGY','Egito','G'),
('IRN','Irã','G'),
('NZL','Nova Zelândia','G'),
('ESP','Espanha','H'),
('CPV','Cabo Verde','H'),
('KSA','Arábia Saudita','H'),
('URU','Uruguai','H'),
('FRA','França','I'),
('SEN','Senegal','I'),
('IRQ','Iraque','I'),
('NOR','Noruega','I'),
('ARG','Argentina','J'),
('ALG','Argélia','J'),
('AUT','Áustria','J'),
('JOR','Jordânia','J'),
('POR','Portugal','K'),
('COD','Congo DR','K'),
('UZB','Uzbequistão','K'),
('COL','Colômbia','K'),
('ENG','Inglaterra','L'),
('CRO','Croácia','L'),
('GHA','Gana','L'),
('PAN','Panamá','L')
on conflict (code) do update set nome=excluded.nome, grupo=excluded.grupo;

insert into public.matches (id,fase,grupo,home_slot,away_slot,home_code,away_code,kickoff,home_score,away_score,status) values
(1,'grupos','A','MEX','RSA','MEX','RSA','2026-06-11T19:00:00.000Z',2,0,'encerrado'),
(2,'grupos','A','KOR','CZE','KOR','CZE','2026-06-12T02:00:00.000Z',2,1,'encerrado'),
(3,'grupos','A','MEX','KOR','MEX','KOR','2026-06-19T01:00:00.000Z',null,null,'agendado'),
(4,'grupos','A','CZE','RSA','CZE','RSA','2026-06-18T16:00:00.000Z',null,null,'agendado'),
(5,'grupos','A','CZE','MEX','CZE','MEX','2026-06-25T01:00:00.000Z',null,null,'agendado'),
(6,'grupos','A','RSA','KOR','RSA','KOR','2026-06-25T01:00:00.000Z',null,null,'agendado'),
(7,'grupos','B','CAN','BIH','CAN','BIH','2026-06-12T19:00:00.000Z',null,null,'agendado'),
(8,'grupos','B','QAT','SUI','QAT','SUI','2026-06-13T19:00:00.000Z',null,null,'agendado'),
(9,'grupos','B','CAN','QAT','CAN','QAT','2026-06-18T22:00:00.000Z',null,null,'agendado'),
(10,'grupos','B','SUI','BIH','SUI','BIH','2026-06-18T19:00:00.000Z',null,null,'agendado'),
(11,'grupos','B','SUI','CAN','SUI','CAN','2026-06-24T19:00:00.000Z',null,null,'agendado'),
(12,'grupos','B','BIH','QAT','BIH','QAT','2026-06-24T19:00:00.000Z',null,null,'agendado'),
(13,'grupos','C','BRA','MAR','BRA','MAR','2026-06-13T22:00:00.000Z',null,null,'agendado'),
(14,'grupos','C','HAI','SCO','HAI','SCO','2026-06-14T01:00:00.000Z',null,null,'agendado'),
(15,'grupos','C','BRA','HAI','BRA','HAI','2026-06-20T00:30:00.000Z',null,null,'agendado'),
(16,'grupos','C','SCO','MAR','SCO','MAR','2026-06-19T22:00:00.000Z',null,null,'agendado'),
(17,'grupos','C','SCO','BRA','SCO','BRA','2026-06-24T22:00:00.000Z',null,null,'agendado'),
(18,'grupos','C','MAR','HAI','MAR','HAI','2026-06-24T22:00:00.000Z',null,null,'agendado'),
(19,'grupos','D','USA','PAR','USA','PAR','2026-06-13T01:00:00.000Z',null,null,'agendado'),
(20,'grupos','D','AUS','TUR','AUS','TUR','2026-06-14T04:00:00.000Z',null,null,'agendado'),
(21,'grupos','D','USA','AUS','USA','AUS','2026-06-19T19:00:00.000Z',null,null,'agendado'),
(22,'grupos','D','TUR','PAR','TUR','PAR','2026-06-20T03:00:00.000Z',null,null,'agendado'),
(23,'grupos','D','TUR','USA','TUR','USA','2026-06-26T02:00:00.000Z',null,null,'agendado'),
(24,'grupos','D','PAR','AUS','PAR','AUS','2026-06-26T02:00:00.000Z',null,null,'agendado'),
(25,'grupos','E','GER','CUW','GER','CUW','2026-06-14T17:00:00.000Z',null,null,'agendado'),
(26,'grupos','E','CIV','ECU','CIV','ECU','2026-06-14T23:00:00.000Z',null,null,'agendado'),
(27,'grupos','E','GER','CIV','GER','CIV','2026-06-20T20:00:00.000Z',null,null,'agendado'),
(28,'grupos','E','ECU','CUW','ECU','CUW','2026-06-21T00:00:00.000Z',null,null,'agendado'),
(29,'grupos','E','ECU','GER','ECU','GER','2026-06-25T20:00:00.000Z',null,null,'agendado'),
(30,'grupos','E','CUW','CIV','CUW','CIV','2026-06-25T20:00:00.000Z',null,null,'agendado'),
(31,'grupos','F','NED','JPN','NED','JPN','2026-06-14T20:00:00.000Z',null,null,'agendado'),
(32,'grupos','F','SWE','TUN','SWE','TUN','2026-06-15T02:00:00.000Z',null,null,'agendado'),
(33,'grupos','F','NED','SWE','NED','SWE','2026-06-20T17:00:00.000Z',null,null,'agendado'),
(34,'grupos','F','TUN','JPN','TUN','JPN','2026-06-21T04:00:00.000Z',null,null,'agendado'),
(35,'grupos','F','TUN','NED','TUN','NED','2026-06-25T23:00:00.000Z',null,null,'agendado'),
(36,'grupos','F','JPN','SWE','JPN','SWE','2026-06-25T23:00:00.000Z',null,null,'agendado'),
(37,'grupos','G','BEL','EGY','BEL','EGY','2026-06-15T19:00:00.000Z',null,null,'agendado'),
(38,'grupos','G','IRN','NZL','IRN','NZL','2026-06-16T01:00:00.000Z',null,null,'agendado'),
(39,'grupos','G','BEL','IRN','BEL','IRN','2026-06-21T19:00:00.000Z',null,null,'agendado'),
(40,'grupos','G','NZL','EGY','NZL','EGY','2026-06-22T01:00:00.000Z',null,null,'agendado'),
(41,'grupos','G','NZL','BEL','NZL','BEL','2026-06-27T03:00:00.000Z',null,null,'agendado'),
(42,'grupos','G','EGY','IRN','EGY','IRN','2026-06-27T03:00:00.000Z',null,null,'agendado'),
(43,'grupos','H','ESP','CPV','ESP','CPV','2026-06-15T16:00:00.000Z',null,null,'agendado'),
(44,'grupos','H','KSA','URU','KSA','URU','2026-06-15T22:00:00.000Z',null,null,'agendado'),
(45,'grupos','H','ESP','KSA','ESP','KSA','2026-06-21T16:00:00.000Z',null,null,'agendado'),
(46,'grupos','H','URU','CPV','URU','CPV','2026-06-21T22:00:00.000Z',null,null,'agendado'),
(47,'grupos','H','URU','ESP','URU','ESP','2026-06-27T00:00:00.000Z',null,null,'agendado'),
(48,'grupos','H','CPV','KSA','CPV','KSA','2026-06-27T00:00:00.000Z',null,null,'agendado'),
(49,'grupos','I','FRA','SEN','FRA','SEN','2026-06-16T19:00:00.000Z',null,null,'agendado'),
(50,'grupos','I','IRQ','NOR','IRQ','NOR','2026-06-16T22:00:00.000Z',null,null,'agendado'),
(51,'grupos','I','FRA','IRQ','FRA','IRQ','2026-06-22T21:00:00.000Z',null,null,'agendado'),
(52,'grupos','I','NOR','SEN','NOR','SEN','2026-06-23T00:00:00.000Z',null,null,'agendado'),
(53,'grupos','I','NOR','FRA','NOR','FRA','2026-06-26T19:00:00.000Z',null,null,'agendado'),
(54,'grupos','I','SEN','IRQ','SEN','IRQ','2026-06-26T19:00:00.000Z',null,null,'agendado'),
(55,'grupos','J','ARG','ALG','ARG','ALG','2026-06-17T01:00:00.000Z',null,null,'agendado'),
(56,'grupos','J','AUT','JOR','AUT','JOR','2026-06-17T04:00:00.000Z',null,null,'agendado'),
(57,'grupos','J','ARG','AUT','ARG','AUT','2026-06-22T17:00:00.000Z',null,null,'agendado'),
(58,'grupos','J','JOR','ALG','JOR','ALG','2026-06-23T03:00:00.000Z',null,null,'agendado'),
(59,'grupos','J','JOR','ARG','JOR','ARG','2026-06-28T02:00:00.000Z',null,null,'agendado'),
(60,'grupos','J','ALG','AUT','ALG','AUT','2026-06-28T02:00:00.000Z',null,null,'agendado'),
(61,'grupos','K','POR','COD','POR','COD','2026-06-17T17:00:00.000Z',null,null,'agendado'),
(62,'grupos','K','UZB','COL','UZB','COL','2026-06-18T02:00:00.000Z',null,null,'agendado'),
(63,'grupos','K','POR','UZB','POR','UZB','2026-06-23T17:00:00.000Z',null,null,'agendado'),
(64,'grupos','K','COL','COD','COL','COD','2026-06-24T02:00:00.000Z',null,null,'agendado'),
(65,'grupos','K','COL','POR','COL','POR','2026-06-27T23:30:00.000Z',null,null,'agendado'),
(66,'grupos','K','COD','UZB','COD','UZB','2026-06-27T23:30:00.000Z',null,null,'agendado'),
(67,'grupos','L','ENG','CRO','ENG','CRO','2026-06-17T20:00:00.000Z',null,null,'agendado'),
(68,'grupos','L','GHA','PAN','GHA','PAN','2026-06-17T23:00:00.000Z',null,null,'agendado'),
(69,'grupos','L','ENG','GHA','ENG','GHA','2026-06-23T20:00:00.000Z',null,null,'agendado'),
(70,'grupos','L','PAN','CRO','PAN','CRO','2026-06-23T23:00:00.000Z',null,null,'agendado'),
(71,'grupos','L','PAN','ENG','PAN','ENG','2026-06-27T21:00:00.000Z',null,null,'agendado'),
(72,'grupos','L','CRO','GHA','CRO','GHA','2026-06-27T21:00:00.000Z',null,null,'agendado'),
(73,'r32',null,'2A','2B',null,null,'2026-06-28T19:00:00.000Z',null,null,'agendado'),
(74,'r32',null,'1E','3ABCDF',null,null,'2026-06-29T20:30:00.000Z',null,null,'agendado'),
(75,'r32',null,'1F','2C',null,null,'2026-06-30T01:00:00.000Z',null,null,'agendado'),
(76,'r32',null,'1C','2F',null,null,'2026-06-29T17:00:00.000Z',null,null,'agendado'),
(77,'r32',null,'1I','3CDFGH',null,null,'2026-06-30T21:00:00.000Z',null,null,'agendado'),
(78,'r32',null,'2E','2I',null,null,'2026-06-30T17:00:00.000Z',null,null,'agendado'),
(79,'r32',null,'1A','3CEFHI',null,null,'2026-07-01T01:00:00.000Z',null,null,'agendado'),
(80,'r32',null,'1L','3EHIJK',null,null,'2026-07-01T16:00:00.000Z',null,null,'agendado'),
(81,'r32',null,'1D','3BEFIJ',null,null,'2026-07-02T00:00:00.000Z',null,null,'agendado'),
(82,'r32',null,'1G','3AEHIJ',null,null,'2026-07-01T20:00:00.000Z',null,null,'agendado'),
(83,'r32',null,'2K','2L',null,null,'2026-07-02T23:00:00.000Z',null,null,'agendado'),
(84,'r32',null,'1H','2J',null,null,'2026-07-02T19:00:00.000Z',null,null,'agendado'),
(85,'r32',null,'1B','3EFGIJ',null,null,'2026-07-03T03:00:00.000Z',null,null,'agendado'),
(86,'r32',null,'1J','2H',null,null,'2026-07-03T22:00:00.000Z',null,null,'agendado'),
(87,'r32',null,'1K','3DEIJL',null,null,'2026-07-04T01:30:00.000Z',null,null,'agendado'),
(88,'r32',null,'2D','2G',null,null,'2026-07-03T18:00:00.000Z',null,null,'agendado'),
(89,'r16',null,'W74','W77',null,null,'2026-07-04T21:00:00.000Z',null,null,'agendado'),
(90,'r16',null,'W73','W75',null,null,'2026-07-04T17:00:00.000Z',null,null,'agendado'),
(91,'r16',null,'W76','W78',null,null,'2026-07-05T20:00:00.000Z',null,null,'agendado'),
(92,'r16',null,'W79','W80',null,null,'2026-07-06T00:00:00.000Z',null,null,'agendado'),
(93,'r16',null,'W83','W84',null,null,'2026-07-06T19:00:00.000Z',null,null,'agendado'),
(94,'r16',null,'W81','W82',null,null,'2026-07-07T00:00:00.000Z',null,null,'agendado'),
(95,'r16',null,'W86','W88',null,null,'2026-07-07T16:00:00.000Z',null,null,'agendado'),
(96,'r16',null,'W85','W87',null,null,'2026-07-07T20:00:00.000Z',null,null,'agendado'),
(97,'qf',null,'W89','W90',null,null,'2026-07-09T20:00:00.000Z',null,null,'agendado'),
(98,'qf',null,'W93','W94',null,null,'2026-07-10T19:00:00.000Z',null,null,'agendado'),
(99,'qf',null,'W91','W92',null,null,'2026-07-11T21:00:00.000Z',null,null,'agendado'),
(100,'qf',null,'W95','W96',null,null,'2026-07-12T01:00:00.000Z',null,null,'agendado'),
(101,'sf',null,'W97','W98',null,null,'2026-07-14T19:00:00.000Z',null,null,'agendado'),
(102,'sf',null,'W99','W100',null,null,'2026-07-15T19:00:00.000Z',null,null,'agendado'),
(103,'terceiro',null,'L101','L102',null,null,'2026-07-18T21:00:00.000Z',null,null,'agendado'),
(104,'final',null,'W101','W102',null,null,'2026-07-19T19:00:00.000Z',null,null,'agendado')
on conflict (id) do update set fase=excluded.fase,grupo=excluded.grupo,home_slot=excluded.home_slot,away_slot=excluded.away_slot,home_code=excluded.home_code,away_code=excluded.away_code,kickoff=excluded.kickoff,home_score=excluded.home_score,away_score=excluded.away_score,status=excluded.status;