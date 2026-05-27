-- ================================================================
-- Push Notification Trigger 6 & 7
-- ================================================================
-- Note on table corrections vs. original spec:
--   Trigger 6: join_requests (not event_participants) — that's where
--              status pending→accepted lives (join_request_status enum)
--   Trigger 7: blitz_swipes (not blitz_requests) — blitz_swipes has
--              status text 'pending'→'accepted'; blitz_requests has
--              no 'accepted' status value
-- ================================================================

-- ================================================================
-- 6. JOIN REQUEST ACCEPTED
-- Fires when a join_request status changes pending → accepted.
-- Notifies the requester that they were let into the event.
-- ================================================================
CREATE OR REPLACE FUNCTION public.notify_request_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_event_title text;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF OLD.status::text != 'pending' OR NEW.status::text != 'accepted' THEN RETURN NEW; END IF;

  SELECT title INTO v_event_title
    FROM public.events WHERE id = NEW.event_id LIMIT 1;

  PERFORM public.call_push_notification(
    NEW.user_id,
    '✅ Anfrage angenommen!',
    'Du wurdest zu ' || COALESCE(v_event_title, 'dem Event') || ' zugelassen',
    'request_accepted',
    jsonb_build_object('event_id', NEW.event_id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_request_accepted ON public.join_requests;
CREATE TRIGGER trg_notify_request_accepted
  AFTER UPDATE OF status ON public.join_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_request_accepted();

-- ================================================================
-- 7. BLITZ MATCH CREATED (= host accepted)
-- Fires on INSERT into blitz_matches.
-- blitz_match_status enum: 'active', 'expired', 'closed'
-- A new match always starts as 'active' — no status filter needed.
-- Notifies participant_id that they were accepted.
-- ================================================================
CREATE OR REPLACE FUNCTION public.notify_blitz_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  PERFORM public.call_push_notification(
    NEW.participant_id,
    '⚡ Blitz-Anfrage angenommen!',
    'Du wurdest für den Blitz zugelassen',
    'blitz_accepted',
    jsonb_build_object('blitz_request_id', NEW.blitz_request_id, 'host_id', NEW.host_id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_blitz_accepted ON public.blitz_swipes;
DROP TRIGGER IF EXISTS trg_notify_blitz_accepted ON public.blitz_matches;
CREATE TRIGGER trg_notify_blitz_accepted
  AFTER INSERT ON public.blitz_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_blitz_accepted();
