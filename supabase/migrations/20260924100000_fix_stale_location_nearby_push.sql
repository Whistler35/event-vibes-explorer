-- Bug: "Neuer Blitz in der Nähe" pushes used push_subscriptions.latitude/
-- longitude, which is only refreshed when the app comes to the foreground
-- (see refreshLocation() in usePushNotifications.ts). The Discover feed,
-- by contrast, asks navigator.geolocation for a fresh fix every time it
-- loads. So someone who hasn't opened the app in a while can get a "nearby"
-- push from a stale, no-longer-accurate stored location, then find nothing
-- nearby when they actually check Discover — exactly what was reported
-- (host blitzed in Germany, a stale row placed the recipient nearby even
-- though they were really in Austria at the time).
--
-- Fix: only consider push_subscriptions rows updated recently enough to be
-- trusted for a "you're nearby right now" notification.
CREATE OR REPLACE FUNCTION public.notify_blitz_nearby()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_audience text := NEW.audience::text;
  v_rec      record;
BEGIN
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
        '⚡ Neuer Blitz in deiner Nähe',
        'Ein Freund blitzt gerade – schau vorbei!',
        'new_blitz_nearby',
        jsonb_build_object('blitz_id', NEW.id)
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
        '⚡ Du wurdest zu einem Blitz eingeladen',
        'Jemand lädt dich zu einem spontanen Blitz ein!',
        'new_blitz_nearby',
        jsonb_build_object('blitz_id', NEW.id)
      );
    END LOOP;

  ELSE
    -- public (or any unknown audience) → nearby broadcast, no details,
    -- limited to the radius the host chose when creating the Blitz, AND
    -- only to devices whose stored location is fresh (updated in the last
    -- 6 hours) — a stale fix is worse than no notification at all here.
    IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN RETURN NEW; END IF;
    FOR v_rec IN
      SELECT DISTINCT user_id
      FROM public.push_subscriptions
      WHERE user_id <> NEW.host_id
        AND latitude   IS NOT NULL
        AND longitude  IS NOT NULL
        AND updated_at >= now() - interval '6 hours'
        AND ST_DWithin(
          ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
          ST_SetSRID(ST_MakePoint(NEW.longitude,  NEW.latitude), 4326)::geography,
          COALESCE(NEW.radius_km, 10) * 1000
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
