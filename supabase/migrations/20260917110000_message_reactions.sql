-- Double-tap-to-heart reactions on chat messages (DM + Huddle), like
-- WhatsApp/Instagram. Two separate tables mirroring the two separate
-- message tables (direct_messages / blitz_chat_messages), each carrying
-- its own scope id (conversation_id / match_id) directly so realtime can
-- filter cheaply without a join.

CREATE TABLE IF NOT EXISTS public.direct_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.direct_messages(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.direct_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL DEFAULT '❤️',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS public.blitz_chat_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.blitz_chat_messages(id) ON DELETE CASCADE,
  match_id uuid NOT NULL REFERENCES public.blitz_matches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL DEFAULT '❤️',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

ALTER TABLE public.direct_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blitz_chat_message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view DM reactions"
ON public.direct_message_reactions FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.direct_conversations dc
  WHERE dc.id = direct_message_reactions.conversation_id
    AND (dc.participant1_id = auth.uid() OR dc.participant2_id = auth.uid())
));

CREATE POLICY "Participants can add DM reactions"
ON public.direct_message_reactions FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.direct_conversations dc
    WHERE dc.id = direct_message_reactions.conversation_id
      AND (dc.participant1_id = auth.uid() OR dc.participant2_id = auth.uid())
  )
);

CREATE POLICY "Users can remove own DM reactions"
ON public.direct_message_reactions FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Participants can view huddle reactions"
ON public.blitz_chat_message_reactions FOR SELECT TO authenticated
USING (public.is_blitz_match_participant(match_id, auth.uid()));

CREATE POLICY "Participants can add huddle reactions"
ON public.blitz_chat_message_reactions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND public.is_blitz_match_participant(match_id, auth.uid()));

CREATE POLICY "Users can remove own huddle reactions"
ON public.blitz_chat_message_reactions FOR DELETE TO authenticated
USING (auth.uid() = user_id);

ALTER TABLE public.direct_message_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.blitz_chat_message_reactions REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'direct_message_reactions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_message_reactions';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'blitz_chat_message_reactions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.blitz_chat_message_reactions';
  END IF;
END $$;
