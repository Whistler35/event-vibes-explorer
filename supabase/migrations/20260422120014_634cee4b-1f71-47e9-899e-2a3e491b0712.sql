-- 1) profiles: restrict public SELECT to authenticated users only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 2) event-images storage bucket: remove the permissive INSERT/UPDATE policies
-- that don't enforce folder ownership, so only the path-scoped ones remain.
DROP POLICY IF EXISTS "Auth users can upload event images" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can update event images" ON storage.objects;

-- 3) event_participants: restrict SELECT to event owner, participants themselves,
-- and admins (no longer expose full attendee list to every authenticated user).
DROP POLICY IF EXISTS "Authenticated users can view participants" ON public.event_participants;

CREATE POLICY "Participants, owners and admins can view participants"
ON public.event_participants
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_participants.event_id
      AND e.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.event_participants ep2
    WHERE ep2.event_id = event_participants.event_id
      AND ep2.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- 4) event_likes: restrict SELECT to the like owner, the event creator, and admins.
DROP POLICY IF EXISTS "Authenticated users can view likes" ON public.event_likes;

CREATE POLICY "Like owner, event creator and admins can view likes"
ON public.event_likes
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_likes.event_id
      AND e.created_by = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);