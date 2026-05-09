CREATE OR REPLACE FUNCTION public.handle_join_request_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_title text;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'accepted' THEN
    SELECT title INTO v_event_title FROM public.events WHERE id = NEW.event_id;

    INSERT INTO public.event_participants (event_id, user_id)
    VALUES (NEW.event_id, NEW.user_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      NEW.user_id,
      'join_request_accepted',
      'Anfrage angenommen',
      'Du bist jetzt Teil von "' || COALESCE(v_event_title, 'dem Event') || '"',
      jsonb_build_object('event_id', NEW.event_id)
    );
  END IF;

  RETURN NEW;
END;
$$;