-- 1) Recap prompt: once a Huddle's chat window closes (chat_expires_at in
--    the past — the best signal we have for "the Blitz is over"), nudge
--    every participant to post a photo to the feed. Runs every 15 min via
--    pg_cron; recap_prompted_at makes it idempotent (never re-prompt the
--    same match) and the 2h lookback window keeps it from ever trying to
--    "catch up" on ancient matches after a cron outage.

ALTER TABLE public.blitz_matches ADD COLUMN IF NOT EXISTS recap_prompted_at timestamptz;

CREATE OR REPLACE FUNCTION public.send_blitz_recap_prompts()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_match record;
  v_participant record;
  v_activity text;
BEGIN
  FOR v_match IN
    SELECT m.id, m.blitz_request_id, m.host_id
    FROM public.blitz_matches m
    WHERE m.chat_expires_at <= now()
      AND m.chat_expires_at > now() - interval '2 hours'
      AND m.recap_prompted_at IS NULL
  LOOP
    UPDATE public.blitz_matches SET recap_prompted_at = now() WHERE id = v_match.id;

    SELECT activity INTO v_activity FROM public.blitz_requests WHERE id = v_match.blitz_request_id;

    FOR v_participant IN
      SELECT user_id FROM public.blitz_match_participants WHERE match_id = v_match.id
      UNION
      SELECT v_match.host_id
    LOOP
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (
        v_participant.user_id, 'blitz_recap_prompt', '📸 Wie war''s?',
        'Ihr wart offline unterwegs bei "' || COALESCE(v_activity, 'eurem Blitz') ||
          '" – teil ein Foto davon im Feed!',
        jsonb_build_object('match_id', v_match.id)
      );
      PERFORM public.call_push_notification(
        v_participant.user_id,
        '📸 Wie war''s bei "' || COALESCE(v_activity, 'eurem Blitz') || '"?',
        'Ihr wart gerade offline unterwegs – teil jetzt ein Foto im Feed.',
        'blitz_recap_prompt',
        jsonb_build_object('match_id', v_match.id)
      );
    END LOOP;
  END LOOP;
END;
$$;

DO $$ BEGIN PERFORM cron.unschedule('send-blitz-recap-prompts'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'send-blitz-recap-prompts',
  '*/15 * * * *',
  $$SELECT public.send_blitz_recap_prompts();$$
);

-- 2) Weekly Blitz streak: consecutive ISO weeks (most recent backwards) in
--    which the user hosted or joined at least one match. Grace period: if
--    this week has no Blitz yet, still count from last week so the streak
--    doesn't visually reset to 0 the instant Monday ticks over.
CREATE OR REPLACE FUNCTION public.get_blitz_streak_weeks(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_weeks date[];
  v_cursor date;
  v_streak int := 0;
  v_wk date;
BEGIN
  SELECT array_agg(DISTINCT wk ORDER BY wk DESC) INTO v_weeks
  FROM (
    SELECT date_trunc('week', m.created_at)::date AS wk
    FROM public.blitz_matches m WHERE m.host_id = p_user_id
    UNION
    SELECT date_trunc('week', m.created_at)::date AS wk
    FROM public.blitz_matches m
    JOIN public.blitz_match_participants p ON p.match_id = m.id
    WHERE p.user_id = p_user_id
  ) t;

  IF v_weeks IS NULL OR array_length(v_weeks, 1) = 0 THEN
    RETURN 0;
  END IF;

  v_cursor := date_trunc('week', now())::date;
  IF v_weeks[1] < v_cursor THEN
    v_cursor := v_cursor - interval '7 day';
  END IF;

  FOREACH v_wk IN ARRAY v_weeks LOOP
    IF v_wk = v_cursor THEN
      v_streak := v_streak + 1;
      v_cursor := v_cursor - interval '7 day';
    ELSIF v_wk < v_cursor THEN
      EXIT;
    END IF;
  END LOOP;

  RETURN v_streak;
END;
$$;

REVOKE ALL ON FUNCTION public.get_blitz_streak_weeks(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_blitz_streak_weeks(uuid) TO authenticated;
