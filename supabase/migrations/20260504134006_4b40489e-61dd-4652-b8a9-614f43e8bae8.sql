-- Admin DELETE policies for blitz tables
CREATE POLICY "Admins can delete any blitz request"
ON public.blitz_requests
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete any blitz match"
ON public.blitz_matches
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete any blitz swipe"
ON public.blitz_swipes
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete any blitz chat message"
ON public.blitz_chat_messages
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Realtime: ensure full row data + publication for blitz_matches
ALTER TABLE public.blitz_matches REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'blitz_matches'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.blitz_matches';
  END IF;
END $$;