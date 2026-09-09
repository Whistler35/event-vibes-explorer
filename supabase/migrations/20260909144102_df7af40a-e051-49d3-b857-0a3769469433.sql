-- ============================================================================
-- Apple App Review requirements: block users, report content, delete account
-- Safe to run once on the EVENDLE Supabase project (wrqckgrnshklyaiilprz).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. BLOCKED USERS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS blocked_users_blocker_idx ON public.blocked_users (blocker_id);
CREATE INDEX IF NOT EXISTS blocked_users_blocked_idx ON public.blocked_users (blocked_id);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own blocks - select" ON public.blocked_users;
CREATE POLICY "own blocks - select" ON public.blocked_users
  FOR SELECT TO authenticated
  USING (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "own blocks - insert" ON public.blocked_users;
CREATE POLICY "own blocks - insert" ON public.blocked_users
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "own blocks - delete" ON public.blocked_users;
CREATE POLICY "own blocks - delete" ON public.blocked_users
  FOR DELETE TO authenticated
  USING (auth.uid() = blocker_id);

-- Helper: is there a block in EITHER direction between two users?
CREATE OR REPLACE FUNCTION public.is_blocked_between(a uuid, b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_users
    WHERE (blocker_id = a AND blocked_id = b)
       OR (blocker_id = b AND blocked_id = a)
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. REPORTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reports (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_user_id   uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_message_id uuid,
  context            text NOT NULL DEFAULT 'profile',   -- 'profile' | 'direct_message' | 'blitz'
  reason             text NOT NULL,                     -- 'spam' | 'harassment' | 'inappropriate' | 'fake' | 'other'
  details            text,
  status             text NOT NULL DEFAULT 'open',      -- 'open' | 'reviewing' | 'resolved' | 'dismissed'
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reports_status_idx ON public.reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS reports_reported_user_idx ON public.reports (reported_user_id);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reporter can insert" ON public.reports;
CREATE POLICY "reporter can insert" ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "reporter can see own" ON public.reports;
CREATE POLICY "reporter can see own" ON public.reports
  FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "staff can see all reports" ON public.reports;
CREATE POLICY "staff can see all reports" ON public.reports
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

DROP POLICY IF EXISTS "staff can update reports" ON public.reports;
CREATE POLICY "staff can update reports" ON public.reports
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- ---------------------------------------------------------------------------
-- 3. ENFORCE BLOCK ON DIRECT MESSAGES (DB-level guarantee)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Participants can send messages" ON public.direct_messages;
CREATE POLICY "Participants can send messages"
ON public.direct_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.direct_conversations dc
    WHERE dc.id = direct_messages.conversation_id
      AND (dc.participant1_id = auth.uid() OR dc.participant2_id = auth.uid())
      AND NOT public.is_blocked_between(dc.participant1_id, dc.participant2_id)
  )
);

-- Hide messages once a block exists (either direction)
DROP POLICY IF EXISTS "Participants can view messages" ON public.direct_messages;
CREATE POLICY "Participants can view messages"
ON public.direct_messages FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.direct_conversations dc
  WHERE dc.id = direct_messages.conversation_id
    AND (dc.participant1_id = auth.uid() OR dc.participant2_id = auth.uid())
    AND NOT public.is_blocked_between(dc.participant1_id, dc.participant2_id)
));

-- Also stop get_or_create_dm from bridging a blocked pair
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
  IF public.is_blocked_between(p_user1, p_user2) THEN
    RAISE EXCEPTION 'blocked' USING ERRCODE = 'check_violation';
  END IF;

  IF p_user1 < p_user2 THEN
    v_p1 := p_user1; v_p2 := p_user2;
  ELSE
    v_p1 := p_user2; v_p2 := p_user1;
  END IF;

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

-- ---------------------------------------------------------------------------
-- 4. DELETE OWN ACCOUNT (in-app, no admin API needed)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Best-effort cleanup of app data that is not covered by ON DELETE CASCADE.
  DELETE FROM public.blocked_users        WHERE blocker_id = uid OR blocked_id = uid;
  DELETE FROM public.reports              WHERE reporter_id = uid OR reported_user_id = uid;
  DELETE FROM public.direct_messages      WHERE sender_id = uid;
  DELETE FROM public.direct_conversations WHERE participant1_id = uid OR participant2_id = uid;
  DELETE FROM public.blitz_swipes         WHERE swiper_id = uid;
  DELETE FROM public.blitz_requests       WHERE host_id = uid;
  DELETE FROM public.push_subscriptions   WHERE user_id = uid;
  DELETE FROM public.friendships          WHERE requester_id = uid OR addressee_id = uid;
  DELETE FROM public.notifications        WHERE user_id = uid;
  DELETE FROM public.profiles             WHERE user_id = uid;

  -- Finally remove the auth user; remaining FK rows with ON DELETE CASCADE follow.
  DELETE FROM auth.users WHERE id = uid;
EXCEPTION
  WHEN undefined_table OR undefined_column THEN
    -- If a table/column above differs in this project, still remove the user;
    -- rows with ON DELETE CASCADE follow automatically.
    DELETE FROM auth.users WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_blocked_between(uuid, uuid) TO authenticated;