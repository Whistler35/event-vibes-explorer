-- 1) "Neuer Blitz in deiner Nähe" must NEVER reveal who's hosting or what the
--    activity is — for ANY audience (public, friends, or selected), not just
--    public. Bring the friends/selected branches in line with the already-
--    anonymised public branch.
-- 2) The public/nearby broadcast used a hardcoded 30km radius instead of the
--    radius the Blitz host actually chose (blitz_requests.radius_km).

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
    -- limited to the radius the host chose when creating the Blitz.
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
