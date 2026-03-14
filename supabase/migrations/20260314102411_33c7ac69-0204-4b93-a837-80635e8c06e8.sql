
-- Allow users to view unlisted events from their accepted friends
CREATE POLICY "Friends can view unlisted events" ON public.events
  FOR SELECT TO authenticated
  USING (
    visibility = 'unlisted' AND
    EXISTS (
      SELECT 1 FROM public.friendships
      WHERE status = 'accepted'
      AND (
        (requester_id = auth.uid() AND addressee_id = events.created_by)
        OR (addressee_id = auth.uid() AND requester_id = events.created_by)
      )
    )
  );
