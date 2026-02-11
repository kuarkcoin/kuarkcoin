create table if not exists public.daily_top_leaderboard (
  id bigserial primary key,
  day date not null,
  side text not null check (side in ('BUY', 'SELL')),
  symbol text not null,
  score numeric,
  close_price numeric,
  close_10bd numeric,
  pct_10bd numeric,
  created_at timestamptz not null default now(),
  unique (day, side, symbol)
);

create index if not exists idx_daily_top_leaderboard_day
  on public.daily_top_leaderboard (day);

create index if not exists idx_daily_top_leaderboard_created_at
  on public.daily_top_leaderboard (created_at);
