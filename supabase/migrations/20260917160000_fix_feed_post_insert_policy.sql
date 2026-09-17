-- The original "Participants can post about their Blitz" INSERT policy
-- referenced the target table's own name (blitz_feed_posts.match_id) inside
-- a correlated EXISTS subquery to check the host case. Live testing showed
-- every insert getting rejected by RLS even for a confirmed participant —
-- is_blitz_match_participant(match_id, auth.uid()) alone tested true via
-- direct RPC call, and the identical pattern already works for
-- blitz_chat_messages, so the extra self-qualified EXISTS branch was the
-- difference. Replacing it with an unqualified reference (matching every
-- other working policy in this codebase) fixes it.

DROP POLICY IF EXISTS "Participants can post about their Blitz" ON public.blitz_feed_posts;

CREATE POLICY "Participants can post about their Blitz"
  ON public.blitz_feed_posts FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id
    AND (
      public.is_blitz_match_participant(match_id, auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.blitz_matches m
        WHERE m.id = match_id AND m.host_id = auth.uid()
      )
    )
  );
