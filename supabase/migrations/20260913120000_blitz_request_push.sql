-- "Neue Blitz-Anfrage" has only ever shown as an in-app notification — it
-- never called call_push_notification like the other 5 notification types
-- (blitz_accepted, blitz_match, friend_request, new_dm, blitz_nearby). Add it
-- so the host also gets a real push when someone swipes right on their Blitz.

CREATE OR REPLACE FUNCTION public.notify_host_on_blitz_swipe()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_host_id UUID;
  v_activity TEXT;
  v_swiper_name TEXT;
  v_title TEXT;
  v_body TEXT;
BEGIN
  IF NEW.direction <> 'right' THEN
    RETURN NEW;
  END IF;

  SELECT host_id, activity INTO v_host_id, v_activity
  FROM public.blitz_requests WHERE id = NEW.blitz_request_id;

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
