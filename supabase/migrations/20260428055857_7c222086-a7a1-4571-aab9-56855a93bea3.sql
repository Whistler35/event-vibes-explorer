
-- Create tickets table
CREATE TABLE public.event_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL,
  user_id UUID NOT NULL,
  ticket_code TEXT NOT NULL UNIQUE,
  qr_token TEXT NOT NULL UNIQUE,
  checked_in_at TIMESTAMP WITH TIME ZONE,
  checked_in_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_event_tickets_event ON public.event_tickets(event_id);
CREATE INDEX idx_event_tickets_user ON public.event_tickets(user_id);
CREATE INDEX idx_event_tickets_qr ON public.event_tickets(qr_token);

-- Enable RLS
ALTER TABLE public.event_tickets ENABLE ROW LEVEL SECURITY;

-- Users see their own tickets
CREATE POLICY "Users view own tickets"
ON public.event_tickets FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Event creators and admins see all tickets for their events
CREATE POLICY "Owners and admins view event tickets"
ON public.event_tickets FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM events e WHERE e.id = event_tickets.event_id AND e.created_by = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Event creators and admins can update (check-in) tickets
CREATE POLICY "Owners and admins can check-in tickets"
ON public.event_tickets FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM events e WHERE e.id = event_tickets.event_id AND e.created_by = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Auto-generate ticket when user joins event
CREATE OR REPLACE FUNCTION public.create_ticket_on_join()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_token TEXT;
BEGIN
  -- Short readable code: 8 hex chars
  v_code := upper(substring(encode(gen_random_bytes(4), 'hex') from 1 for 8));
  -- Long secure token for QR (64 chars)
  v_token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO public.event_tickets (event_id, user_id, ticket_code, qr_token)
  VALUES (NEW.event_id, NEW.user_id, v_code, v_token)
  ON CONFLICT (event_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_ticket_on_join
AFTER INSERT ON public.event_participants
FOR EACH ROW
EXECUTE FUNCTION public.create_ticket_on_join();

-- Auto-remove ticket when user leaves event
CREATE OR REPLACE FUNCTION public.remove_ticket_on_leave()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.event_tickets
  WHERE event_id = OLD.event_id AND user_id = OLD.user_id AND checked_in_at IS NULL;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_remove_ticket_on_leave
AFTER DELETE ON public.event_participants
FOR EACH ROW
EXECUTE FUNCTION public.remove_ticket_on_leave();

-- Backfill: create tickets for existing participants
INSERT INTO public.event_tickets (event_id, user_id, ticket_code, qr_token)
SELECT 
  ep.event_id,
  ep.user_id,
  upper(substring(encode(gen_random_bytes(4), 'hex') from 1 for 8)),
  encode(gen_random_bytes(32), 'hex')
FROM public.event_participants ep
ON CONFLICT (event_id, user_id) DO NOTHING;
