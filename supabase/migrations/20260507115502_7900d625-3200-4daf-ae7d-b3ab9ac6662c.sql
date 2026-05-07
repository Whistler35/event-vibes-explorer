CREATE TABLE public.event_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  language TEXT NOT NULL CHECK (language IN ('de','en')),
  description TEXT,
  source_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, language)
);

CREATE INDEX idx_event_translations_event ON public.event_translations(event_id, language);

ALTER TABLE public.event_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view translations of approved events"
ON public.event_translations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_translations.event_id
      AND (
        (e.visibility = 'public' AND e.approval_status = 'approved')
        OR e.created_by = auth.uid()
        OR has_role(auth.uid(), 'admin'::app_role)
      )
  )
);

CREATE TRIGGER update_event_translations_updated_at
BEFORE UPDATE ON public.event_translations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();