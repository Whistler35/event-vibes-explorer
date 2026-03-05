
-- Fix: Tighten event_chats INSERT policy - WITH CHECK (false) means only SECURITY DEFINER triggers can insert
DROP POLICY IF EXISTS "System can create event chats" ON public.event_chats;
CREATE POLICY "Only system can create event chats"
  ON public.event_chats FOR INSERT
  WITH CHECK (false);
