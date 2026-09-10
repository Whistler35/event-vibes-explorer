-- Friends skip the request step: swiping right on a friend's Blitz joins the
-- huddle immediately. Non-friends still create a pending request the host must
-- accept. Runs SECURITY DEFINER because only the host may create the match row.

CREATE OR REPLACE FUNCTION public.blitz_join(
  p_blitz_request_id uuid,
  p_direction text DEFAULT 'right'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid        uuid := auth.uid();
  v_host     uuid;
  v_status   text;
  v_are_friends boolean;
  v_match_id uuid;
  v_swipe_id uuid;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT host_id, status::text INTO v_host, v_status
  FROM public.blitz_requests
  WHERE id = p_blitz_request_id;

  IF v_host IS NULL THEN
    RAISE EXCEPTION 'blitz not found';
  END IF;
  IF v_host = uid THEN
    RAISE EXCEPTION 'cannot swipe your own blitz';
  END IF;

  -- record / update the swipe (unique on (blitz_request_id, swiper_id))
  INSERT INTO public.blitz_swipes (blitz_request_id, swiper_id, direction, status)
  VALUES (p_blitz_request_id, uid, p_direction::public.blitz_swipe_direction, 'pending')
  ON CONFLICT (blitz_request_id, swiper_id)
  DO UPDATE SET direction = excluded.direction, updated_at = now()
  RETURNING id INTO v_swipe_id;

  IF p_direction <> 'right' THEN
    RETURN jsonb_build_object('matched', false, 'swipe_id', v_swipe_id);
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND ((requester_id = v_host AND addressee_id = uid)
        OR (requester_id = uid  AND addressee_id = v_host))
  ) INTO v_are_friends;

  IF NOT v_are_friends THEN
    -- leave the swipe pending for the host to accept
    RETURN jsonb_build_object('matched', false, 'swipe_id', v_swipe_id);
  END IF;

  -- Friend → auto-accept
  UPDATE public.blitz_swipes
  SET status = 'accepted', updated_at = now()
  WHERE blitz_request_id = p_blitz_request_id AND swiper_id = uid;

  SELECT id INTO v_match_id
  FROM public.blitz_matches
  WHERE blitz_request_id = p_blitz_request_id
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_match_id IS NULL THEN
    INSERT INTO public.blitz_matches (blitz_request_id, host_id, chat_expires_at)
    VALUES (p_blitz_request_id, v_host, now() + interval '1 hour')
    RETURNING id INTO v_match_id;
  END IF;

  -- host as participant
  IF NOT EXISTS (SELECT 1 FROM public.blitz_match_participants
                 WHERE match_id = v_match_id AND user_id = v_host) THEN
    INSERT INTO public.blitz_match_participants (match_id, user_id) VALUES (v_match_id, v_host);
  END IF;

  -- me as participant
  IF NOT EXISTS (SELECT 1 FROM public.blitz_match_participants
                 WHERE match_id = v_match_id AND user_id = uid) THEN
    INSERT INTO public.blitz_match_participants (match_id, user_id) VALUES (v_match_id, uid);
  END IF;

  RETURN jsonb_build_object('matched', true, 'match_id', v_match_id, 'swipe_id', v_swipe_id);
END;
$$;

REVOKE ALL ON FUNCTION public.blitz_join(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.blitz_join(uuid, text) TO authenticated;