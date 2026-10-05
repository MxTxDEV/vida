-- Rode DEPOIS do social.sql: SQL Editor > New query > Run.
-- Adiciona: foto de perfil, fotos nas publicações e notificações.
-- Pode ser executado de novo sem problema.

/* ------------------------------------------------------------------ *
 * Colunas novas
 * ------------------------------------------------------------------ */

alter table public.profiles add column if not exists avatar_path text
  check (avatar_path is null or char_length(avatar_path) <= 200);

alter table public.posts add column if not exists image_path text
  check (image_path is null or char_length(image_path) <= 200);

-- Uma publicação pode ter só foto, sem texto.
alter table public.posts drop constraint if exists posts_body_check;
alter table public.posts drop constraint if exists posts_content_check;
alter table public.posts add constraint posts_content_check
  check (char_length(body) <= 500 and (char_length(body) >= 1 or image_path is not null));

-- Moderadores continuam só podendo suspender; a foto de perfil também é protegida.
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

  if not public.is_staff() then raise exception 'Operação não permitida'; end if;
  if old.role = 'superadmin' then raise exception 'Operação não permitida'; end if;
  if new.username <> old.username or new.display_name <> old.display_name
     or new.bio <> old.bio or new.avatar <> old.avatar or new.color <> old.color
     or new.avatar_path is distinct from old.avatar_path then
    raise exception 'Moderadores só podem suspender ou reativar';
  end if;
  return new;
end $$;

/* ------------------------------------------------------------------ *
 * Armazenamento de imagens (buckets públicos para leitura)
 * ------------------------------------------------------------------ */

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 1048576, array['image/jpeg', 'image/png', 'image/webp']),
  ('posts',   'posts',   true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Cada pessoa só mexe na própria pasta (o primeiro nível do caminho é o id dela).
drop policy if exists vida_images_select on storage.objects;
create policy vida_images_select on storage.objects for select to authenticated
  using (bucket_id in ('avatars', 'posts'));

drop policy if exists vida_images_insert on storage.objects;
create policy vida_images_insert on storage.objects for insert to authenticated
  with check (
    bucket_id in ('avatars', 'posts')
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_active()
  );

drop policy if exists vida_images_update on storage.objects;
create policy vida_images_update on storage.objects for update to authenticated
  using (bucket_id in ('avatars', 'posts') and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id in ('avatars', 'posts') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists vida_images_delete on storage.objects;
create policy vida_images_delete on storage.objects for delete to authenticated
  using (
    bucket_id in ('avatars', 'posts')
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff())
  );

/* ------------------------------------------------------------------ *
 * Notificações: novo seguidor, curtida e comentário
 * ------------------------------------------------------------------ */

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('follow', 'like', 'comment')),
  post_id uuid references public.posts (id) on delete cascade,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, read, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications for delete to authenticated
  using (user_id = auth.uid());
-- Ninguém cria notificação direto: elas nascem dos gatilhos abaixo.

create or replace function public.notify_follow() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, actor_id, type)
  select new.followee_id, new.follower_id, 'follow'
  where not exists (
    select 1 from notifications
    where user_id = new.followee_id and actor_id = new.follower_id and type = 'follow' and not read
  );
  return new;
end $$;

create or replace function public.notify_like() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  select user_id into owner from posts where id = new.post_id;
  if owner is not null and owner <> new.user_id then
    insert into notifications (user_id, actor_id, type, post_id)
    select owner, new.user_id, 'like', new.post_id
    where not exists (
      select 1 from notifications
      where user_id = owner and actor_id = new.user_id and type = 'like' and post_id = new.post_id and not read
    );
  end if;
  return new;
end $$;

create or replace function public.notify_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  select user_id into owner from posts where id = new.post_id;
  if owner is not null and owner <> new.user_id then
    insert into notifications (user_id, actor_id, type, post_id)
    values (owner, new.user_id, 'comment', new.post_id);
  end if;
  return new;
end $$;

drop trigger if exists notify_follow_trg on public.follows;
create trigger notify_follow_trg after insert on public.follows
  for each row execute function public.notify_follow();
drop trigger if exists notify_like_trg on public.likes;
create trigger notify_like_trg after insert on public.likes
  for each row execute function public.notify_like();
drop trigger if exists notify_comment_trg on public.comments;
create trigger notify_comment_trg after insert on public.comments
  for each row execute function public.notify_comment();
