-- TEMPORARY diagnostic: strip the INSERT policy down to just the author
-- check, to isolate whether the participant/host check is really the
-- problem or something else on this table is misbehaving.
DROP POLICY IF EXISTS "Participants can post about their Blitz" ON public.blitz_feed_posts;

CREATE POLICY "Participants can post about their Blitz"
  ON public.blitz_feed_posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);
