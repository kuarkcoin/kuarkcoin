-- Core signal platform extensions.
-- This migration is intentionally additive: it does not drop, truncate, or rewrite
-- existing signals data.

ALTER TABLE public.signals
  ADD COLUMN IF NOT EXISTS event_id text,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS timeframe text,
  ADD COLUMN IF NOT EXISTS exchange text,
  ADD COLUMN IF NOT EXISTS market text,
  ADD COLUMN IF NOT EXISTS strategy text,
  ADD COLUMN IF NOT EXISTS side text,
  ADD COLUMN IF NOT EXISTS entry_price numeric,
  ADD COLUMN IF NOT EXISTS stop_loss numeric,
  ADD COLUMN IF NOT EXISTS take_profit numeric,
  ADD COLUMN IF NOT EXISTS confidence numeric,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

COMMENT ON COLUMN public.signals.event_id IS 'External scanner/webhook event id. Unique only when present.';
COMMENT ON COLUMN public.signals.metadata IS 'Additive JSON metadata for scanner-specific fields.';

-- Safe constraints for live data: NOT VALID avoids blocking deployment when older
-- rows contain values outside the new domain. Validate later after data cleanup with:
-- ALTER TABLE public.signals VALIDATE CONSTRAINT <constraint_name>;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'signals_signal_buy_sell_check'
      AND conrelid = 'public.signals'::regclass
  ) THEN
    ALTER TABLE public.signals
      ADD CONSTRAINT signals_signal_buy_sell_check
      CHECK (signal IS NULL OR upper(signal::text) IN ('BUY', 'SELL')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'signals_outcome_check'
      AND conrelid = 'public.signals'::regclass
  ) THEN
    ALTER TABLE public.signals
      ADD CONSTRAINT signals_outcome_check
      CHECK (outcome IS NULL OR upper(outcome::text) IN ('WIN', 'LOSS')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'signals_status_check'
      AND conrelid = 'public.signals'::regclass
  ) THEN
    ALTER TABLE public.signals
      ADD CONSTRAINT signals_status_check
      CHECK (status IS NULL OR status IN ('new', 'open', 'closed', 'cancelled', 'expired')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'signals_confidence_range_check'
      AND conrelid = 'public.signals'::regclass
  ) THEN
    ALTER TABLE public.signals
      ADD CONSTRAINT signals_confidence_range_check
      CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 100)) NOT VALID;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS signals_event_id_unique_idx
  ON public.signals (event_id)
  WHERE event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS signals_created_at_desc_idx
  ON public.signals (created_at DESC);

CREATE INDEX IF NOT EXISTS signals_signal_score_created_at_idx
  ON public.signals (signal, score DESC NULLS LAST, created_at DESC);

CREATE INDEX IF NOT EXISTS signals_symbol_created_at_idx
  ON public.signals (symbol, created_at DESC);

CREATE INDEX IF NOT EXISTS signals_status_created_at_idx
  ON public.signals (status, created_at DESC)
  WHERE status IS NOT NULL;
