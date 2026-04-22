-- 1) Restrict notifications INSERT: users may only create notifications for themselves.
--    Other-user notifications must go through the SECURITY DEFINER helper below.
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

CREATE POLICY "Users can insert own notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Helper: trusted server-side notification creation (callable from edge functions / triggers).
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id uuid,
  _type text,
  _title text,
  _body text,
  _data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (_user_id, _type, _title, _body, COALESCE(_data, '{}'::jsonb))
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_notification(uuid, text, text, text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, jsonb) TO authenticated, service_role;

-- 2) Restrict event_likes SELECT to authenticated users only.
DROP POLICY IF EXISTS "Users can view all likes" ON public.event_likes;

CREATE POLICY "Authenticated users can view likes"
ON public.event_likes
FOR SELECT
TO authenticated
USING (true);
