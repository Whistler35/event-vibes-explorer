-- Allow admins to delete any event
CREATE POLICY "Admins can delete all events"
ON public.events
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));