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

-- Unique constraint for native tokens per user (partial: only when device_token present)
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_user_device_token
  ON public.push_subscriptions (user_id, device_token)
  WHERE device_token IS NOT NULL;

-- Backfill existing rows
UPDATE public.push_subscriptions SET platform = 'web' WHERE platform IS NULL OR platform = '';
