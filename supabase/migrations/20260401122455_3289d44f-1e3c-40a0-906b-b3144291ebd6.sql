
CREATE OR REPLACE FUNCTION public.notify_creator_event_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger when approval_status changes and creator exists
  IF OLD.approval_status IS DISTINCT FROM NEW.approval_status AND NEW.created_by IS NOT NULL THEN
    IF NEW.approval_status = 'approved' THEN
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (
        NEW.created_by,
        'event_approved',
        'Event freigegeben ✅',
        'Dein Event "' || NEW.title || '" wurde genehmigt und ist jetzt sichtbar!',
        jsonb_build_object('event_id', NEW.id, 'event_title', NEW.title)
      );
    ELSIF NEW.approval_status = 'rejected' THEN
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (
        NEW.created_by,
        'event_rejected',
        'Event abgelehnt',
        'Dein Event "' || NEW.title || '" wurde leider abgelehnt.',
        jsonb_build_object('event_id', NEW.id, 'event_title', NEW.title)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_event_decision_notify_creator ON public.events;

CREATE TRIGGER on_event_decision_notify_creator
  AFTER UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_creator_event_decision();
