-- A single-column UNIQUE(user_id) constraint exists on the live database
-- (not created by any tracked migration in this repo — likely an ad-hoc
-- addition), left over from when a user could only ever have one push
-- subscription. It conflicts with the intended design: one row per device
-- (web endpoint OR native device_token), enforced by the composite
-- UNIQUE(user_id, device_token) constraint re-added just before this.
-- Confirmed live: inserting a second (native) row for a user who already had
-- one (web) row failed with "duplicate key value violates unique constraint
-- push_subscriptions_user_id_key".

ALTER TABLE public.push_subscriptions
  DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_key;
