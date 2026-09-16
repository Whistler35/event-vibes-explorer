-- Blitz Feed: post-huddle photo recaps (BeReal/Strava-style), with likes
-- and comments. One post per participant per match — everyone who was at
-- the same Blitz can share their own photo/caption of it.
--
-- Photos reuse the existing public "avatars" bucket (already permissive for
-- any authenticated upload, same as PhotoStrip.tsx's gallery photos) under
-- a `${userId}/feed/...` path — no new bucket/policy needed.

CREATE TABLE IF NOT EXISTS public.blitz_feed_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.blitz_matches(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  photo_url text NOT NULL,
  caption text CHECK (char_length(caption) <= 280),
  visibility text NOT NULL DEFAULT 'friends' CHECK (visibility IN ('friends', 'public')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (match_id, author_id)
);

CREATE TABLE IF NOT EXISTS public.blitz_feed_post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.blitz_feed_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.blitz_feed_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.blitz_feed_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  comment text NOT NULL CHECK (char_length(comment) BETWEEN 1 AND 300),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blitz_feed_posts_created ON public.blitz_feed_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blitz_feed_posts_author ON public.blitz_feed_posts (author_id);
CREATE INDEX IF NOT EXISTS idx_blitz_feed_post_likes_post ON public.blitz_feed_post_likes (post_id);
CREATE INDEX IF NOT EXISTS idx_blitz_feed_post_comments_post ON public.blitz_feed_post_comments (post_id, created_at ASC);

ALTER TABLE public.blitz_feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blitz_feed_post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blitz_feed_post_comments ENABLE ROW LEVEL SECURITY;

-- Shared visibility check (friends-only posts are visible to the author and
-- accepted friends of the author; public posts to everyone signed in). Used
-- by posts/likes/comments SELECT policies so the friendship logic lives in
-- one place instead of being copy-pasted three times.
CREATE OR REPLACE FUNCTION public.can_view_feed_post(p_post_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blitz_feed_posts p
    WHERE p.id = p_post_id
      AND (
        p.visibility = 'public'
        OR p.author_id = p_user_id
        OR EXISTS (
          SELECT 1 FROM public.friendships f
          WHERE f.status = 'accepted'
            AND ((f.requester_id = p.author_id AND f.addressee_id = p_user_id)
              OR (f.addressee_id = p.author_id AND f.requester_id = p_user_id))
        )
      )
  );
$$;

DO $$ BEGIN
  CREATE POLICY "View visible feed posts"
    ON public.blitz_feed_posts FOR SELECT TO authenticated
    USING (public.can_view_feed_post(id, auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Only someone who was actually at the Blitz can post about it.
DO $$ BEGIN
  CREATE POLICY "Participants can post about their Blitz"
    ON public.blitz_feed_posts FOR INSERT TO authenticated
    WITH CHECK (
      auth.uid() = author_id
      AND (
        public.is_blitz_match_participant(blitz_feed_posts.match_id, auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.blitz_matches m
          WHERE m.id = blitz_feed_posts.match_id AND m.host_id = auth.uid()
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authors can update own post"
    ON public.blitz_feed_posts FOR UPDATE TO authenticated
    USING (auth.uid() = author_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authors can delete own post"
    ON public.blitz_feed_posts FOR DELETE TO authenticated
    USING (auth.uid() = author_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Likes
DO $$ BEGIN
  CREATE POLICY "View likes on visible posts"
    ON public.blitz_feed_post_likes FOR SELECT TO authenticated
    USING (public.can_view_feed_post(post_id, auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Like visible posts"
    ON public.blitz_feed_post_likes FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id AND public.can_view_feed_post(post_id, auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Unlike own like"
    ON public.blitz_feed_post_likes FOR DELETE TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Comments
DO $$ BEGIN
  CREATE POLICY "View comments on visible posts"
    ON public.blitz_feed_post_comments FOR SELECT TO authenticated
    USING (public.can_view_feed_post(post_id, auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Comment on visible posts"
    ON public.blitz_feed_post_comments FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id AND public.can_view_feed_post(post_id, auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Delete own comment"
    ON public.blitz_feed_post_comments FOR DELETE TO authenticated
    USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.blitz_feed_posts REPLICA IDENTITY FULL;
ALTER TABLE public.blitz_feed_post_likes REPLICA IDENTITY FULL;
ALTER TABLE public.blitz_feed_post_comments REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'blitz_feed_posts'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.blitz_feed_posts';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'blitz_feed_post_likes'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.blitz_feed_post_likes';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'blitz_feed_post_comments'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.blitz_feed_post_comments';
  END IF;
END $$;

-- Notify the author when someone likes or comments (skip self-notify).
CREATE OR REPLACE FUNCTION public.notify_feed_post_like()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_author_id uuid;
  v_liker_name text;
BEGIN
  SELECT author_id INTO v_author_id FROM public.blitz_feed_posts WHERE id = NEW.post_id;
  IF v_author_id IS NULL OR v_author_id = NEW.user_id THEN RETURN NEW; END IF;

  SELECT name INTO v_liker_name FROM public.profiles WHERE user_id = NEW.user_id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_author_id, 'feed_post_like', '❤️ Neues Like',
    COALESCE(v_liker_name, 'Jemand') || ' gefällt dein Foto',
    jsonb_build_object('post_id', NEW.post_id, 'liker_id', NEW.user_id)
  );
  PERFORM public.call_push_notification(
    v_author_id, '❤️ Neues Like',
    COALESCE(v_liker_name, 'Jemand') || ' gefällt dein Foto', 'feed_post_like',
    jsonb_build_object('post_id', NEW.post_id, 'liker_id', NEW.user_id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_feed_post_like ON public.blitz_feed_post_likes;
CREATE TRIGGER trg_notify_feed_post_like
  AFTER INSERT ON public.blitz_feed_post_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_feed_post_like();

CREATE OR REPLACE FUNCTION public.notify_feed_post_comment()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_author_id uuid;
  v_commenter_name text;
BEGIN
  SELECT author_id INTO v_author_id FROM public.blitz_feed_posts WHERE id = NEW.post_id;
  IF v_author_id IS NULL OR v_author_id = NEW.user_id THEN RETURN NEW; END IF;

  SELECT name INTO v_commenter_name FROM public.profiles WHERE user_id = NEW.user_id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_author_id, 'feed_post_comment', '💬 Neuer Kommentar',
    COALESCE(v_commenter_name, 'Jemand') || ': ' || LEFT(NEW.comment, 80),
    jsonb_build_object('post_id', NEW.post_id, 'commenter_id', NEW.user_id)
  );
  PERFORM public.call_push_notification(
    v_author_id, '💬 Neuer Kommentar',
    COALESCE(v_commenter_name, 'Jemand') || ': ' || LEFT(NEW.comment, 80), 'feed_post_comment',
    jsonb_build_object('post_id', NEW.post_id, 'commenter_id', NEW.user_id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_feed_post_comment ON public.blitz_feed_post_comments;
CREATE TRIGGER trg_notify_feed_post_comment
  AFTER INSERT ON public.blitz_feed_post_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_feed_post_comment();
