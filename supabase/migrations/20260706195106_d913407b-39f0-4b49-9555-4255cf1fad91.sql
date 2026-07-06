
-- Clean slate first
DELETE FROM public.blitz_chat_messages;
DELETE FROM public.blitz_matches;

-- Drop dependent policies explicitly, then drop the column
DROP POLICY IF EXISTS "Match participants can view" ON public.blitz_matches;
DROP POLICY IF EXISTS "Match participants can update" ON public.blitz_matches;
DROP POLICY IF EXISTS "Match participants can view messages" ON public.blitz_chat_messages;
DROP POLICY IF EXISTS "Match participants can send messages" ON public.blitz_chat_messages;
DROP POLICY IF EXISTS "Participants can view messages" ON public.blitz_chat_messages;
DROP POLICY IF EXISTS "Users can view their match messages" ON public.blitz_chat_messages;
DROP POLICY IF EXISTS "Participants can send messages" ON public.blitz_chat_messages;
DROP POLICY IF EXISTS "Users can send messages in their matches" ON public.blitz_chat_messages;
DROP POLICY IF EXISTS "Host and participant can view match" ON public.blitz_matches;
DROP POLICY IF EXISTS "Users can view their matches" ON public.blitz_matches;

ALTER TABLE public.blitz_matches DROP COLUMN IF EXISTS participant_id CASCADE;

ALTER TABLE public.blitz_matches
  ADD CONSTRAINT blitz_matches_blitz_request_id_key UNIQUE (blitz_request_id);

-- Participants table
CREATE TABLE public.blitz_match_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.blitz_matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.blitz_match_participants TO authenticated;
GRANT ALL ON public.blitz_match_participants TO service_role;

ALTER TABLE public.blitz_match_participants ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_blitz_match_participant(_match_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blitz_match_participants
    WHERE match_id = _match_id AND user_id = _user_id
  );
$$;

CREATE POLICY "Participants can view fellow participants"
ON public.blitz_match_participants FOR SELECT
TO authenticated
USING (public.is_blitz_match_participant(match_id, auth.uid()));

CREATE POLICY "Host can add participants or self-join"
ON public.blitz_match_participants FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.blitz_matches m
    WHERE m.id = match_id AND m.host_id = auth.uid()
  )
  OR user_id = auth.uid()
);

CREATE POLICY "Users can leave"
ON public.blitz_match_participants FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Rebuild chat message policies
CREATE POLICY "Match participants can view messages"
ON public.blitz_chat_messages FOR SELECT
TO authenticated
USING (public.is_blitz_match_participant(match_id, auth.uid()));

CREATE POLICY "Match participants can send messages"
ON public.blitz_chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND public.is_blitz_match_participant(match_id, auth.uid())
);

-- Rebuild match SELECT policy
CREATE POLICY "Host or participants can view match"
ON public.blitz_matches FOR SELECT
TO authenticated
USING (
  host_id = auth.uid()
  OR public.is_blitz_match_participant(id, auth.uid())
);
