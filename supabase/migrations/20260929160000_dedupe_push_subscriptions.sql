-- One-time cleanup for the "I get every push twice" bug: send-push-notification
-- sends to every push_subscriptions row for a user with no dedup, and until
-- now nothing removed a device's OLD token row when a new one was issued
-- (reinstall, new TestFlight build, etc.) — see usePushNotifications.ts.
-- Heavy testing accounts (yours) are exactly where these pile up. Keeps only
-- the most recently updated row per (user_id, platform); safe to re-run.

DELETE FROM public.push_subscriptions ps
WHERE ps.id NOT IN (
  SELECT DISTINCT ON (user_id, platform) id
  FROM public.push_subscriptions
  ORDER BY user_id, platform, updated_at DESC
);
