
-- Function to auto-create host profile on user confirmation
CREATE OR REPLACE FUNCTION public.handle_host_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan_id uuid;
BEGIN
  -- Only run when user is confirmed (email verified)
  IF NEW.email_confirmed_at IS NOT NULL 
     AND (OLD.email_confirmed_at IS NULL OR OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at)
     AND (NEW.raw_user_meta_data->>'is_professional_host')::boolean = true
  THEN
    -- Get default plan (pay-per-event)
    SELECT id INTO _plan_id FROM public.subscription_plans WHERE slug = 'pay-per-event' LIMIT 1;

    -- Assign professional_host role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'professional_host')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Create host profile
    INSERT INTO public.host_profiles (user_id, company_name, current_plan_id)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'company_name',
      _plan_id
    )
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users
CREATE TRIGGER on_host_registration
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_host_registration();
