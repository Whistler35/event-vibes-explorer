
-- Notify when someone sends a friend request
CREATE OR REPLACE FUNCTION public.notify_friend_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requester_name text;
BEGIN
  IF NEW.status != 'pending' THEN RETURN NEW; END IF;

  SELECT name INTO v_requester_name FROM profiles WHERE user_id = NEW.requester_id LIMIT 1;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    NEW.addressee_id,
    'friend_request',
    'Freundschaftsanfrage',
    COALESCE(v_requester_name, 'Jemand') || ' möchte dein Freund werden',
    jsonb_build_object('requester_id', NEW.requester_id, 'friendship_id', NEW.id)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_friend_request
  AFTER INSERT ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_friend_request();

-- Notify when friend request is accepted
CREATE OR REPLACE FUNCTION public.notify_friend_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_accepter_name text;
BEGIN
  IF OLD.status = 'accepted' THEN RETURN NEW; END IF;
  IF NEW.status != 'accepted' THEN RETURN NEW; END IF;

  SELECT name INTO v_accepter_name FROM profiles WHERE user_id = NEW.addressee_id LIMIT 1;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    NEW.requester_id,
    'friend_accepted',
    'Anfrage bestätigt',
    COALESCE(v_accepter_name, 'Jemand') || ' hat deine Freundschaftsanfrage angenommen 🎉',
    jsonb_build_object('friend_id', NEW.addressee_id, 'friendship_id', NEW.id)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_friend_accepted
  AFTER UPDATE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_friend_accepted();
