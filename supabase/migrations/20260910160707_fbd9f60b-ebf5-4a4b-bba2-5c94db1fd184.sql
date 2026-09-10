-- "Blitz in deiner Nähe" push now respects the blitz audience:
--   * public   -> everyone with a push subscription within 30 km (unchanged)
--   * friends  -> only the host's accepted friends (no distance gate — it's a
--                 targeted invite)
--   * selected -> only the users in target_user_ids (no distance gate)
-- The host is always excluded. call_push_notification silently skips users
-- without a registered push subscription.

CREATE OR REPLACE FUNCTION public.notify_blitz_nearby()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_host_name text;
  v_audience  text := NEW.audience::text;
  v_body      text;
  v_rec       record;
BEGIN
  SELECT name INTO v_host_name
    FROM public.profiles WHERE user_id = NEW.host_id LIMIT 1;

  v_body := COALESCE(v_host_name, 'Jemand') || ' sucht jemanden für ' || NEW.activity;

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
        v_body,
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
        v_body,
        'new_blitz_nearby',
        jsonb_build_object('blitz_id', NEW.id, 'host_id', NEW.host_id)
      );
    END LOOP;

  ELSE
    -- public (or any unknown audience) → nearby broadcast
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
        v_body,
        'new_blitz_nearby',
        jsonb_build_object('blitz_id', NEW.id, 'host_id', NEW.host_id)
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- trigger unchanged; recreate defensively
DROP TRIGGER IF EXISTS trg_notify_blitz_nearby ON public.blitz_requests;
CREATE TRIGGER trg_notify_blitz_nearby
  AFTER INSERT ON public.blitz_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_blitz_nearby();