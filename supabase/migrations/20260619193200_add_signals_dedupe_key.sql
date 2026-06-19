alter table public.signals
  add column if not exists dedupe_key text;

create unique index if not exists signals_dedupe_key_unique
  on public.signals (dedupe_key)
  where dedupe_key is not null;
