
-- 1) notifications: drop the public-insert escape hatch.
--    DB triggers run with definer privileges and bypass RLS, so the app's
--    notification creation flow keeps working. Users can still insert their
--    own notifications via the existing authenticated policy.
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

CREATE POLICY "Service role can insert notifications"
ON public.notifications
FOR INSERT
TO public
WITH CHECK (auth.role() = 'service_role');

-- 2) event_views: validate viewer_id matches the current user (or is null for
--    anonymous tracking). Prevents spoofing another user's view history.
DROP POLICY IF EXISTS "Anyone can insert event views" ON public.event_views;

CREATE POLICY "Anyone can insert event views"
ON public.event_views
FOR INSERT
TO public
WITH CHECK (viewer_id IS NULL OR viewer_id = auth.uid());

-- 3) site_visits: same treatment — visitor_id may be null (anonymous) but if
--    set, must match the authenticated user.
DROP POLICY IF EXISTS "Anyone can insert site visits" ON public.site_visits;

CREATE POLICY "Anyone can insert site visits"
ON public.site_visits
FOR INSERT
TO public
WITH CHECK (visitor_id IS NULL OR visitor_id = auth.uid());
