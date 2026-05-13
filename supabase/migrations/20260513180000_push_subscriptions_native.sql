-- Extend push_subscriptions to support native (APNs/FCM) device tokens
-- alongside existing web push subscriptions

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS device_token text;

-- Web push fields are only required for platform = 'web'
ALTER TABLE public.push_subscriptions
  ALTER COLUMN endpoint DROP NOT NULL,
  ALTER COLUMN p256dh DROP NOT NULL,
  ALTER COLUMN auth DROP NOT NULL;

-- Unique constraint for native tokens per user.
-- PostgreSQL allows multiple NULL values in a unique constraint, so web rows
-- (device_token IS NULL) won't conflict with each other.
ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_subscriptions_user_device_token_key UNIQUE (user_id, device_token);

-- Backfill existing rows
UPDATE public.push_subscriptions SET platform = 'web' WHERE platform IS NULL OR platform = '';

-- Fix UPDATE policy: add WITH CHECK so upsert cannot change user_id to another user
DROP POLICY IF EXISTS "Users can update own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can update own push subscriptions"
  ON public.push_subscriptions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
