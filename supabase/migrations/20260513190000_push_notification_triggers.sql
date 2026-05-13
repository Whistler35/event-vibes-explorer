-- ================================================================
-- Push Notification Triggers
-- All 5 notification types call send-push-notification via pg_net.
-- verify_jwt = false must be set for send-push-notification in
-- config.toml so the DB can call it without a JWT.
-- ================================================================

-- pg_net is already enabled; ensure it's available in this session
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Location columns for 30km radius checks
ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS latitude  double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

-- ----------------------------------------------------------------
-- Helper: fire-and-forget push via pg_net
-- Errors are caught so they never break the triggering transaction.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.call_push_notification(
  p_user_id uuid,
  p_title   text,
  p_body    text,
  p_type    text,
  p_data    jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Skip if user has no registered subscription
  IF NOT EXISTS (
    SELECT 1 FROM public.push_subscriptions WHERE user_id = p_user_id LIMIT 1
  ) THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := 'https://yhetszgeflsldahfuwen.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body    := jsonb_build_object(
      'userId',       p_user_id,
      'notification', jsonb_build_object(
        'title', p_title,
        'body',  p_body,
        'icon',  '/app-icon.png',
        'data',  p_data || jsonb_build_object('type', p_type)
      )
    )
  );
EXCEPTION WHEN OTHERS THEN
  NULL; -- never break the triggering transaction
END;
$$;

-- ================================================================
-- 1. NEW BLITZ in 30 km radius
-- ================================================================
CREATE OR REPLACE FUNCTION public.notify_blitz_nearby()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_host_name text;
  v_sub       record;
BEGIN
  IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN RETURN NEW; END IF;

  SELECT name INTO v_host_name
    FROM public.profiles WHERE user_id = NEW.host_id LIMIT 1;

  FOR v_sub IN
    SELECT DISTINCT user_id
    FROM public.push_subscriptions
    WHERE user_id != NEW.host_id
      AND latitude  IS NOT NULL
      AND longitude IS NOT NULL
      AND ST_DWithin(
        ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
        ST_SetSRID(ST_MakePoint(NEW.longitude,  NEW.latitude), 4326)::geography,
        30000   -- metres
      )
  LOOP
    PERFORM public.call_push_notification(
      v_sub.user_id,
      '⚡ Neuer Blitz in der Nähe',
      COALESCE(v_host_name, 'Jemand') || ' sucht jemanden für ' || NEW.activity,
      'new_blitz_nearby',
      jsonb_build_object('blitz_id', NEW.id, 'host_id', NEW.host_id)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_blitz_nearby ON public.blitz_requests;
CREATE TRIGGER trg_notify_blitz_nearby
  AFTER INSERT ON public.blitz_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_blitz_nearby();

-- ================================================================
-- 2. NEW EVENT in 30 km radius
-- ================================================================
CREATE OR REPLACE FUNCTION public.notify_event_nearby()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_sub record;
BEGIN
  -- Only fire on fresh public events (INSERT or visibility flip to public)
  IF TG_OP = 'UPDATE' AND
     (OLD.visibility = NEW.visibility OR NEW.visibility::text != 'public') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' AND NEW.visibility::text != 'public' THEN RETURN NEW; END IF;
  IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN RETURN NEW; END IF;

  FOR v_sub IN
    SELECT DISTINCT user_id
    FROM public.push_subscriptions
    WHERE user_id != COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000'::uuid)
      AND latitude  IS NOT NULL
      AND longitude IS NOT NULL
      AND ST_DWithin(
        ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
        ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography,
        30000
      )
  LOOP
    PERFORM public.call_push_notification(
      v_sub.user_id,
      '🗺️ Neues Event in deiner Nähe',
      NEW.title,
      'new_event_nearby',
      jsonb_build_object('event_id', NEW.id)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_event_nearby ON public.events;
CREATE TRIGGER trg_notify_event_nearby
  AFTER INSERT OR UPDATE OF visibility ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_event_nearby();

-- ================================================================
-- 3. NEW DIRECT MESSAGE
-- Replaces existing notify_new_dm() to add emoji title + push call.
-- The trigger trg_notify_new_dm already exists — we only replace
-- the function body, no need to recreate the trigger.
-- ================================================================
CREATE OR REPLACE FUNCTION public.notify_new_dm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_other_id    uuid;
  v_sender_name text;
  v_conv        record;
  v_title       text;
  v_body        text;
BEGIN
  SELECT * INTO v_conv
    FROM public.direct_conversations WHERE id = NEW.conversation_id;
  IF v_conv IS NULL THEN RETURN NEW; END IF;

  v_other_id := CASE
    WHEN v_conv.participant1_id = NEW.sender_id THEN v_conv.participant2_id
    ELSE v_conv.participant1_id
  END;

  SELECT name INTO v_sender_name
    FROM public.profiles WHERE user_id = NEW.sender_id LIMIT 1;

  v_title := '💬 Neue Nachricht von ' || COALESCE(v_sender_name, 'Jemand');
  v_body  := LEFT(NEW.message, 100);

  -- in-app notification
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_other_id, 'new_dm', v_title, v_body,
    jsonb_build_object(
      'conversation_id', NEW.conversation_id,
      'sender_id',       NEW.sender_id
    )
  );

  -- push notification
  PERFORM public.call_push_notification(
    v_other_id, v_title, v_body, 'new_dm',
    jsonb_build_object(
      'conversation_id', NEW.conversation_id,
      'sender_id',       NEW.sender_id
    )
  );

  RETURN NEW;
END;
$$;

-- ================================================================
-- 4. CO-PARTICIPANT JOINED EVENT
-- Notifies everyone already at the event when someone new joins.
-- ================================================================
CREATE OR REPLACE FUNCTION public.notify_participant_joined()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_joiner_name text;
  v_event_title text;
  v_co_part     record;
BEGIN
  SELECT name  INTO v_joiner_name
    FROM public.profiles WHERE user_id = NEW.user_id LIMIT 1;
  SELECT title INTO v_event_title
    FROM public.events WHERE id = NEW.event_id LIMIT 1;

  FOR v_co_part IN
    SELECT user_id
    FROM public.event_participants
    WHERE event_id = NEW.event_id
      AND user_id != NEW.user_id
  LOOP
    PERFORM public.call_push_notification(
      v_co_part.user_id,
      '👥 Jemand nimmt auch teil!',
      COALESCE(v_joiner_name, 'Jemand') || ' nimmt auch an ' ||
        COALESCE(v_event_title, 'deinem Event') || ' teil',
      'friend_joined_event',
      jsonb_build_object('event_id', NEW.event_id, 'joiner_id', NEW.user_id)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_participant_joined ON public.event_participants;
CREATE TRIGGER trg_notify_participant_joined
  AFTER INSERT ON public.event_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_participant_joined();

-- ================================================================
-- 5. FRIEND REQUEST RECEIVED
-- ================================================================
CREATE OR REPLACE FUNCTION public.notify_friend_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_requester_name text;
  v_title          text;
  v_body           text;
BEGIN
  IF NEW.status != 'pending' THEN RETURN NEW; END IF;

  SELECT name INTO v_requester_name
    FROM public.profiles WHERE user_id = NEW.requester_id LIMIT 1;

  v_title := '🤝 Neue Freundschaftsanfrage';
  v_body  := COALESCE(v_requester_name, 'Jemand') || ' möchte dein Freund sein';

  -- in-app notification
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    NEW.addressee_id, 'friend_request', v_title, v_body,
    jsonb_build_object(
      'from_user_id',  NEW.requester_id,
      'friendship_id', NEW.id
    )
  );

  -- push notification
  PERFORM public.call_push_notification(
    NEW.addressee_id, v_title, v_body, 'friend_request',
    jsonb_build_object(
      'from_user_id',  NEW.requester_id,
      'friendship_id', NEW.id
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_friend_request ON public.friendships;
CREATE TRIGGER trg_notify_friend_request
  AFTER INSERT ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_friend_request();
