-- Beta feedback: "+ Invite more friends" in a Huddle only offered external
-- sharing (WhatsApp/Snapchat/etc.) — testers wanted to add an EXISTING
-- EVENDLE friend directly into the Huddle. This RPC does that: any current
-- participant can add one of their own accepted friends straight into the
-- huddle, reusing the existing blitz_match_participants insert trigger
-- (notify_blitz_participant_added) so the added friend gets the normal
-- "MATCH!" notification.

CREATE OR REPLACE FUNCTION public.add_friend_to_huddle(p_match_id uuid, p_friend_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.blitz_match_participants
    WHERE match_id = p_match_id AND user_id = uid
  ) THEN
    RAISE EXCEPTION 'not a participant of this huddle';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND ((requester_id = uid AND addressee_id = p_friend_id)
        OR (requester_id = p_friend_id AND addressee_id = uid))
  ) THEN
    RAISE EXCEPTION 'not friends with this user';
  END IF;

  INSERT INTO public.blitz_match_participants (match_id, user_id)
  VALUES (p_match_id, p_friend_id)
  ON CONFLICT (match_id, user_id) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.add_friend_to_huddle(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.add_friend_to_huddle(uuid, uuid) TO authenticated;
