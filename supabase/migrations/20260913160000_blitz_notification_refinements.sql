-- 1) "Neuer Blitz in der Nähe" (public audience) should NOT reveal who is
--    hosting or what the activity is — just that something new is nearby.
--    (friends/selected keep the personalised text — those are targeted invites.)
-- 2) The host should only get an unsolicited "X joined your Blitz" push when
--    it was a FRIEND auto-join (no action from the host). When the host
--    manually accepts a non-friend's request, they already know — only the
--    accepted person needs the "you're in" notification.
-- 3) notify_friend_accepted never called call_push_notification — the
--    requester saw it in-app only, never as a push.

CREATE OR REPLACE FUNCTION public.notify_blitz_nearby()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_host_name text;
  v_audience  text := NEW.audience::text;
  v_rec       record;
BEGIN
  SELECT name INTO v_host_name
    FROM public.profiles WHERE user_id = NEW.host_id LIMIT 1;

  IF v_audience = 'friends' THEN
    FOR v_rec IN
      SELECT CASE WHEN f.requester_id = NEW.host_id THEN f.addressee_id
                  ELSE f.requester_id END AS user_id
      FROM public.friendships f
      WHERE f.status = 'accepted'
        AND (f.requester_id = NEW.host_id OR f.addressee_id = NEW.host_id)
    LOOP
      IF v_rec.user_id = NEW.host_id THEN CONTINUE; END IF;
      PERFORM public.call_push_notification(
        v_rec.user_id,
        '⚡ ' || COALESCE(v_host_name, 'Ein Freund') || ' blitzt gerade',
        COALESCE(v_host_name, 'Jemand') || ' sucht jemanden für ' || NEW.activity,
        'new_blitz_nearby',
        jsonb_build_object('blitz_id', NEW.id, 'host_id', NEW.host_id)
      );
    END LOOP;

  ELSIF v_audience = 'selected' THEN
    IF NEW.target_user_ids IS NULL THEN RETURN NEW; END IF;
    FOR v_rec IN
      SELECT DISTINCT u AS user_id FROM unnest(NEW.target_user_ids) AS u
    LOOP
      IF v_rec.user_id = NEW.host_id THEN CONTINUE; END IF;
      PERFORM public.call_push_notification(
        v_rec.user_id,
        '⚡ ' || COALESCE(v_host_name, 'Jemand') || ' lädt dich zum Blitz ein',
        COALESCE(v_host_name, 'Jemand') || ' sucht jemanden für ' || NEW.activity,
        'new_blitz_nearby',
        jsonb_build_object('blitz_id', NEW.id, 'host_id', NEW.host_id)
      );
    END LOOP;

  ELSE
    -- public (or any unknown audience) → nearby broadcast, no details
    IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN RETURN NEW; END IF;
    FOR v_rec IN
      SELECT DISTINCT user_id
      FROM public.push_subscriptions
      WHERE user_id <> NEW.host_id
        AND latitude  IS NOT NULL
        AND longitude IS NOT NULL
        AND ST_DWithin(
          ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
          ST_SetSRID(ST_MakePoint(NEW.longitude,  NEW.latitude), 4326)::geography,
          30000   -- metres
        )
    LOOP
      PERFORM public.call_push_notification(
        v_rec.user_id,
        '⚡ Neuer Blitz in der Nähe',
        'Jemand in deiner Nähe blitzt gerade – schau vorbei!',
        'new_blitz_nearby',
        jsonb_build_object('blitz_id', NEW.id)
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_blitz_participant_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_host_id     uuid;
  v_request_id  uuid;
  v_activity    text;
  v_host_name   text;
  v_joiner_name text;
  v_are_friends boolean;
BEGIN
  SELECT m.host_id, m.blitz_request_id
    INTO v_host_id, v_request_id
  FROM public.blitz_matches m
  WHERE m.id = NEW.match_id;

  IF v_host_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.user_id = v_host_id THEN RETURN NEW; END IF;

  SELECT activity INTO v_activity FROM public.blitz_requests WHERE id = v_request_id;
  SELECT name INTO v_host_name FROM public.profiles WHERE user_id = v_host_id;
  SELECT name INTO v_joiner_name FROM public.profiles WHERE user_id = NEW.user_id;

  -- Notify the joiner — covers both "friend auto-joined" and "host accepted
  -- your request" (identical experience: you're in, chat started).
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    NEW.user_id, 'blitz_match', 'MATCH! ⚡',
    'Du machst mit ' || COALESCE(v_host_name, 'jemandem') ||
      ' bei "' || COALESCE(v_activity, 'einem Blitz') || '" mit. Chat startet jetzt!',
    jsonb_build_object('match_id', NEW.match_id, 'blitz_request_id', v_request_id, 'host_id', v_host_id)
  );
  PERFORM public.call_push_notification(
    NEW.user_id, '⚡ Blitz-Anfrage angenommen!',
    'Du wurdest für den Blitz zugelassen – der Chat startet jetzt!', 'blitz_accepted',
    jsonb_build_object('match_id', NEW.match_id, 'blitz_request_id', v_request_id, 'host_id', v_host_id)
  );

  -- Only tell the host if this was a FRIEND auto-join — that happens without
  -- the host doing anything, so it's the only case they wouldn't already
  -- know. A manual accept means the host just did this themselves.
  SELECT EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
      AND ((f.requester_id = v_host_id AND f.addressee_id = NEW.user_id)
        OR (f.requester_id = NEW.user_id AND f.addressee_id = v_host_id))
  ) INTO v_are_friends;

  IF v_are_friends THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_host_id, 'blitz_match', 'MATCH! ⚡',
      COALESCE(v_joiner_name, 'Jemand') || ' ist deinem Blitz "' ||
        COALESCE(v_activity, '') || '"-Huddle beigetreten!',
      jsonb_build_object('match_id', NEW.match_id, 'blitz_request_id', v_request_id, 'joiner_id', NEW.user_id)
    );
    PERFORM public.call_push_notification(
      v_host_id, '⚡ Neuer Mitstreiter!',
      COALESCE(v_joiner_name, 'Jemand') || ' ist deinem Blitz-Huddle beigetreten', 'blitz_match',
      jsonb_build_object('match_id', NEW.match_id, 'blitz_request_id', v_request_id, 'joiner_id', NEW.user_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_friend_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_accepter_name text;
  v_title text;
  v_body  text;
BEGIN
  IF OLD.status = 'accepted' THEN RETURN NEW; END IF;
  IF NEW.status != 'accepted' THEN RETURN NEW; END IF;

  SELECT name INTO v_accepter_name FROM profiles WHERE user_id = NEW.addressee_id LIMIT 1;

  v_title := 'Anfrage bestätigt';
  v_body  := COALESCE(v_accepter_name, 'Jemand') || ' hat deine Freundschaftsanfrage angenommen 🎉';

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    NEW.requester_id, 'friend_accepted', v_title, v_body,
    jsonb_build_object('friend_id', NEW.addressee_id, 'friendship_id', NEW.id)
  );

  PERFORM public.call_push_notification(
    NEW.requester_id, v_title, v_body, 'friend_accepted',
    jsonb_build_object('friend_id', NEW.addressee_id, 'friendship_id', NEW.id)
  );

  RETURN NEW;
END;
$$;
