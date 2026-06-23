-- Signal performance tracking and operational audit tables.

CREATE TABLE IF NOT EXISTS public.signal_outcome_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id bigint NOT NULL REFERENCES public.signals(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  outcome text,
  price numeric,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'signal_outcome_events_type_check'
      AND conrelid = 'public.signal_outcome_events'::regclass
  ) THEN
    ALTER TABLE public.signal_outcome_events
      ADD CONSTRAINT signal_outcome_events_type_check
      CHECK (event_type IN ('opened', 'target_hit', 'stop_hit', 'closed', 'expired', 'manual_update')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'signal_outcome_events_outcome_check'
      AND conrelid = 'public.signal_outcome_events'::regclass
  ) THEN
    ALTER TABLE public.signal_outcome_events
      ADD CONSTRAINT signal_outcome_events_outcome_check
      CHECK (outcome IS NULL OR outcome IN ('WIN', 'LOSS')) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS signal_outcome_events_signal_time_idx
  ON public.signal_outcome_events (signal_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS signal_outcome_events_user_time_idx
  ON public.signal_outcome_events (user_id, occurred_at DESC)
  WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  table_name text,
  record_id text,
  ip_address inet,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_actor_time_idx ON public.audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_table_record_idx ON public.audit_logs (table_name, record_id);

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text,
  event_type text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamptz,
  processing_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS webhook_events_provider_event_unique_idx
  ON public.webhook_events (provider, event_id)
  WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS webhook_events_provider_created_idx
  ON public.webhook_events (provider, created_at DESC);
