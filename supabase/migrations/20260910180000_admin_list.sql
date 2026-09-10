-- Admin drill-down lists. One SECURITY DEFINER function (admin/moderator only)
-- so the details are visible across ALL rows regardless of normal RLS.
-- Returns a uniform shape: { id, title, subtitle, meta, created_at }.

CREATE OR REPLACE FUNCTION public.admin_list(
  p_kind  text,
  p_from  timestamptz DEFAULT NULL,
  p_limit int DEFAULT 200
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  lim int := least(greatest(coalesce(p_limit, 200), 1), 500);
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_kind = 'users' THEN
    SELECT jsonb_agg(row) INTO result FROM (
      SELECT jsonb_build_object(
        'id', p.user_id,
        'title', coalesce(p.name, '(ohne Namen)'),
        'subtitle', coalesce(p.country, ''),
        'meta', CASE WHEN p.age IS NOT NULL THEN p.age::text || ' J.' ELSE '' END,
        'created_at', p.created_at
      ) AS row
      FROM public.profiles p
      WHERE p_from IS NULL OR p.created_at >= p_from
      ORDER BY p.created_at DESC
      LIMIT lim
    ) s;

  ELSIF p_kind = 'blitzes' THEN
    SELECT jsonb_agg(row) INTO result FROM (
      SELECT jsonb_build_object(
        'id', b.id,
        'title', b.activity,
        'subtitle', trim(both ' ·' from
          coalesce((SELECT name FROM public.profiles WHERE user_id = b.host_id), '') ||
          CASE WHEN b.city IS NOT NULL THEN ' · ' || b.city ELSE '' END),
        'meta', b.status::text,
        'created_at', b.created_at
      ) AS row
      FROM public.blitz_requests b
      WHERE p_from IS NULL OR b.created_at >= p_from
      ORDER BY b.created_at DESC
      LIMIT lim
    ) s;

  ELSIF p_kind = 'matches' THEN
    SELECT jsonb_agg(row) INTO result FROM (
      SELECT jsonb_build_object(
        'id', m.id,
        'title', coalesce((SELECT activity FROM public.blitz_requests WHERE id = m.blitz_request_id), 'Blitz'),
        'subtitle', coalesce((SELECT name FROM public.profiles WHERE user_id = m.host_id), ''),
        'meta', m.status::text,
        'created_at', m.created_at
      ) AS row
      FROM public.blitz_matches m
      WHERE p_from IS NULL OR m.created_at >= p_from
      ORDER BY m.created_at DESC
      LIMIT lim
    ) s;

  ELSIF p_kind = 'swipes' THEN
    SELECT jsonb_agg(row) INTO result FROM (
      SELECT jsonb_build_object(
        'id', sw.id,
        'title', coalesce((SELECT name FROM public.profiles WHERE user_id = sw.swiper_id), '(Nutzer)'),
        'subtitle', CASE WHEN sw.direction::text = 'right' THEN '→ interessiert' ELSE '← weiter' END,
        'meta', coalesce((SELECT activity FROM public.blitz_requests WHERE id = sw.blitz_request_id), ''),
        'created_at', sw.created_at
      ) AS row
      FROM public.blitz_swipes sw
      WHERE p_from IS NULL OR sw.created_at >= p_from
      ORDER BY sw.created_at DESC
      LIMIT lim
    ) s;

  ELSIF p_kind = 'messages' THEN
    SELECT jsonb_agg(row) INTO result FROM (
      SELECT * FROM (
        SELECT jsonb_build_object(
          'id', bm.id,
          'title', coalesce((SELECT name FROM public.profiles WHERE user_id = bm.sender_id), '(Nutzer)'),
          'subtitle', left(bm.message, 80),
          'meta', 'Blitz',
          'created_at', bm.created_at
        ) AS row, bm.created_at AS ts
        FROM public.blitz_chat_messages bm
        WHERE p_from IS NULL OR bm.created_at >= p_from
        UNION ALL
        SELECT jsonb_build_object(
          'id', dm.id,
          'title', coalesce((SELECT name FROM public.profiles WHERE user_id = dm.sender_id), '(Nutzer)'),
          'subtitle', left(dm.message, 80),
          'meta', 'DM',
          'created_at', dm.created_at
        ) AS row, dm.created_at AS ts
        FROM public.direct_messages dm
        WHERE p_from IS NULL OR dm.created_at >= p_from
      ) u
      ORDER BY ts DESC
      LIMIT lim
    ) s;

  ELSIF p_kind = 'reports' THEN
    SELECT jsonb_agg(row) INTO result FROM (
      SELECT jsonb_build_object(
        'id', r.id,
        'title', r.reason,
        'subtitle', 'gemeldet: ' || coalesce((SELECT name FROM public.profiles WHERE user_id = r.reported_user_id), '?'),
        'meta', 'von ' || coalesce((SELECT name FROM public.profiles WHERE user_id = r.reporter_id), '?') ||
                ' · ' || r.status,
        'created_at', r.created_at
      ) AS row
      FROM public.reports r
      WHERE p_from IS NULL OR r.created_at >= p_from
      ORDER BY r.created_at DESC
      LIMIT lim
    ) s;

  ELSE
    RAISE EXCEPTION 'unknown kind %', p_kind;
  END IF;

  RETURN coalesce(result, '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list(text, timestamptz, int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_list(text, timestamptz, int) TO authenticated;
