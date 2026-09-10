-- Admin dashboard stats (Blitz-based, no events).
-- One SECURITY DEFINER function so an admin sees aggregate counts across ALL
-- rows (normal RLS would restrict each table to the caller's own rows).

CREATE OR REPLACE FUNCTION public.admin_stats(p_from timestamptz DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT jsonb_build_object(
    'range_from',   p_from,
    'generated_at', now(),

    'users_total',       (SELECT count(*) FROM public.profiles),
    'users_new',         (SELECT count(*) FROM public.profiles
                            WHERE p_from IS NULL OR created_at >= p_from),

    'blitz_total',        (SELECT count(*) FROM public.blitz_requests),
    'blitz_new',          (SELECT count(*) FROM public.blitz_requests
                            WHERE p_from IS NULL OR created_at >= p_from),
    'blitz_active',       (SELECT count(*) FROM public.blitz_requests
                            WHERE status = 'active' AND expires_at > now()),

    'swipes_new',         (SELECT count(*) FROM public.blitz_swipes
                            WHERE p_from IS NULL OR created_at >= p_from),
    'swipes_right_new',   (SELECT count(*) FROM public.blitz_swipes
                            WHERE direction = 'right'
                              AND (p_from IS NULL OR created_at >= p_from)),

    'matches_total',      (SELECT count(*) FROM public.blitz_matches),
    'matches_new',        (SELECT count(*) FROM public.blitz_matches
                            WHERE p_from IS NULL OR created_at >= p_from),

    'blitz_messages_new', (SELECT count(*) FROM public.blitz_chat_messages
                            WHERE p_from IS NULL OR created_at >= p_from),
    'dm_messages_new',    (SELECT count(*) FROM public.direct_messages
                            WHERE p_from IS NULL OR created_at >= p_from),

    'reports_open',       (SELECT count(*) FROM public.reports WHERE status = 'open')
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_stats(timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_stats(timestamptz) TO authenticated;
