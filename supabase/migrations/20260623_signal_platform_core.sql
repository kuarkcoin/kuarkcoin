alter table if exists public.signals
  add column if not exists event_id text;

create unique index if not exists signals_event_id_unique_idx
  on public.signals (event_id)
  where event_id is not null;
