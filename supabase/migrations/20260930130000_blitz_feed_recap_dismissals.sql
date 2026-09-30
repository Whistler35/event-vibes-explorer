-- Lets a user remove an individual ended Huddle from their "post about this?"
-- picker in ComposeFeedPostSheet without touching the underlying match/chat
-- data (a plain delete of blitz_matches would destroy real chat history).

CREATE TABLE IF NOT EXISTS public.blitz_feed_recap_dismissals (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id uuid NOT NULL REFERENCES public.blitz_matches(id) ON DELETE CASCADE,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, match_id)
);

ALTER TABLE public.blitz_feed_recap_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own dismissals select" ON public.blitz_feed_recap_dismissals
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "own dismissals insert" ON public.blitz_feed_recap_dismissals
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "own dismissals delete" ON public.blitz_feed_recap_dismissals
  FOR DELETE USING (user_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON public.blitz_feed_recap_dismissals TO authenticated;
GRANT ALL ON public.blitz_feed_recap_dismissals TO service_role;
