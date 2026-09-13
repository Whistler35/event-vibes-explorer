-- The Cloud "Secrets" form's Value field corrupts multi-line values pasted
-- into it — confirmed live: APNS_PRIVATE_KEY was saved with the first
-- character of the base64 body replaced by a stray bullet (U+2022) on every
-- attempt, byte-for-byte identical each time, regardless of re-entry method.
-- The SQL editor handles multi-line text correctly (used successfully many
-- times), so store secrets that don't fit the Secrets form's input here
-- instead. RLS is enabled with zero policies: only the service-role client
-- (used exclusively by edge functions) can read/write this table — it
-- bypasses RLS entirely, so no anon/authenticated policy is ever needed here.

CREATE TABLE IF NOT EXISTS public.app_secrets (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies: only the service_role key (edge functions) can
-- read/write, since service_role bypasses RLS. No client of any kind should
-- ever be able to touch this table.
