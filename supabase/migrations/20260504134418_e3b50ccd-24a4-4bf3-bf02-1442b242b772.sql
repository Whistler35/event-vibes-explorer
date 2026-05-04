-- 1. Enum für Audience
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'blitz_audience') THEN
    CREATE TYPE public.blitz_audience AS ENUM ('public', 'friends');
  END IF;
END $$;

-- 2. Spalte
ALTER TABLE public.blitz_requests
  ADD COLUMN IF NOT EXISTS audience public.blitz_audience NOT NULL DEFAULT 'public';

-- 3. Bestehende SELECT-Policy ersetzen, damit "friends" nur für Freunde sichtbar ist
DROP POLICY IF EXISTS "Authenticated users view active blitz requests" ON public.blitz_requests;

CREATE POLICY "Authenticated users view active blitz requests"
ON public.blitz_requests
FOR SELECT
TO authenticated
USING (
  status = 'active'::blitz_status
  AND expires_at > now()
  AND (
    audience = 'public'::public.blitz_audience
    OR host_id = auth.uid()
    OR (
      audience = 'friends'::public.blitz_audience
      AND EXISTS (
        SELECT 1 FROM public.friendships f
        WHERE f.status = 'accepted'
          AND (
            (f.requester_id = auth.uid() AND f.addressee_id = blitz_requests.host_id)
            OR
            (f.addressee_id = auth.uid() AND f.requester_id = blitz_requests.host_id)
          )
      )
    )
  )
);