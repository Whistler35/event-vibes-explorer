-- Helper function to check if a user participates in an event
-- SECURITY DEFINER bypasses RLS to avoid recursion when used inside a policy on event_participants
CREATE OR REPLACE FUNCTION public.user_participates_in_event(_event_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_participants
    WHERE event_id = _event_id AND user_id = _user_id
  );
$$;

-- Drop and recreate the recursive SELECT policy
DROP POLICY IF EXISTS "Participants, owners and admins can view participants" ON public.event_participants;

CREATE POLICY "Participants, owners and admins can view participants"
ON public.event_participants
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_participants.event_id AND e.created_by = auth.uid())
  OR public.user_participates_in_event(event_participants.event_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- Recreate the INSERT policy explicitly for authenticated users (was 'public', causing auth.uid() to be null)
DROP POLICY IF EXISTS "Auth users can join events" ON public.event_participants;

CREATE POLICY "Auth users can join events"
ON public.event_participants
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Same for DELETE
DROP POLICY IF EXISTS "Users can leave events" ON public.event_participants;

CREATE POLICY "Users can leave events"
ON public.event_participants
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);