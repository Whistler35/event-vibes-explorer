ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS tickets_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS external_ticket_url text;

-- Update trigger to only create tickets when tickets_enabled AND no external link
CREATE OR REPLACE FUNCTION public.create_ticket_on_join()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_token TEXT;
  v_enabled boolean;
  v_external text;
BEGIN
  SELECT tickets_enabled, external_ticket_url
    INTO v_enabled, v_external
    FROM public.events
    WHERE id = NEW.event_id;

  IF NOT COALESCE(v_enabled, false) THEN
    RETURN NEW;
  END IF;

  IF v_external IS NOT NULL AND length(trim(v_external)) > 0 THEN
    RETURN NEW;
  END IF;

  v_code := upper(substring(encode(gen_random_bytes(4), 'hex') from 1 for 8));
  v_token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO public.event_tickets (event_id, user_id, ticket_code, qr_token)
  VALUES (NEW.event_id, NEW.user_id, v_code, v_token)
  ON CONFLICT (event_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$;