-- Security fix: the `profiles` SELECT policy uses USING (true), so any logged-in
-- user could read every other user's `phone` and `phone_hash` via a raw API call
-- (e.g. ?select=phone). The app itself never reads these columns for anyone.
--
-- RLS is row-level, not column-level, so we fix this with column privileges:
-- keep row visibility as-is, but stop `authenticated` from selecting the two
-- sensitive columns. `phone` / `phone_hash` stay writable by their owner
-- (INSERT/UPDATE column grants are separate and unchanged).

REVOKE SELECT ON public.profiles FROM authenticated;

GRANT SELECT (
  id,
  user_id,
  name,
  age,
  country,
  bio,
  fun_fact,
  avatar_url,
  instagram_username,
  instagram_followers,
  interests,
  photos,
  onboarding_completed,
  created_at,
  updated_at
) ON public.profiles TO authenticated;

-- If a future feature needs a user to read their OWN phone number, expose it via
-- a SECURITY DEFINER function or an owner-scoped view rather than widening this.
