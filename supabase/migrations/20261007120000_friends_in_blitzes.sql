-- "2 Freunde sind schon dabei": for a list of Blitzes, which of the VIEWER'S
-- friends are already in the Huddle (excluding the host, who is shown on the
-- card anyway, and the viewer). blitz_match_participants is only readable by
-- the participants themselves, so this is a narrow SECURITY DEFINER lookup
-- that only ever returns people the viewer is already friends with, and
-- never anyone blocked in either direction.

CREATE OR REPLACE FUNCTION public.get_friends_in_blitzes(p_request_ids uuid[])
RETURNS TABLE (
  blitz_request_id uuid,
  user_id uuid,
  name text,
  avatar_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT DISTINCT m.blitz_request_id, pr.user_id, pr.name, pr.avatar_url
  FROM public.blitz_matches m
  JOIN public.blitz_match_participants p ON p.match_id = m.id
  JOIN public.profiles pr ON pr.user_id = p.user_id
  WHERE auth.uid() IS NOT NULL
    AND m.blitz_request_id = ANY(p_request_ids)
    AND m.status = 'active'
    AND p.user_id <> m.host_id
    AND p.user_id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND ((f.requester_id = auth.uid() AND f.addressee_id = p.user_id)
          OR (f.addressee_id = auth.uid() AND f.requester_id = p.user_id))
    )
    AND NOT public.is_blocked_between(auth.uid(), p.user_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_friends_in_blitzes(uuid[]) TO authenticated;
