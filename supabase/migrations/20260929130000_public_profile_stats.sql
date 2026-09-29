-- Bug: the three profile stats (Blitze gesendet / mitgemacht / Freunde) were
-- undercounted — often showing 0 — for anyone viewing a profile that isn't
-- their own, because they were computed client-side as row counts against
-- tables whose RLS only allows a user to see rows *they* are personally
-- party to:
--   - friendships: only rows where you are requester/addressee
--   - blitz_requests: only host / public / friends-of-host / selected-target
--   - blitz_match_participants: only fellow participants of the same match
-- None of those match "am I looking at user X's profile" as a viewer who
-- has no such relationship to X. A SECURITY DEFINER function sidesteps
-- this safely — it only ever returns three numbers, never the underlying
-- rows, so it doesn't leak anything RLS was actually protecting.

CREATE OR REPLACE FUNCTION public.get_profile_stats(p_user_id uuid)
RETURNS TABLE (friends_count bigint, blitz_sent bigint, blitz_joined bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.friendships f
       WHERE f.status = 'accepted'
         AND (f.requester_id = p_user_id OR f.addressee_id = p_user_id)),
    (SELECT count(*) FROM public.blitz_requests br
       WHERE br.host_id = p_user_id),
    (SELECT count(*) FROM public.blitz_match_participants bmp
       WHERE bmp.user_id = p_user_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_stats(uuid) TO authenticated;
