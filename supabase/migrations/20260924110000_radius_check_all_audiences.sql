-- Supersedes the previous attempt (20260924100000), which used a time-based
-- freshness cutoff — wrong call: users don't reopen the app every few hours,
-- and people don't move fast enough for that to matter. Correct fix per
-- Benjamin: apply the RADIUS check (using each recipient's last known
-- location, however old) to every audience — "friends" and "selected"
-- currently skip the radius check entirely and notify regardless of
-- distance. A friend or an explicitly selected person should still not get
-- a "nearby" push if their last known location isn't within the Blitz's
-- radius.
--
-- No location on file at all ("never granted permission", or a genuinely
-- stale/never-set row) means we can't confirm they're in range, so they're
-- excluded too — same as the existing public-audience behaviour.

CREATE OR REPLACE FUNCTION public.is_user_within_blitz_radius(
  p_user_id uuid, p_lat double precision, p_lng double precision, p_radius_km numeric
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public, extensions
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.push_subscriptions ps
    WHERE ps.user_id = p_user_id
      AND ps.latitude IS NOT NULL
      AND ps.longitude IS NOT NULL
      AND ST_DWithin(
        ST_SetSRID(ST_MakePoint(ps.longitude, ps.latitude), 4326)::geography,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
        COALESCE(p_radius_km, 10) * 1000
      )
  );
$$;

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
  IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN RETURN NEW; END IF;

  IF v_audience = 'friends' THEN
    FOR v_rec IN
      SELECT CASE WHEN f.requester_id = NEW.host_id THEN f.addressee_id
                  ELSE f.requester_id END AS user_id
      FROM public.friendships f
      WHERE f.status = 'accepted'
        AND (f.requester_id = NEW.host_id OR f.addressee_id = NEW.host_id)
    LOOP
      IF v_rec.user_id = NEW.host_id THEN CONTINUE; END IF;
      IF NOT public.is_user_within_blitz_radius(v_rec.user_id, NEW.latitude, NEW.longitude, NEW.radius_km) THEN
        CONTINUE;
      END IF;
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
      IF NOT public.is_user_within_blitz_radius(v_rec.user_id, NEW.latitude, NEW.longitude, NEW.radius_km) THEN
        CONTINUE;
      END IF;
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
    -- limited to the radius the host chose when creating the Blitz.
    FOR v_rec IN
      SELECT DISTINCT user_id
      FROM public.push_subscriptions
      WHERE user_id <> NEW.host_id
        AND latitude  IS NOT NULL
        AND longitude IS NOT NULL
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
