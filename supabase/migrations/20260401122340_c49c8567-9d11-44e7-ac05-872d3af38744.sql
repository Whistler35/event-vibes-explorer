
CREATE OR REPLACE FUNCTION public.notify_admins_new_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Only trigger for new pending community events
  IF NEW.approval_status = 'pending' THEN
    FOR admin_record IN
      SELECT user_id FROM public.user_roles WHERE role = 'admin'
    LOOP
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (
        admin_record.user_id,
        'new_event_pending',
        'Neues Event zur Freigabe',
        'Das Event "' || NEW.title || '" wartet auf deine Freigabe.',
        jsonb_build_object('event_id', NEW.id, 'event_title', NEW.title)
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_new_event_notify_admins ON public.events;

-- Create trigger
CREATE TRIGGER on_new_event_notify_admins
  AFTER INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins_new_event();
