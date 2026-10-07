-- Blitz images + admin features
--
--  * image_url          – optional picture on the back of a Blitz card (any user)
--  * display_name       – "Freifeld": admins can send a Blitz under a free-form
--                         name instead of their own (e.g. a brand)
--  * display_avatar_url – logo/picture shown together with display_name
--  * duration           – admins may run a Blitz for much longer than the
--                         normal 15–240 min; everyone else keeps the old limit
--                         (enforced by trigger, since the CHECK can't know roles)
--
-- Images are stored in the existing public "avatars" bucket (same pattern as
-- chat photos), so no new storage bucket/policies are needed.

ALTER TABLE public.blitz_requests
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS display_avatar_url text;

ALTER TABLE public.blitz_requests DROP CONSTRAINT IF EXISTS blitz_duration_range;
ALTER TABLE public.blitz_requests
  ADD CONSTRAINT blitz_duration_range CHECK (duration_minutes BETWEEN 15 AND 5256000);

ALTER TABLE public.blitz_requests DROP CONSTRAINT IF EXISTS blitz_display_name_length;
ALTER TABLE public.blitz_requests
  ADD CONSTRAINT blitz_display_name_length
  CHECK (display_name IS NULL OR char_length(display_name) BETWEEN 1 AND 60);

CREATE OR REPLACE FUNCTION public.enforce_blitz_admin_only_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  is_regular_user boolean;
BEGIN
  -- Server-side jobs (no JWT, e.g. expiry cron) are not restricted.
  is_regular_user := auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin');

  IF NOT is_regular_user THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.duration_minutes > 240 THEN
      RAISE EXCEPTION 'Maximale Dauer für einen Blitz sind 4 Stunden';
    END IF;
    NEW.display_name := NULL;
    NEW.display_avatar_url := NULL;
  ELSE
    IF NEW.duration_minutes IS DISTINCT FROM OLD.duration_minutes AND NEW.duration_minutes > 240 THEN
      RAISE EXCEPTION 'Maximale Dauer für einen Blitz sind 4 Stunden';
    END IF;
    NEW.display_name := OLD.display_name;
    NEW.display_avatar_url := OLD.display_avatar_url;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS blitz_admin_only_fields ON public.blitz_requests;
CREATE TRIGGER blitz_admin_only_fields
BEFORE INSERT OR UPDATE ON public.blitz_requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_blitz_admin_only_fields();

-- Public share preview: show the Freifeld name/logo instead of the admin's
-- own profile when one is set.
CREATE OR REPLACE FUNCTION public.get_public_blitz_preview(p_blitz_id uuid)
RETURNS TABLE (
  id uuid,
  activity text,
  city text,
  host_name text,
  host_avatar_url text,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    br.id,
    br.activity,
    br.city,
    COALESCE(br.display_name, p.name),
    CASE WHEN br.display_name IS NOT NULL THEN br.display_avatar_url ELSE p.avatar_url END,
    (br.status = 'active' AND br.expires_at > now())
  FROM public.blitz_requests br
  JOIN public.profiles p ON p.user_id = br.host_id
  WHERE br.id = p_blitz_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_blitz_preview(uuid) TO anon, authenticated;
