ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS price_cents integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_events_price_cents ON public.events(price_cents);