-- Blitz images + admin features
--
--  * image_url          – optional picture on the back of a Blitz card (any user)
--  * display_name       – "Freifeld": admins can send a Blitz under a free-form
--                         name instead of their own (e.g. a brand)
--  * display_avatar_url – logo/picture shown together with display_name
--  * duration           – admins may run a Blitz for much longer than the
--                         normal 15–120 min (2h max in the UI); everyone else keeps that limit
--                         (enforced by trigger, since the CHECK can't know roles)
--
-- Images are stored in the existing public "avatars" bucket (same pattern as
-- chat photos), so no new storage bucket/policies are needed.

ALTER TABLE public.blitz_requests
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS display_avatar_url text;

ALTER TABLE public.blitz_requests DROP CONSTRAINT IF EXISTS blitz_duration_range;
ALTER TABLE public.blitz_requests
  ADD CONSTRAINT blitz_duration_range CHECK (duration_minutes BETWEEN 15 AND 5256000);

ALTER TABLE public.blitz_requests DROP CONSTRAINT IF EXISTS blitz_display_name_length;
ALTER TABLE public.blitz_requests
  ADD CONSTRAINT blitz_display_name_length
  CHECK (display_name IS NULL OR char_length(display_name) BETWEEN 1 AND 60);

CREATE OR REPLACE FUNCTION public.enforce_blitz_admin_only_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  is_regular_user boolean;
BEGIN
  -- Server-side jobs (no JWT, e.g. expiry cron) are not restricted.
  is_regular_user := auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin');

  IF NOT is_regular_user THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.duration_minutes > 120 THEN
      RAISE EXCEPTION 'Maximale Dauer für einen Blitz sind 2 Stunden';
    END IF;
    NEW.display_name := NULL;
    NEW.display_avatar_url := NULL;
  ELSE
    IF NEW.duration_minutes IS DISTINCT FROM OLD.duration_minutes AND NEW.duration_minutes > 120 THEN
      RAISE EXCEPTION 'Maximale Dauer für einen Blitz sind 2 Stunden';
    END IF;
    NEW.display_name := OLD.display_name;
    NEW.display_avatar_url := OLD.display_avatar_url;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS blitz_admin_only_fields ON public.blitz_requests;
CREATE TRIGGER blitz_admin_only_fields
BEFORE INSERT OR UPDATE ON public.blitz_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_blitz_admin_only_fields();

-- Public share preview: show the Freifeld name/logo instead of the admin's
-- own profile when one is set.
CREATE OR REPLACE FUNCTION public.get_public_blitz_preview(p_blitz_id uuid)
RETURNS TABLE (
  id uuid,
  activity text,
  city text,
  host_name text,
  host_avatar_url text,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    br.id,
    br.activity,
    br.city,
    COALESCE(br.display_name, p.name),
    CASE WHEN br.display_name IS NOT NULL THEN br.display_avatar_url ELSE p.avatar_url END,
    (br.status = 'active' AND br.expires_at > now())
  FROM public.blitz_requests br
  JOIN public.profiles p ON p.user_id = br.host_id
  WHERE br.id = p_blitz_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_blitz_preview(uuid) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Notifications: when an admin sends a Blitz as a "Freifeld", every
-- notification that would name the host shows the Freifeld name instead of the
-- admin's real name — in the "you're in" notification and in Huddle chat
-- pushes. (Pushes for a newly created Blitz stay anonymous.)
-- ---------------------------------------------------------------------------

-- 1) Push when a new Blitz is created: deliberately NOT changed. These stay
--    anonymous ("Ein Freund blitzt", "Jemand …") even for a Freifeld Blitz.
--    This is the existing function, restated unchanged so the result is the
--    same no matter whether an earlier draft of this migration was run.
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

-- 2) "You're in" notification to the person who joined
CREATE OR REPLACE FUNCTION public.notify_blitz_participant_added()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_host_id     uuid;
  v_request_id  uuid;
  v_activity    text;
  v_display     text;
  v_host_name   text;
  v_joiner_name text;
  v_are_friends boolean;
BEGIN
  SELECT m.host_id, m.blitz_request_id
    INTO v_host_id, v_request_id
  FROM public.blitz_matches m
  WHERE m.id = NEW.match_id;

  IF v_host_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.user_id = v_host_id THEN RETURN NEW; END IF;

  SELECT activity, display_name INTO v_activity, v_display
    FROM public.blitz_requests WHERE id = v_request_id;
  SELECT name INTO v_host_name FROM public.profiles WHERE user_id = v_host_id;
  v_host_name := COALESCE(NULLIF(trim(v_display), ''), v_host_name);
  SELECT name INTO v_joiner_name FROM public.profiles WHERE user_id = NEW.user_id;

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

  SELECT EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
      AND ((f.requester_id = v_host_id AND f.addressee_id = NEW.user_id)
        OR (f.requester_id = NEW.user_id AND f.addressee_id = v_host_id))
  ) INTO v_are_friends;

  IF v_are_friends THEN
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_host_id, 'blitz_match', 'MATCH! ⚡',
      COALESCE(v_joiner_name, 'Jemand') || ' ist deinem Blitz "' ||
        COALESCE(v_activity, '') || '"-Huddle beigetreten!',
      jsonb_build_object('match_id', NEW.match_id, 'blitz_request_id', v_request_id, 'joiner_id', NEW.user_id)
    );
    PERFORM public.call_push_notification(
      v_host_id, '⚡ Neuer Mitstreiter!',
      COALESCE(v_joiner_name, 'Jemand') || ' ist deinem Blitz-Huddle beigetreten', 'blitz_match',
      jsonb_build_object('match_id', NEW.match_id, 'blitz_request_id', v_request_id, 'joiner_id', NEW.user_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 3) Huddle chat message push: the host's messages come from the Freifeld name
CREATE OR REPLACE FUNCTION public.notify_new_blitz_chat_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_sender_name text;
  v_activity    text;
  v_display     text;
  v_host_id     uuid;
  v_title       text;
  v_body        text;
  v_recipient   record;
BEGIN
  SELECT name INTO v_sender_name FROM public.profiles WHERE user_id = NEW.sender_id;
  SELECT r.activity, r.display_name, m.host_id
    INTO v_activity, v_display, v_host_id
  FROM public.blitz_matches m JOIN public.blitz_requests r ON r.id = m.blitz_request_id
  WHERE m.id = NEW.match_id;

  IF NEW.sender_id = v_host_id AND NULLIF(trim(v_display), '') IS NOT NULL THEN
    v_sender_name := trim(v_display);
  END IF;

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
