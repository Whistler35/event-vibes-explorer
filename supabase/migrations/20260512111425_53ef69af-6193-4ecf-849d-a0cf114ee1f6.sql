
CREATE OR REPLACE FUNCTION public.update_event_participant_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.events
      SET current_participants = COALESCE(current_participants, 0) + 1
      WHERE id = NEW.event_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.events
      SET current_participants = GREATEST(COALESCE(current_participants, 1) - 1, 0)
      WHERE id = OLD.event_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_event_participant_count_ins ON public.event_participants;
DROP TRIGGER IF EXISTS trg_update_event_participant_count_del ON public.event_participants;

CREATE TRIGGER trg_update_event_participant_count_ins
AFTER INSERT ON public.event_participants
FOR EACH ROW EXECUTE FUNCTION public.update_event_participant_count();

CREATE TRIGGER trg_update_event_participant_count_del
AFTER DELETE ON public.event_participants
FOR EACH ROW EXECUTE FUNCTION public.update_event_participant_count();

-- Backfill existing counts
UPDATE public.events e
SET current_participants = sub.cnt
FROM (
  SELECT event_id, COUNT(*)::int AS cnt
  FROM public.event_participants
  GROUP BY event_id
) sub
WHERE e.id = sub.event_id;

UPDATE public.events
SET current_participants = 0
WHERE current_participants IS NULL
  OR id NOT IN (SELECT DISTINCT event_id FROM public.event_participants);
