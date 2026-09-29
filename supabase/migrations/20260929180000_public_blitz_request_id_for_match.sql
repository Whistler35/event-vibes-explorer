-- Bug: the Blitz activity name was STILL missing on feed posts / profile
-- moments for viewers who aren't a participant of the underlying match.
-- get_blitz_activity_names() (20260929120000) fixed the last-mile
-- blitz_requests read, but the match_id -> blitz_request_id lookup itself
-- (a direct `blitz_matches` select in useBlitzFeed.ts / BlitzMomentsGrid.tsx)
-- is RLS-restricted to the match's host/participants only ("Host or
-- participants can view match"). A non-participant viewer of a public feed
-- post got zero rows there, so the join broke before it ever reached the
-- activity RPC — this affected current AND past/expired Blitzes equally,
-- since participation (not expiry) was the blocker.
--
-- Fix: a narrow SECURITY DEFINER function that maps match ids to their
-- blitz_request id only — nothing else (no host identity, no chat expiry,
-- no participant list) — so it's safe to expose regardless of the caller's
-- relationship to that match.

CREATE OR REPLACE FUNCTION public.get_blitz_request_ids_for_matches(p_match_ids uuid[])
RETURNS TABLE (match_id uuid, blitz_request_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT bm.id, bm.blitz_request_id
  FROM public.blitz_matches bm
  WHERE bm.id = ANY(p_match_ids);
$$;

GRANT EXECUTE ON FUNCTION public.get_blitz_request_ids_for_matches(uuid[]) TO authenticated;
