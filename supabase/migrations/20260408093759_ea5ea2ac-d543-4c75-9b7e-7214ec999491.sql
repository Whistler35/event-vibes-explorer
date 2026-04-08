
-- Add website and instagram to host_profiles
ALTER TABLE public.host_profiles
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS instagram_username text;

-- Update the trigger function to also save website + instagram
CREATE OR REPLACE FUNCTION public.handle_host_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan_id uuid;
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL 
     AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at)
     AND (NEW.raw_user_meta_data->>'is_professional_host')::boolean = true
  THEN
    SELECT id INTO _plan_id FROM public.subscription_plans WHERE slug = 'pay-per-event' LIMIT 1;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'professional_host')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.host_profiles (user_id, company_name, current_plan_id, website_url, instagram_username)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'company_name',
      _plan_id,
      NEW.raw_user_meta_data->>'website_url',
      NEW.raw_user_meta_data->>'instagram_username'
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
