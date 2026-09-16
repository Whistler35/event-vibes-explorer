-- "Mark as read/unread" + "delete" (hide, like WhatsApp/iMessage — removes
-- it from MY list only; it reappears automatically if a new message comes
-- in) for both DMs and Blitz huddles.
--
-- DMs already have conversation_reads(last_read_at); add hidden_at.
-- Huddles had NO read-tracking at all (the client's list-unread check
-- referenced a localStorage key that was never written for huddles either
-- — every huddle with an incoming message showed "unread" forever). Track
-- both directly on blitz_match_participants, one row per (match, user)
-- already.

ALTER TABLE public.conversation_reads
  ADD COLUMN IF NOT EXISTS hidden_at timestamptz;

ALTER TABLE public.blitz_match_participants
  ADD COLUMN IF NOT EXISTS last_read_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS hidden_at timestamptz;

-- Participants could view/insert/delete their own row, but never update it
-- (needed now to write last_read_at / hidden_at from the client).
DROP POLICY IF EXISTS "Users can update own participant row" ON public.blitz_match_participants;
CREATE POLICY "Users can update own participant row"
ON public.blitz_match_participants FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
