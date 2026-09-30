-- One-time backfill for the handle_new_user() regression (20260930090000):
-- age/country/bio/birthday were collected at signup and are still sitting in
-- auth.users.raw_user_meta_data, they just never made it into profiles.
-- Only fills currently-NULL fields (coalesce keeps anything a user already
-- entered manually via EditProfile since) and only touches rows where
-- there's actually recoverable metadata — safe to run more than once.

UPDATE public.profiles p
SET
  age = COALESCE(p.age, (u.raw_user_meta_data->>'age')::integer),
  birthday = COALESCE(p.birthday, NULLIF(u.raw_user_meta_data->>'birthday', '')::date),
  country = COALESCE(p.country, u.raw_user_meta_data->>'country'),
  bio = COALESCE(p.bio, u.raw_user_meta_data->>'bio')
FROM auth.users u
WHERE u.id = p.user_id
  AND (p.age IS NULL OR p.country IS NULL OR p.bio IS NULL OR p.birthday IS NULL)
  AND (
    u.raw_user_meta_data->>'age' IS NOT NULL
    OR u.raw_user_meta_data->>'country' IS NOT NULL
    OR u.raw_user_meta_data->>'bio' IS NOT NULL
    OR u.raw_user_meta_data->>'birthday' IS NOT NULL
  );
