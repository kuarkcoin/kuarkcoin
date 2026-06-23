alter table if exists public.signals
  add column if not exists indicators jsonb not null default '[]'::jsonb;
