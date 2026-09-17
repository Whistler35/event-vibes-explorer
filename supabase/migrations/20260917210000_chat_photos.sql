-- Photo sharing in DM and Huddle chat (camera + gallery). Reuses the same
-- public "avatars" storage bucket already used for profile/feed photos —
-- no new bucket or storage policy needed. `message` stays NOT NULL (kept
-- as "📷 Foto" for a photo-only send) so every existing place that reads
-- `message` for previews/notifications keeps working unchanged.
ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE public.blitz_chat_messages ADD COLUMN IF NOT EXISTS photo_url text;
