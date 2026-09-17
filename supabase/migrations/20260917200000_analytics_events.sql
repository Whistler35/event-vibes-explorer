-- Lightweight analytics event log — an append-only table the client logs
-- key actions to (notification taps, feed posts/likes/comments, Blitz
-- creation), so growth features can actually be measured instead of
-- shipped blind. Admins/moderators can read aggregates; everyone else can
-- only insert their own events.
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created ON public.analytics_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON public.analytics_events (user_id);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can log own events"
    ON public.analytics_events FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can view analytics events"
    ON public.analytics_events FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend the existing admin dashboard stats with feed engagement and
-- notification-open numbers, so the new Feed/streak/ritual-push features
-- show up next to the metrics that already existed.
CREATE OR REPLACE FUNCTION public.admin_stats(p_from timestamptz DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT jsonb_build_object(
    'range_from',   p_from,
    'generated_at', now(),

    'users_total',       (SELECT count(*) FROM public.profiles),
    'users_new',         (SELECT count(*) FROM public.profiles
                            WHERE p_from IS NULL OR created_at >= p_from),

    'blitz_total',        (SELECT count(*) FROM public.blitz_requests),
    'blitz_new',          (SELECT count(*) FROM public.blitz_requests
                            WHERE p_from IS NULL OR created_at >= p_from),
    'blitz_active',       (SELECT count(*) FROM public.blitz_requests
                            WHERE status = 'active' AND expires_at > now()),

    'swipes_new',         (SELECT count(*) FROM public.blitz_swipes
                            WHERE p_from IS NULL OR created_at >= p_from),
    'swipes_right_new',   (SELECT count(*) FROM public.blitz_swipes
                            WHERE direction = 'right'
                              AND (p_from IS NULL OR created_at >= p_from)),

    'matches_total',      (SELECT count(*) FROM public.blitz_matches),
    'matches_new',        (SELECT count(*) FROM public.blitz_matches
                            WHERE p_from IS NULL OR created_at >= p_from),

    'blitz_messages_new', (SELECT count(*) FROM public.blitz_chat_messages
                            WHERE p_from IS NULL OR created_at >= p_from),
    'dm_messages_new',    (SELECT count(*) FROM public.direct_messages
                            WHERE p_from IS NULL OR created_at >= p_from),

    'reports_open',       (SELECT count(*) FROM public.reports WHERE status = 'open'),

    'feed_posts_new',     (SELECT count(*) FROM public.blitz_feed_posts
                            WHERE p_from IS NULL OR created_at >= p_from),
    'feed_likes_new',     (SELECT count(*) FROM public.blitz_feed_post_likes
                            WHERE p_from IS NULL OR created_at >= p_from),
    'feed_comments_new',  (SELECT count(*) FROM public.blitz_feed_post_comments
                            WHERE p_from IS NULL OR created_at >= p_from),

    'notifications_opened_new', (SELECT count(*) FROM public.analytics_events
                            WHERE event_type = 'notification_opened'
                              AND (p_from IS NULL OR created_at >= p_from)),
    'ritual_push_opened_new',   (SELECT count(*) FROM public.analytics_events
                            WHERE event_type = 'notification_opened'
                              AND data->>'type' = 'ritual_push'
                              AND (p_from IS NULL OR created_at >= p_from))
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_stats(timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_stats(timestamptz) TO authenticated;
