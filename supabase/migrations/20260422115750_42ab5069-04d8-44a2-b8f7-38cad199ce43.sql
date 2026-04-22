-- 1) event_participants: restrict SELECT to authenticated users
DROP POLICY IF EXISTS "Anyone can view participants" ON public.event_participants;

CREATE POLICY "Authenticated users can view participants"
ON public.event_participants
FOR SELECT
TO authenticated
USING (true);

-- 2) avatars storage bucket: path-scoped DELETE + tighten SELECT/INSERT/UPDATE
-- Existing policies already enforce path ownership for INSERT and UPDATE on avatars.
-- Add a DELETE policy so users can only delete their own avatar files.
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

CREATE POLICY "Users can delete their own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3) realtime.messages: deny all broadcast/presence subscriptions by default.
-- The app uses only postgres_changes (table-change) subscriptions, which are
-- gated by each underlying table's own RLS — so chats, notifications, and
-- blitz live updates continue to work. This blocks any attempt to subscribe
-- to arbitrary broadcast/presence channels (e.g. direct_messages:* topics).
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Block all broadcast and presence by default" ON realtime.messages;

CREATE POLICY "Block all broadcast and presence by default"
ON realtime.messages
FOR SELECT
TO authenticated
USING (false);
