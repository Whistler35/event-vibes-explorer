-- Weekend "ritual" pushes: a deliberate, well-timed nudge (à la BeReal's
-- daily moment) instead of only reactive notifications — Fr afternoon,
-- Sa evening, Su late-morning, the three windows people actually decide
-- what they're doing. Times are in UTC assuming CEST (UTC+2); shift by
-- 1h once DST ends in late October if exact local time matters.
--
-- Opt-out lives on profiles.ritual_push_enabled so this never becomes the
-- kind of notification spam Apple already flagged once.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ritual_push_enabled boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.send_weekend_ritual_push(p_title text, p_body text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_user record;
BEGIN
  FOR v_user IN
    SELECT DISTINCT ps.user_id
    FROM public.push_subscriptions ps
    JOIN public.profiles pr ON pr.user_id = ps.user_id
    WHERE pr.ritual_push_enabled = true
  LOOP
    PERFORM public.call_push_notification(v_user.user_id, p_title, p_body, 'ritual_push', '{}'::jsonb);
  END LOOP;
END;
$$;

-- Friday ~16:00 CEST (14:00 UTC) — "weekend's starting, make a plan"
DO $$ BEGIN PERFORM cron.unschedule('ritual-push-friday'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'ritual-push-friday',
  '0 14 * * 5',
  $$SELECT public.send_weekend_ritual_push(
    '🔥 Wochenende steht an!',
    'Hast du schon Pläne? Starte jetzt einen Blitz – Evendle findet dir spontan Gesellschaft.'
  );$$
);

-- Saturday ~18:00 CEST (16:00 UTC) — "tonight, who's around"
DO $$ BEGIN PERFORM cron.unschedule('ritual-push-saturday'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'ritual-push-saturday',
  '0 16 * * 6',
  $$SELECT public.send_weekend_ritual_push(
    '⚡ Samstagabend-Vibes',
    'Noch nichts vor? Schau, wer gerade in deiner Nähe blitzt – oder leg selbst los.'
  );$$
);

-- Sunday ~10:00 CEST (08:00 UTC) — "late morning, plan the rest of the day"
DO $$ BEGIN PERFORM cron.unschedule('ritual-push-sunday'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'ritual-push-sunday',
  '0 8 * * 0',
  $$SELECT public.send_weekend_ritual_push(
    '☀️ Sonntagsplan gesucht?',
    'Brunch, Spaziergang, kicken – wirf einen Blick rein und trefft euch spontan.'
  );$$
);
