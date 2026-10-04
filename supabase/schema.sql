-- Rode este arquivo uma vez no Supabase: SQL Editor > New query > Run.

create table if not exists public.vida_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.vida_state enable row level security;

-- Cada pessoa enxerga e altera somente a própria linha.
create policy "le a propria linha" on public.vida_state
  for select using (auth.uid() = user_id);
create policy "cria a propria linha" on public.vida_state
  for insert with check (auth.uid() = user_id);
create policy "altera a propria linha" on public.vida_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Atualização em tempo real entre aparelhos.
alter publication supabase_realtime add table public.vida_state;
