CREATE OR REPLACE FUNCTION public.create_ticket_on_join()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_code TEXT;
  v_token TEXT;
BEGIN
  v_code := upper(substring(encode(extensions.gen_random_bytes(4), 'hex') from 1 for 8));
  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  INSERT INTO public.event_tickets (event_id, user_id, ticket_code, qr_token)
  VALUES (NEW.event_id, NEW.user_id, v_code, v_token)
  ON CONFLICT (event_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;