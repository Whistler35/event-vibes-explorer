-- 1) Huddle chat messages never notified anyone — no in-app entry, no push.
-- 2) notify_blitz_participant_added only notified the joiner, never the host
--    (e.g. when a friend auto-joins without the host doing anything).

CREATE OR REPLACE FUNCTION public.notify_new_blitz_chat_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_sender_name text;
  v_activity    text;
  v_title       text;
  v_body        text;
  v_recipient   record;
BEGIN
  SELECT name INTO v_sender_name FROM public.profiles WHERE user_id = NEW.sender_id;
  SELECT r.activity INTO v_activity
  FROM public.blitz_matches m JOIN public.blitz_requests r ON r.id = m.blitz_request_id
  WHERE m.id = NEW.match_id;

  v_title := '💬 ' || COALESCE(v_sender_name, 'Jemand') || ' · ' || COALESCE(v_activity, 'Huddle');
  v_body  := left(NEW.message, 120);

  FOR v_recipient IN
    SELECT user_id FROM public.blitz_match_participants
    WHERE match_id = NEW.match_id AND user_id <> NEW.sender_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_recipient.user_id, 'blitz_chat_message', v_title, v_body,
      jsonb_build_object('match_id', NEW.match_id, 'sender_id', NEW.sender_id)
    );

    PERFORM public.call_push_notification(
      v_recipient.user_id, v_title, v_body, 'blitz_chat_message',
      jsonb_build_object('match_id', NEW.match_id, 'sender_id', NEW.sender_id)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_blitz_chat_message ON public.blitz_chat_messages;
CREATE TRIGGER trg_notify_new_blitz_chat_message
  AFTER INSERT ON public.blitz_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_blitz_chat_message();

-- Host notification on new participant (in addition to the joiner's own
-- "MATCH!" notification, unchanged).
CREATE OR REPLACE FUNCTION public.notify_blitz_participant_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_host_id    uuid;
  v_request_id uuid;
  v_activity   text;
  v_host_name  text;
  v_joiner_name text;
BEGIN
  SELECT m.host_id, m.blitz_request_id
    INTO v_host_id, v_request_id
  FROM public.blitz_matches m
  WHERE m.id = NEW.match_id;

  IF v_host_id IS NULL THEN RETURN NEW; END IF;

  SELECT activity INTO v_activity FROM public.blitz_requests WHERE id = v_request_id;

  -- The host joining their own huddle (first participant row) → nothing to do.
  IF NEW.user_id = v_host_id THEN RETURN NEW; END IF;

  SELECT name INTO v_host_name FROM public.profiles WHERE user_id = v_host_id;
  SELECT name INTO v_joiner_name FROM public.profiles WHERE user_id = NEW.user_id;

  -- Notify the joiner (unchanged behaviour).
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

  -- Also notify the host — matters most for friend auto-join, where the host
  -- didn't take any action and would otherwise never find out.
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_host_id, 'blitz_match', 'MATCH! ⚡',
    COALESCE(v_joiner_name, 'Jemand') || ' ist deinem Blitz "' ||
      COALESCE(v_activity, '') || '" beigetreten!',
    jsonb_build_object('match_id', NEW.match_id, 'blitz_request_id', v_request_id, 'joiner_id', NEW.user_id)
  );
  PERFORM public.call_push_notification(
    v_host_id, '⚡ Neuer Mitstreiter!',
    COALESCE(v_joiner_name, 'Jemand') || ' ist deinem Blitz beigetreten', 'blitz_match',
    jsonb_build_object('match_id', NEW.match_id, 'blitz_request_id', v_request_id, 'joiner_id', NEW.user_id)
  );

  RETURN NEW;
END;
$$;
