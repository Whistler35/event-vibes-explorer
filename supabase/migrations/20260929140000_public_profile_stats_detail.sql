-- Companion to get_profile_stats: the detail sheet (tap a stat number to
-- see the actual list) has the exact same RLS-undercount problem — without
-- this, the stat number would now show the real count while the list
-- underneath still says "noch keine Freunde", which reads as more broken
-- than the original bug. Same principle: only the fields the sheet already
-- displays (nothing more sensitive, e.g. no exact coordinates), safe to
-- expose regardless of the viewer's relationship to p_user_id.

CREATE OR REPLACE FUNCTION public.get_profile_blitz_list(p_user_id uuid, p_kind text)
RETURNS TABLE (id uuid, activity text, city text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT br.id, br.activity, br.city, br.created_at
  FROM public.blitz_requests br
  WHERE p_kind = 'sent' AND br.host_id = p_user_id
  ORDER BY br.created_at DESC
  LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION public.get_profile_blitz_joined_list(p_user_id uuid)
RETURNS TABLE (id uuid, activity text, city text, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT DISTINCT br.id, br.activity, br.city, br.created_at
  FROM public.blitz_match_participants bmp
  JOIN public.blitz_matches bm ON bm.id = bmp.match_id
  JOIN public.blitz_requests br ON br.id = bm.blitz_request_id
  WHERE bmp.user_id = p_user_id
  ORDER BY br.created_at DESC
  LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION public.get_profile_friends_list(p_user_id uuid)
RETURNS TABLE (user_id uuid, name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.user_id, p.name, p.avatar_url
  FROM public.friendships f
  JOIN public.profiles p
    ON p.user_id = CASE WHEN f.requester_id = p_user_id THEN f.addressee_id ELSE f.requester_id END
  WHERE f.status = 'accepted'
    AND (f.requester_id = p_user_id OR f.addressee_id = p_user_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_blitz_list(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_blitz_joined_list(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_friends_list(uuid) TO authenticated;
