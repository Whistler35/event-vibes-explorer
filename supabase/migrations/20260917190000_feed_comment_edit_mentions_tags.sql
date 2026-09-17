-- 1) Comment editing: needs an UPDATE policy (never existed — comments
--    could only be created/deleted before) plus an edited_at marker so the
--    UI can show "(bearbeitet)".
ALTER TABLE public.blitz_feed_post_comments ADD COLUMN IF NOT EXISTS edited_at timestamptz;

DO $$ BEGIN
  CREATE POLICY "Users can edit own comment"
    ON public.blitz_feed_post_comments FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) @-mentions: the client resolves "@Name" to a real user id (picked from
-- an autocomplete of the Blitz's participants, not free-text parsing) and
-- sends the resulting ids here, so notifications are precise.
ALTER TABLE public.blitz_feed_post_comments ADD COLUMN IF NOT EXISTS mentioned_user_ids uuid[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION public.notify_feed_comment_mentions()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_commenter_name text;
  v_mentioned uuid;
BEGIN
  IF NEW.mentioned_user_ids IS NULL OR array_length(NEW.mentioned_user_ids, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_commenter_name FROM public.profiles WHERE user_id = NEW.user_id;

  FOREACH v_mentioned IN ARRAY NEW.mentioned_user_ids LOOP
    IF v_mentioned = NEW.user_id THEN CONTINUE; END IF;
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_mentioned, 'feed_comment_mention', '💬 Du wurdest erwähnt',
      COALESCE(v_commenter_name, 'Jemand') || ' hat dich erwähnt: ' || LEFT(NEW.comment, 80),
      jsonb_build_object('post_id', NEW.post_id, 'commenter_id', NEW.user_id)
    );
    PERFORM public.call_push_notification(
      v_mentioned, '💬 Du wurdest erwähnt',
      COALESCE(v_commenter_name, 'Jemand') || ' hat dich in einem Kommentar erwähnt', 'feed_comment_mention',
      jsonb_build_object('post_id', NEW.post_id, 'commenter_id', NEW.user_id)
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_feed_comment_mentions ON public.blitz_feed_post_comments;
CREATE TRIGGER trg_notify_feed_comment_mentions
  AFTER INSERT ON public.blitz_feed_post_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_feed_comment_mentions();

-- 3) Tag people in a post — like Instagram photo tags. Only the post's
-- author can tag, and only people who were actually at that Blitz.
CREATE TABLE IF NOT EXISTS public.blitz_feed_post_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.blitz_feed_posts(id) ON DELETE CASCADE,
  tagged_user_id uuid NOT NULL,
  tagged_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, tagged_user_id)
);

CREATE INDEX IF NOT EXISTS idx_blitz_feed_post_tags_post ON public.blitz_feed_post_tags (post_id);

ALTER TABLE public.blitz_feed_post_tags ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "View tags on visible posts"
    ON public.blitz_feed_post_tags FOR SELECT TO authenticated
    USING (public.can_view_feed_post(post_id, auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authors can tag participants"
    ON public.blitz_feed_post_tags FOR INSERT TO authenticated
    WITH CHECK (
      auth.uid() = tagged_by
      AND EXISTS (
        SELECT 1 FROM public.blitz_feed_posts p
        WHERE p.id = blitz_feed_post_tags.post_id AND p.author_id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 FROM public.blitz_feed_posts p
        WHERE p.id = blitz_feed_post_tags.post_id
          AND (
            public.is_blitz_match_participant(p.match_id, tagged_user_id)
            OR EXISTS (SELECT 1 FROM public.blitz_matches m WHERE m.id = p.match_id AND m.host_id = tagged_user_id)
          )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authors can remove tags"
    ON public.blitz_feed_post_tags FOR DELETE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.blitz_feed_posts p
        WHERE p.id = blitz_feed_post_tags.post_id AND p.author_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.blitz_feed_post_tags REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'blitz_feed_post_tags'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.blitz_feed_post_tags';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.notify_feed_post_tag()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_tagger_name text;
  v_activity text;
BEGIN
  IF NEW.tagged_user_id = NEW.tagged_by THEN RETURN NEW; END IF;

  SELECT name INTO v_tagger_name FROM public.profiles WHERE user_id = NEW.tagged_by;
  SELECT r.activity INTO v_activity
  FROM public.blitz_feed_posts p
  JOIN public.blitz_matches m ON m.id = p.match_id
  JOIN public.blitz_requests r ON r.id = m.blitz_request_id
  WHERE p.id = NEW.post_id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    NEW.tagged_user_id, 'feed_post_tag', '📸 Du wurdest markiert',
    COALESCE(v_tagger_name, 'Jemand') || ' hat dich in einem Foto markiert (' || COALESCE(v_activity, 'Blitz') || ')',
    jsonb_build_object('post_id', NEW.post_id, 'tagged_by', NEW.tagged_by)
  );
  PERFORM public.call_push_notification(
    NEW.tagged_user_id, '📸 Du wurdest markiert',
    COALESCE(v_tagger_name, 'Jemand') || ' hat dich in einem Foto markiert', 'feed_post_tag',
    jsonb_build_object('post_id', NEW.post_id, 'tagged_by', NEW.tagged_by)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_feed_post_tag ON public.blitz_feed_post_tags;
CREATE TRIGGER trg_notify_feed_post_tag
  AFTER INSERT ON public.blitz_feed_post_tags
  FOR EACH ROW EXECUTE FUNCTION public.notify_feed_post_tag();
