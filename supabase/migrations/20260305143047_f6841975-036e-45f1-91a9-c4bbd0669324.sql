
-- Create approval status enum
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');

-- Add approval_status column to events, default 'pending'
ALTER TABLE public.events ADD COLUMN approval_status public.approval_status NOT NULL DEFAULT 'pending';

-- Set all existing events to approved
UPDATE public.events SET approval_status = 'approved';

-- Drop the old SELECT policy
DROP POLICY IF EXISTS "Public can view visible events" ON public.events;

-- New SELECT policy: only approved + public events visible to everyone
CREATE POLICY "Public can view approved visible events"
ON public.events FOR SELECT
USING (
  visibility = 'public'::event_visibility 
  AND approval_status = 'approved'::approval_status
);

-- Allow creators to see their own pending events
CREATE POLICY "Users can view own events"
ON public.events FOR SELECT TO authenticated
USING (auth.uid() = created_by);
