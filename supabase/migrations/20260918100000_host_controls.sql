-- Host controls for a Huddle: assign a free-text role label to a
-- participant (shown instead of the generic "IN"), remove a participant
-- outright (silently — no notification, per product decision), and extend
-- the chat's expiry independently of the Blitz's own auto-expiry.

-- 1) Role label
ALTER TABLE public.blitz_match_participants ADD COLUMN IF NOT EXISTS role_label text
  CHECK (role_label IS NULL OR char_length(role_label) <= 40);

-- The existing "Users can update own participant row" policy only lets you
-- touch your own row — add a second permissive policy so the host can also
-- update anyone's role_label. RLS ORs multiple permissive policies for the
-- same command together, so this doesn't weaken the self-update case.
DO $$ BEGIN
  CREATE POLICY "Host can update participant roles"
    ON public.blitz_match_participants FOR UPDATE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.blitz_matches m
      WHERE m.id = blitz_match_participants.match_id AND m.host_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.blitz_matches m
      WHERE m.id = blitz_match_participants.match_id AND m.host_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Host can remove a participant (existing "Users can leave" policy only
-- covers removing yourself). Deleting the row is enough on its own to make
-- the huddle disappear from the removed person's chat list and revoke
-- their message access — same as a naturally expired huddle, no separate
-- "removed" state needed. No notification is inserted here on purpose.
DO $$ BEGIN
  CREATE POLICY "Host can remove participant"
    ON public.blitz_match_participants FOR DELETE TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.blitz_matches m
      WHERE m.id = blitz_match_participants.match_id AND m.host_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Host can extend the Huddle's chat window. blitz_matches has had no
-- UPDATE policy at all since the old "Match participants can update" policy
-- was dropped (it referenced the since-removed participant_id column) —
-- nothing in the app currently updates this table from the client.
DO $$ BEGIN
  CREATE POLICY "Host can update match"
    ON public.blitz_matches FOR UPDATE TO authenticated
    USING (auth.uid() = host_id)
    WITH CHECK (auth.uid() = host_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
