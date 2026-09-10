-- Harden blitz_join for concurrent joiners: multiple friends swiping right on
-- the same blitz (or a friend swiping while the host accepts a non-friend) used
-- to "check then insert" the single blitz_matches row and could collide on the
-- UNIQUE (blitz_request_id) constraint. Use ON CONFLICT so every joiner lands
-- in the one existing huddle for that blitz and sees its full chat history.
-- Behaviour is otherwise unchanged from 20260910153710.

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
  uid           uuid := auth.uid();
  v_host        uuid;
  v_status      text;
  v_are_friends boolean;
  v_match_id    uuid;
  v_swipe_id    uuid;
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

  -- Exactly one huddle per blitz. Create it if we're first, otherwise reuse it.
  INSERT INTO public.blitz_matches (blitz_request_id, host_id, chat_expires_at)
  VALUES (p_blitz_request_id, v_host, now() + interval '1 hour')
  ON CONFLICT (blitz_request_id) DO NOTHING
  RETURNING id INTO v_match_id;

  IF v_match_id IS NULL THEN
    SELECT id INTO v_match_id
    FROM public.blitz_matches
    WHERE blitz_request_id = p_blitz_request_id;
  END IF;

  -- host + me as participants (idempotent). Full chat history is visible to any
  -- participant — the SELECT policy has no join-time cut-off.
  INSERT INTO public.blitz_match_participants (match_id, user_id)
  VALUES (v_match_id, v_host)
  ON CONFLICT (match_id, user_id) DO NOTHING;

  INSERT INTO public.blitz_match_participants (match_id, user_id)
  VALUES (v_match_id, uid)
  ON CONFLICT (match_id, user_id) DO NOTHING;

  RETURN jsonb_build_object('matched', true, 'match_id', v_match_id, 'swipe_id', v_swipe_id);
END;
$$;

REVOKE ALL ON FUNCTION public.blitz_join(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.blitz_join(uuid, text) TO authenticated;
