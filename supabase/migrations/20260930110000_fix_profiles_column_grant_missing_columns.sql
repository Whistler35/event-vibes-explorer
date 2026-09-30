-- Root cause of "profile data shows blank for everyone" (EditProfile & anywhere
-- else that selects these columns): 20260909210000_profiles_hide_phone.sql
-- replaced table-level SELECT with a column-level GRANT that enumerated a fixed
-- column list. Two columns added AFTER that migration --
-- `ritual_push_enabled` (20260917150000) and `birthday` (20260930090000) --
-- were never added to the grant. In Postgres, selecting even one ungranted
-- column makes the *entire* query fail with 42501 "permission denied for table
-- profiles" -- not a partial result, not an RLS row filter, the whole request.
-- This affected every account identically (it's a column privilege, not a row
-- policy), which is why direct SQL in the Lovable SQL editor (runs as the
-- postgres superuser, bypasses GRANTs entirely) always showed correct data
-- while the app's own fetch got a blanket permission error.
--
-- Fix: re-grant with the complete current column list. phone / phone_hash
-- stay excluded, per the original intent of that migration.

GRANT SELECT (
  id,
  user_id,
  name,
  age,
  birthday,
  country,
  bio,
  fun_fact,
  avatar_url,
  instagram_username,
  instagram_followers,
  interests,
  photos,
  onboarding_completed,
  ritual_push_enabled,
  created_at,
  updated_at
) ON public.profiles TO authenticated;
