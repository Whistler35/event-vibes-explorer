-- Trigger function: when a join_request is accepted, add user to event_participants and notify
CREATE OR REPLACE FUNCTION public.handle_join_request_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_title text;
BEGIN
  -- Only act on actual status transitions
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT title INTO v_event_title FROM public.events WHERE id = NEW.event_id;

  IF NEW.status = 'accepted' THEN
    -- Add as participant (idempotent)
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
  ELSIF NEW.status = 'rejected' THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      NEW.user_id,
      'join_request_rejected',
      'Anfrage abgelehnt',
      'Deine Anfrage für "' || COALESCE(v_event_title, 'das Event') || '" wurde abgelehnt',
      jsonb_build_object('event_id', NEW.event_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_join_request_status_change ON public.join_requests;
CREATE TRIGGER trg_join_request_status_change
  AFTER UPDATE OF status ON public.join_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_join_request_status_change();

-- Backfill: ensure all already-accepted requests have corresponding participants
INSERT INTO public.event_participants (event_id, user_id)
SELECT jr.event_id, jr.user_id
FROM public.join_requests jr
WHERE jr.status = 'accepted'
  AND NOT EXISTS (
    SELECT 1 FROM public.event_participants ep
    WHERE ep.event_id = jr.event_id AND ep.user_id = jr.user_id
  );

-- Allow notifications to be created by SECURITY DEFINER functions
-- (the existing INSERT policy requires auth.uid() = user_id, which fails for system inserts)
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);