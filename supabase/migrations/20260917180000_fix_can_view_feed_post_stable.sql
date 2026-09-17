-- Root cause of every "row violates row-level security policy" error on
-- INSERT into blitz_feed_posts: can_view_feed_post() was marked STABLE.
-- STABLE functions may reuse a snapshot taken earlier in the same
-- statement, so when PostgREST asks for the row back right after inserting
-- it (Prefer: return=representation), the SELECT policy's call to
-- can_view_feed_post() evaluated against a snapshot that didn't yet include
-- the row just inserted in that same statement — so it always evaluated to
-- false, even for the row's own author. A plain SELECT run afterwards (a
-- separate statement/snapshot) worked fine, which is what isolated this.
-- Fix: drop STABLE so it re-evaluates fresh within the same statement.
CREATE OR REPLACE FUNCTION public.can_view_feed_post(p_post_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blitz_feed_posts p
    WHERE p.id = p_post_id
      AND (
        p.visibility = 'public'
        OR p.author_id = p_user_id
        OR EXISTS (
          SELECT 1 FROM public.friendships f
          WHERE f.status = 'accepted'
            AND ((f.requester_id = p.author_id AND f.addressee_id = p_user_id)
              OR (f.addressee_id = p.author_id AND f.requester_id = p_user_id))
        )
      )
  );
$$;

-- Restore the real INSERT policy (the temporary author-only version was
-- only for isolating the bug above — this was never actually the problem).
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
