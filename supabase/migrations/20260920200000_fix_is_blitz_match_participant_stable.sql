-- Same root cause as the earlier can_view_feed_post STABLE bug, just in a
-- different function: is_blitz_match_participant() was marked STABLE, so it
-- can reuse a snapshot from earlier in the request instead of seeing the
-- freshest committed data — e.g. right after being added to a Huddle's
-- participants, an insert into blitz_feed_posts checking
-- is_blitz_match_participant() in its WITH CHECK can spuriously fail with
-- "new row violates row-level security policy for table blitz_feed_posts"
-- even though the participant row genuinely exists. Dropping STABLE forces
-- a fresh read every time, matching the fix already applied to
-- can_view_feed_post.
CREATE OR REPLACE FUNCTION public.is_blitz_match_participant(_match_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blitz_match_participants
    WHERE match_id = _match_id AND user_id = _user_id
  );
$$;
