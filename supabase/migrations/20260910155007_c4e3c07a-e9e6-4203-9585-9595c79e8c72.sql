-- The 2026-07-06 refactor (20260706195106) moved blitz participants out of
-- blitz_matches.participant_id into the new blitz_match_participants table, but
-- left two AFTER INSERT triggers on blitz_matches that still read
-- NEW.participant_id:
--   * trg_notify_on_blitz_match   -> notify_on_blitz_match()
--   * trg_notify_blitz_accepted   -> notify_blitz_accepted()
-- Since blitz_matches no longer has that column, every match insert now aborts
-- with: record "new" has no field "participant_id". This blocks both the host
-- accept flow (acceptBlitzRequest) and the new friend auto-join (blitz_join).
--
-- Fix: drop the stale triggers/functions and notify per participant row added
-- to blitz_match_participants instead (skipping the host's own row).

DROP TRIGGER IF EXISTS trg_notify_on_blitz_match ON public.blitz_matches;
DROP TRIGGER IF EXISTS trg_notify_blitz_accepted ON public.blitz_matches;
DROP TRIGGER IF EXISTS trg_notify_blitz_accepted ON public.blitz_swipes;

DROP FUNCTION IF EXISTS public.notify_on_blitz_match() CASCADE;
DROP FUNCTION IF EXISTS public.notify_blitz_accepted() CASCADE;

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
BEGIN
  SELECT m.host_id, m.blitz_request_id
    INTO v_host_id, v_request_id
  FROM public.blitz_matches m
  WHERE m.id = NEW.match_id;

  -- Don't notify the host about being added to their own blitz huddle.
  IF v_host_id IS NULL OR NEW.user_id = v_host_id THEN
    RETURN NEW;
  END IF;

  SELECT activity INTO v_activity
  FROM public.blitz_requests WHERE id = v_request_id;

  SELECT name INTO v_host_name
  FROM public.profiles WHERE user_id = v_host_id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    NEW.user_id,
    'blitz_match',
    'MATCH! ⚡',
    'Du machst mit ' || COALESCE(v_host_name, 'jemandem') ||
      ' bei "' || COALESCE(v_activity, 'einem Blitz') || '" mit. Chat startet jetzt!',
    jsonb_build_object(
      'match_id',         NEW.match_id,
      'blitz_request_id', v_request_id,
      'host_id',          v_host_id
    )
  );

  PERFORM public.call_push_notification(
    NEW.user_id,
    '⚡ Blitz-Anfrage angenommen!',
    'Du wurdest für den Blitz zugelassen – der Chat startet jetzt!',
    'blitz_accepted',
    jsonb_build_object(
      'match_id',         NEW.match_id,
      'blitz_request_id', v_request_id,
      'host_id',          v_host_id
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_blitz_participant_added ON public.blitz_match_participants;
CREATE TRIGGER trg_notify_blitz_participant_added
  AFTER INSERT ON public.blitz_match_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_blitz_participant_added();