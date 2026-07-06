
ALTER TABLE public.blitz_requests
  ADD COLUMN IF NOT EXISTS target_user_ids uuid[] DEFAULT NULL;

DROP POLICY IF EXISTS "Blitz requests visibility" ON public.blitz_requests;
DROP POLICY IF EXISTS "blitz_requests_select" ON public.blitz_requests;
DROP POLICY IF EXISTS "blitz_requests_select_v2" ON public.blitz_requests;
DROP POLICY IF EXISTS "Users can view own or friends' blitz requests" ON public.blitz_requests;
DROP POLICY IF EXISTS "Users can view public blitz requests" ON public.blitz_requests;

CREATE POLICY "blitz_requests_select_v2" ON public.blitz_requests
  FOR SELECT
  TO authenticated
  USING (
    host_id = auth.uid()
    OR (audience = 'public')
    OR (
      audience = 'friends'
      AND EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE f.status = 'accepted'
          AND (
            (f.requester_id = host_id AND f.addressee_id = auth.uid())
            OR (f.addressee_id = host_id AND f.requester_id = auth.uid())
          )
      )
    )
    OR (
      audience = 'selected'
      AND target_user_ids IS NOT NULL
      AND auth.uid() = ANY(target_user_ids)
    )
  );

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS phone_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique_idx
  ON public.profiles (phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS profiles_phone_hash_idx
  ON public.profiles (phone_hash) WHERE phone_hash IS NOT NULL;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.sync_profile_phone_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.phone IS NOT NULL AND NEW.phone <> '' THEN
    NEW.phone_hash := encode(extensions.digest(NEW.phone, 'sha256'), 'hex');
  ELSE
    NEW.phone_hash := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_sync_phone_hash ON public.profiles;
CREATE TRIGGER profiles_sync_phone_hash
  BEFORE INSERT OR UPDATE OF phone ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_phone_hash();
