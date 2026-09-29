-- Guard needed for the upcoming "admin posts a standalone feed photo with no
-- real Huddle" feature: it creates a blitz_requests/blitz_matches pair
-- purely as a container so the existing feed data model (which always joins
-- through a real match -> request) keeps working, with expires_at set to
-- the past so it never shows up as an active/joinable Blitz anywhere. But
-- an INSERT on blitz_requests unconditionally fires this nearby-push
-- trigger regardless of expires_at — without this guard, that synthetic
-- row would blast a real "come join now" push to everyone in radius for a
-- Blitz that was never actually joinable. A Blitz that's already expired
-- at the moment it's created should never notify anyone, full stop — not
-- just for this feature.

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
  IF NEW.expires_at IS NOT NULL AND NEW.expires_at <= now() THEN RETURN NEW; END IF;

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
