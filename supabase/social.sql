-- Rode DEPOIS do schema.sql: SQL Editor > New query > Run.
-- Transforma o app numa rede social: perfis, feed, ranking, cargos e moderação.
-- Pode ser executado de novo sem problema.

/* ------------------------------------------------------------------ *
 * Tabelas
 * ------------------------------------------------------------------ */

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null default '' check (char_length(display_name) <= 40),
  bio text not null default '' check (char_length(bio) <= 160),
  avatar text not null default '🙂' check (char_length(avatar) <= 8),
  color text not null default '#8ab4ff' check (color ~ '^#[0-9a-fA-F]{6}$'),
  role text not null default 'user' check (role in ('user', 'moderator', 'superadmin')),
  suspended boolean not null default false,
  created_at timestamptz not null default now()
);

-- Números públicos de cada pessoa (nível, ranking do mês, sequência).
-- O diário, as finanças e os treinos NUNCA saem do vida_state privado.
create table if not exists public.stats (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  month text not null,
  month_xp integer not null default 0 check (month_xp >= 0),
  lifetime_xp integer not null default 0 check (lifetime_xp >= 0),
  level integer not null default 1 check (level >= 1),
  rank_index integer not null default 0 check (rank_index between 0 and 4),
  streak integer not null default 0 check (streak >= 0),
  achievements integer not null default 0 check (achievements >= 0),
  updated_at timestamptz not null default now()
);
create index if not exists stats_month_xp_idx on public.stats (month, month_xp desc);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  kind text not null default 'texto' check (kind in ('texto', 'conquista', 'rank')),
  created_at timestamptz not null default now()
);
create index if not exists posts_created_idx on public.posts (created_at desc);
create index if not exists posts_user_idx on public.posts (user_id, created_at desc);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now()
);
create index if not exists comments_post_idx on public.comments (post_id, created_at);

create table if not exists public.likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (post_id, user_id)
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index if not exists follows_followee_idx on public.follows (followee_id);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null default '' check (char_length(reason) <= 200),
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (post_id, reporter_id)
);

/* ------------------------------------------------------------------ *
 * Funções de apoio
 * ------------------------------------------------------------------ */

create or replace function public.is_active() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and not suspended)
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('moderator', 'superadmin') and not suspended
  )
$$;

create or replace function public.is_superadmin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'superadmin' and not suspended
  )
$$;

-- Usado na tela de cadastro, antes de a pessoa ter conta.
create or replace function public.username_available(u text) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from profiles where username = lower(u))
$$;

-- Só o superadmin exclui uma conta (apaga também todos os dados dela).
create or replace function public.admin_delete_user(target uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_superadmin() then
    raise exception 'Apenas o superadmin pode excluir contas';
  end if;
  if target = auth.uid() then
    raise exception 'Você não pode excluir a própria conta por aqui';
  end if;
  if exists (select 1 from profiles where id = target and role = 'superadmin') then
    raise exception 'Não é possível excluir outro superadmin';
  end if;
  delete from auth.users where id = target;
end $$;

/* ------------------------------------------------------------------ *
 * Perfil criado automaticamente no cadastro
 * ------------------------------------------------------------------ */

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare u text;
begin
  u := lower(coalesce(new.raw_user_meta_data ->> 'username', ''));
  if u !~ '^[a-z0-9_]{3,20}$' or exists (select 1 from profiles where username = u) then
    u := 'user_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  insert into profiles (id, username, display_name) values (new.id, u, u);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Contas que já existiam antes da rede social ganham perfil agora.
insert into public.profiles (id, username, display_name)
select id, 'user_' || substr(replace(id::text, '-', ''), 1, 8),
       'user_' || substr(replace(id::text, '-', ''), 1, 8)
from auth.users
on conflict (id) do nothing;

/* ------------------------------------------------------------------ *
 * Cargos e suspensão: ninguém se promove sozinho
 * ------------------------------------------------------------------ */

create or replace function public.protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then return new; end if; -- SQL Editor / painel do Supabase
  if new.id <> old.id then raise exception 'id não pode mudar'; end if;

  if public.is_superadmin() then
    if old.id = me and (new.role <> old.role or new.suspended <> old.suspended) then
      raise exception 'Você não pode alterar o próprio cargo nem a própria suspensão';
    end if;
    return new;
  end if;

  if new.role <> old.role then raise exception 'Apenas o superadmin altera cargos'; end if;

  if old.id = me then
    if new.suspended <> old.suspended then raise exception 'Operação não permitida'; end if;
    return new;
  end if;

  -- Moderador agindo sobre outra pessoa: só pode suspender, nunca um superadmin.
  if not public.is_staff() then raise exception 'Operação não permitida'; end if;
  if old.role = 'superadmin' then raise exception 'Operação não permitida'; end if;
  if new.username <> old.username or new.display_name <> old.display_name
     or new.bio <> old.bio or new.avatar <> old.avatar or new.color <> old.color then
    raise exception 'Moderadores só podem suspender ou reativar';
  end if;
  return new;
end $$;

drop trigger if exists protect_profile_trg on public.profiles;
create trigger protect_profile_trg
  before update on public.profiles
  for each row execute function public.protect_profile();

/* ------------------------------------------------------------------ *
 * Segurança por linha (RLS)
 * ------------------------------------------------------------------ */

alter table public.profiles enable row level security;
alter table public.stats enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.follows enable row level security;
alter table public.reports enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (true);
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid() and role = 'user' and not suspended);
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_staff()) with check (true);

drop policy if exists stats_select on public.stats;
create policy stats_select on public.stats for select to authenticated using (true);
drop policy if exists stats_insert on public.stats;
create policy stats_insert on public.stats for insert to authenticated
  with check (user_id = auth.uid() and public.is_active());
drop policy if exists stats_update on public.stats;
create policy stats_update on public.stats for update to authenticated
  using (user_id = auth.uid() and public.is_active())
  with check (user_id = auth.uid() and public.is_active());

drop policy if exists posts_select on public.posts;
create policy posts_select on public.posts for select to authenticated using (true);
drop policy if exists posts_insert on public.posts;
create policy posts_insert on public.posts for insert to authenticated
  with check (user_id = auth.uid() and public.is_active());
drop policy if exists posts_delete on public.posts;
create policy posts_delete on public.posts for delete to authenticated
  using (user_id = auth.uid() or public.is_staff());

drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments for select to authenticated using (true);
drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert to authenticated
  with check (user_id = auth.uid() and public.is_active());
drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments for delete to authenticated
  using (user_id = auth.uid() or public.is_staff());

drop policy if exists likes_select on public.likes;
create policy likes_select on public.likes for select to authenticated using (true);
drop policy if exists likes_insert on public.likes;
create policy likes_insert on public.likes for insert to authenticated
  with check (user_id = auth.uid() and public.is_active());
drop policy if exists likes_delete on public.likes;
create policy likes_delete on public.likes for delete to authenticated using (user_id = auth.uid());

drop policy if exists follows_select on public.follows;
create policy follows_select on public.follows for select to authenticated using (true);
drop policy if exists follows_insert on public.follows;
create policy follows_insert on public.follows for insert to authenticated
  with check (follower_id = auth.uid() and public.is_active());
drop policy if exists follows_delete on public.follows;
create policy follows_delete on public.follows for delete to authenticated using (follower_id = auth.uid());

drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports for insert to authenticated
  with check (reporter_id = auth.uid() and public.is_active());
drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports for select to authenticated using (public.is_staff());
drop policy if exists reports_update on public.reports;
create policy reports_update on public.reports for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists reports_delete on public.reports;
create policy reports_delete on public.reports for delete to authenticated using (public.is_staff());

/* ------------------------------------------------------------------ *
 * Como virar superadmin (rode UMA vez, trocando o e-mail):
 *
 *   update public.profiles set role = 'superadmin'
 *   where id = (select id from auth.users where email = 'seu@email.com');
 * ------------------------------------------------------------------ */
