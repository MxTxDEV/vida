-- Rode DEPOIS do social2.sql: SQL Editor > New query > Run.
-- Limites contra spam e trapaça. Os números de XP precisam bater com lib/rules.ts.
-- Pode ser executado de novo sem problema.

/* ------------------------------------------------------------------ *
 * Ranking e nível: o servidor calcula, o aparelho não decide
 * ------------------------------------------------------------------ */

create or replace function public.rank_for(xp integer) returns integer
language sql immutable as $$
  select case when xp >= 3400 then 4 when xp >= 2200 then 3 when xp >= 1200 then 2 when xp >= 500 then 1 else 0 end
$$;

create or replace function public.level_for(xp integer) returns integer
language sql immutable as $$
  select least(50, floor(sqrt(greatest(xp, 0) / 250.0))::integer + 1)
$$;

-- Ninguém publica mais XP do que é possível ganhar pelas regras:
--   máximo de 174 XP por dia de atividade (+ até 300 XP de metas por mês).
create or replace function public.validate_stats() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  today date := (now() at time zone 'utc')::date;
  this_month date := date_trunc('month', (now() at time zone 'utc'))::date;
  m date;
  created date;
  age integer;
  allowed integer;
begin
  if auth.uid() is null then return new; end if; -- SQL Editor / painel do Supabase

  begin
    m := to_date(new.month || '-01', 'YYYY-MM-DD');
  exception when others then
    raise exception 'Mês inválido';
  end;
  -- Aceita o mês atual e os vizinhos (fusos horários diferentes).
  if abs((extract(year from m) * 12 + extract(month from m)) - (extract(year from this_month) * 12 + extract(month from this_month))) > 1 then
    raise exception 'Mês inválido';
  end if;

  if m = this_month then
    allowed := 185 * (extract(day from today)::integer + 1) + 300;
  else
    allowed := 185 * 32 + 300;
  end if;
  if new.month_xp > allowed then
    raise exception 'XP do mês acima do máximo possível';
  end if;

  select created_at::date into created from profiles where id = new.user_id;
  age := greatest(0, today - coalesce(created, today));
  -- 62 dias de folga para quem já usava o app antes de criar a conta.
  if new.lifetime_xp > 190 * (age + 62) + 2300 then
    raise exception 'XP total acima do máximo possível';
  end if;
  if new.streak > age + 62 then
    raise exception 'Sequência acima do máximo possível';
  end if;
  if new.achievements > 18 then
    raise exception 'Número de conquistas inválido';
  end if;

  new.rank_index := public.rank_for(new.month_xp);
  new.level := public.level_for(new.lifetime_xp);
  return new;
end $$;

drop trigger if exists validate_stats_trg on public.stats;
create trigger validate_stats_trg
  before insert or update on public.stats
  for each row execute function public.validate_stats();

-- Corrige agora o rank e o nível já guardados, com as regras novas.
update public.stats set rank_index = public.rank_for(month_xp), level = public.level_for(lifetime_xp);

/* ------------------------------------------------------------------ *
 * Limites contra spam
 * ------------------------------------------------------------------ */

create or replace function public.limit_posts() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if (select count(*) from posts where user_id = new.user_id and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Limite de 10 publicações por hora. Tente de novo mais tarde.';
  end if;
  if (select count(*) from posts where user_id = new.user_id and created_at > now() - interval '24 hours') >= 30 then
    raise exception 'Limite de 30 publicações por dia atingido.';
  end if;
  if new.image_path is not null and
     (select count(*) from posts where user_id = new.user_id and image_path is not null and created_at > now() - interval '24 hours') >= 10 then
    raise exception 'Limite de 10 fotos por dia atingido.';
  end if;
  if new.body <> '' and exists (
    select 1 from posts where user_id = new.user_id and body = new.body and created_at > now() - interval '10 minutes'
  ) then
    raise exception 'Você já publicou isso agora há pouco.';
  end if;
  return new;
end $$;

create or replace function public.limit_comments() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if (select count(*) from comments where user_id = new.user_id and created_at > now() - interval '1 hour') >= 40 then
    raise exception 'Limite de 40 comentários por hora. Tente de novo mais tarde.';
  end if;
  return new;
end $$;

-- Curtidas não têm data própria: o limite usa as notificações geradas por elas.
create or replace function public.limit_follows() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if (select count(*) from follows where follower_id = new.follower_id) >= 500 then
    raise exception 'Você já segue 500 pessoas, que é o máximo.';
  end if;
  if (select count(*) from notifications where actor_id = new.follower_id and type = 'follow' and created_at > now() - interval '1 hour') >= 60 then
    raise exception 'Limite de 60 novos seguidos por hora. Tente de novo mais tarde.';
  end if;
  return new;
end $$;

create or replace function public.limit_reports() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;
  if (select count(*) from reports where reporter_id = new.reporter_id and created_at > now() - interval '24 hours') >= 20 then
    raise exception 'Limite de 20 denúncias por dia atingido.';
  end if;
  return new;
end $$;

drop trigger if exists limit_posts_trg on public.posts;
create trigger limit_posts_trg before insert on public.posts for each row execute function public.limit_posts();
drop trigger if exists limit_comments_trg on public.comments;
create trigger limit_comments_trg before insert on public.comments for each row execute function public.limit_comments();
drop trigger if exists limit_follows_trg on public.follows;
create trigger limit_follows_trg before insert on public.follows for each row execute function public.limit_follows();
drop trigger if exists limit_reports_trg on public.reports;
create trigger limit_reports_trg before insert on public.reports for each row execute function public.limit_reports();

/* ------------------------------------------------------------------ *
 * Nome de usuário: no máximo uma troca a cada 14 dias
 * ------------------------------------------------------------------ */

alter table public.profiles add column if not exists username_changed_at timestamptz;

create or replace function public.limit_username_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.username is distinct from old.username then
    if auth.uid() is not null and not public.is_superadmin()
       and old.username_changed_at is not null and old.username_changed_at > now() - interval '14 days' then
      raise exception 'Você só pode trocar o nome de usuário a cada 14 dias.';
    end if;
    new.username_changed_at := now();
  end if;
  return new;
end $$;

drop trigger if exists limit_username_change_trg on public.profiles;
create trigger limit_username_change_trg before update on public.profiles
  for each row execute function public.limit_username_change();
