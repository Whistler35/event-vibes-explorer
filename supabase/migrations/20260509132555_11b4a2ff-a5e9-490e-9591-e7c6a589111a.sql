CREATE TABLE public.site_visits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id uuid,
  session_id text,
  path text,
  referrer text,
  user_agent text,
  visited_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert site visits"
ON public.site_visits FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Admins can view site visits"
ON public.site_visits FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_site_visits_visited_at ON public.site_visits(visited_at DESC);
CREATE INDEX idx_site_visits_session ON public.site_visits(session_id);