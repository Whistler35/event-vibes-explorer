
-- Direct conversations between two users
CREATE TABLE public.direct_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant1_id uuid NOT NULL,
  participant2_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (participant1_id, participant2_id)
);

-- Direct messages
CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.direct_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.direct_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view their own conversations
CREATE POLICY "Users can view own conversations"
ON public.direct_conversations FOR SELECT TO authenticated
USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

-- RLS: Users can create conversations (only as participant)
CREATE POLICY "Users can create conversations"
ON public.direct_conversations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);

-- RLS: Users can update own conversations (for updated_at)
CREATE POLICY "Users can update own conversations"
ON public.direct_conversations FOR UPDATE TO authenticated
USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

-- RLS: Participants can view messages
CREATE POLICY "Participants can view messages"
ON public.direct_messages FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.direct_conversations dc
  WHERE dc.id = direct_messages.conversation_id
  AND (dc.participant1_id = auth.uid() OR dc.participant2_id = auth.uid())
));

-- RLS: Participants can send messages
CREATE POLICY "Participants can send messages"
ON public.direct_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.direct_conversations dc
    WHERE dc.id = direct_messages.conversation_id
    AND (dc.participant1_id = auth.uid() OR dc.participant2_id = auth.uid())
  )
);

-- Enable realtime for direct messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;

-- Function to get or create a direct conversation
CREATE OR REPLACE FUNCTION public.get_or_create_dm(p_user1 uuid, p_user2 uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv_id uuid;
  v_p1 uuid;
  v_p2 uuid;
BEGIN
  -- Normalize order to avoid duplicates
  IF p_user1 < p_user2 THEN
    v_p1 := p_user1;
    v_p2 := p_user2;
  ELSE
    v_p1 := p_user2;
    v_p2 := p_user1;
  END IF;

  -- Try to find existing
  SELECT id INTO v_conv_id
  FROM direct_conversations
  WHERE participant1_id = v_p1 AND participant2_id = v_p2;

  IF v_conv_id IS NULL THEN
    INSERT INTO direct_conversations (participant1_id, participant2_id)
    VALUES (v_p1, v_p2)
    RETURNING id INTO v_conv_id;
  END IF;

  RETURN v_conv_id;
END;
$$;
