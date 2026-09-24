-- Public share links: a Blitz host can share a link to someone outside
-- Evendle entirely (WhatsApp, Instagram DM, etc.). The recipient can open
-- it without an account and see a safe preview — but blitz_requests itself
-- has no policy for the `anon` role at all (every existing SELECT policy is
-- `TO authenticated`), so a plain unauthenticated client can't read it.
--
-- Rather than opening up the raw table to anon (which would also expose
-- exact latitude/longitude), this is a narrow SECURITY DEFINER function
-- that returns only what a public preview needs: activity, host display
-- name/avatar, city (not exact coordinates), and whether it's still live.
-- Works for any of the host's own active requests regardless of the
-- audience setting — sharing is an explicit choice the host makes when
-- they tap "Teilen", independent of the in-app audience restriction.

CREATE OR REPLACE FUNCTION public.get_public_blitz_preview(p_blitz_id uuid)
RETURNS TABLE (
  id uuid,
  activity text,
  city text,
  host_name text,
  host_avatar_url text,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    br.id,
    br.activity,
    br.city,
    p.name,
    p.avatar_url,
    (br.status = 'active' AND br.expires_at > now())
  FROM public.blitz_requests br
  JOIN public.profiles p ON p.user_id = br.host_id
  WHERE br.id = p_blitz_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_blitz_preview(uuid) TO anon, authenticated;
