ALTER TABLE public.events ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_events_archived ON public.events(archived);
UPDATE public.events SET archived = true WHERE event_date < now() AND archived = false;