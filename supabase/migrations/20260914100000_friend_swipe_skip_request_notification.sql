-- A friend swiping right on your Blitz auto-joins via blitz_join() and gets
-- their own "MATCH!" push immediately — they never needed your approval.
-- But notify_host_on_blitz_swipe() fired on every INSERT into blitz_swipes
-- unconditionally, so the host ALSO got a "Neue Blitz-Anfrage" with
-- Annehmen/Ablehnen buttons for a request that was already auto-accepted.
-- Skip this notification whenever swiper and host are already friends.

CREATE OR REPLACE FUNCTION public.notify_host_on_blitz_swipe()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_host_id UUID;
  v_activity TEXT;
  v_swiper_name TEXT;
  v_title TEXT;
  v_body TEXT;
  v_are_friends boolean;
BEGIN
  IF NEW.direction <> 'right' THEN
    RETURN NEW;
  END IF;

  SELECT host_id, activity INTO v_host_id, v_activity
  FROM public.blitz_requests WHERE id = NEW.blitz_request_id;

  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND ((requester_id = v_host_id AND addressee_id = NEW.swiper_id)
        OR (requester_id = NEW.swiper_id AND addressee_id = v_host_id))
  ) INTO v_are_friends;

  IF v_are_friends THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_swiper_name
  FROM public.profiles WHERE user_id = NEW.swiper_id;

  v_title := 'Neue Blitz-Anfrage ⚡';
  v_body  := COALESCE(v_swiper_name, 'Jemand') || ' möchte bei "' || v_activity || '" mitmachen!';

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_host_id, 'blitz_request', v_title, v_body,
    jsonb_build_object(
      'blitz_request_id', NEW.blitz_request_id,
      'swipe_id', NEW.id,
      'swiper_id', NEW.swiper_id
    )
  );

  PERFORM public.call_push_notification(
    v_host_id, v_title, v_body, 'blitz_request',
    jsonb_build_object(
      'blitz_request_id', NEW.blitz_request_id,
      'swipe_id', NEW.id,
      'swiper_id', NEW.swiper_id
    )
  );

  RETURN NEW;
END;
$$;
