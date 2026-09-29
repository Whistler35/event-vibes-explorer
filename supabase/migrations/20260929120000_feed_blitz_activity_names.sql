-- Bug: the Blitz activity name was missing on feed posts for anyone who
-- wasn't a participant of the original Blitz (host / accepted friend of the
-- host / in target_user_ids). blitz_requests_select_v2 RLS restricts SELECT
-- to exactly those people — but a feed post itself can be visible far more
-- broadly ('public' visibility, seen by the whole community), so most
-- viewers of a public feed post got activity: null and the name silently
-- disappeared (useBlitzFeed.ts joins blitz_matches -> blitz_requests
-- client-side, subject to RLS).
--
-- Fix: a narrow SECURITY DEFINER function that returns only the activity
-- text for a list of blitz_request ids — nothing else (no location, no
-- audience, no host identity) — so it's safe to expose regardless of the
-- caller's relationship to that Blitz.

CREATE OR REPLACE FUNCTION public.get_blitz_activity_names(p_ids uuid[])
RETURNS TABLE (id uuid, activity text)
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT br.id, br.activity
  FROM public.blitz_requests br
  WHERE br.id = ANY(p_ids);
$$;

GRANT EXECUTE ON FUNCTION public.get_blitz_activity_names(uuid[]) TO authenticated;
