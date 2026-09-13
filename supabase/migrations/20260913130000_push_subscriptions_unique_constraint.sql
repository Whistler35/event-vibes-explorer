-- The 20260513180000 migration that added this constraint apparently never
-- actually landed on the live database (constraint is missing there), even
-- though the migration file exists in history. Every native device-token
-- upsert has been failing ever since with:
--   "there is no unique or exclusion constraint matching the ON CONFLICT
--   specification"
-- Re-add it defensively (idempotent).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'push_subscriptions_user_device_token_key'
  ) THEN
    ALTER TABLE public.push_subscriptions
      ADD CONSTRAINT push_subscriptions_user_device_token_key UNIQUE (user_id, device_token);
  END IF;
END $$;
