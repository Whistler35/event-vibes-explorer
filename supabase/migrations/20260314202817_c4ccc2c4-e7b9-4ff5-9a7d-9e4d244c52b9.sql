
-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL, -- 'new_dm', 'friend_event_created', 'friend_joined_event'
  title text NOT NULL,
  body text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Index for fast queries
CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, is_read, created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function: notify on new DM
CREATE OR REPLACE FUNCTION public.notify_new_dm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_other_id uuid;
  v_sender_name text;
  v_conv record;
BEGIN
  -- Get conversation to find recipient
  SELECT * INTO v_conv FROM direct_conversations WHERE id = NEW.conversation_id;
  IF v_conv IS NULL THEN RETURN NEW; END IF;

  IF v_conv.participant1_id = NEW.sender_id THEN
    v_other_id := v_conv.participant2_id;
  ELSE
    v_other_id := v_conv.participant1_id;
  END IF;

  SELECT name INTO v_sender_name FROM profiles WHERE user_id = NEW.sender_id LIMIT 1;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    v_other_id,
    'new_dm',
    'Neue Nachricht',
    COALESCE(v_sender_name, 'Jemand') || ': ' || LEFT(NEW.message, 80),
    jsonb_build_object('conversation_id', NEW.conversation_id, 'sender_id', NEW.sender_id)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_dm
  AFTER INSERT ON public.direct_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_dm();

-- Function: notify friends when user creates an event
CREATE OR REPLACE FUNCTION public.notify_friend_event_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator_name text;
  v_friend_id uuid;
BEGIN
  -- Only for approved events
  IF NEW.approval_status != 'approved' THEN RETURN NEW; END IF;
  IF NEW.created_by IS NULL THEN RETURN NEW; END IF;

  SELECT name INTO v_creator_name FROM profiles WHERE user_id = NEW.created_by LIMIT 1;

  FOR v_friend_id IN
    SELECT CASE WHEN requester_id = NEW.created_by THEN addressee_id ELSE requester_id END
    FROM friendships
    WHERE status = 'accepted'
      AND (requester_id = NEW.created_by OR addressee_id = NEW.created_by)
  LOOP
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      v_friend_id,
      'friend_event_created',
      'Neues Event',
      COALESCE(v_creator_name, 'Ein Freund') || ' hat "' || LEFT(NEW.title, 50) || '" erstellt',
      jsonb_build_object('event_id', NEW.id, 'creator_id', NEW.created_by)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_friend_event_created
  AFTER INSERT OR UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_friend_event_created();

-- Function: notify friends when user joins an event
CREATE OR REPLACE FUNCTION public.notify_friend_joined_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_joiner_name text;
  v_event_title text;
  v_friend_id uuid;
BEGIN
  SELECT name INTO v_joiner_name FROM profiles WHERE user_id = NEW.user_id LIMIT 1;
  SELECT title INTO v_event_title FROM events WHERE id = NEW.event_id LIMIT 1;

  FOR v_friend_id IN
    SELECT CASE WHEN requester_id = NEW.user_id THEN addressee_id ELSE requester_id END
    FROM friendships
    WHERE status = 'accepted'
      AND (requester_id = NEW.user_id OR addressee_id = NEW.user_id)
  LOOP
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      v_friend_id,
      'friend_joined_event',
      'Event Teilnahme',
      COALESCE(v_joiner_name, 'Ein Freund') || ' nimmt an "' || LEFT(COALESCE(v_event_title, 'Event'), 50) || '" teil',
      jsonb_build_object('event_id', NEW.event_id, 'joiner_id', NEW.user_id)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_friend_joined_event
  AFTER INSERT ON public.event_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_friend_joined_event();
