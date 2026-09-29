-- Admin report handling, requested feedback:
--  1) Admins/moderators get a push notification the moment a report comes in.
--  2) The reporter gets a short confirmation email.
--  3) Admins can delete the reported content (post/comment/blitz/DM) or the
--     reported user's whole account straight from the Admin-Statistiken page.

-- ---------------------------------------------------------------------------
-- 1+2) Notify on new report
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_on_new_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_admin   record;
  v_email   text;
  v_payload jsonb;
BEGIN
  -- Push every admin/moderator with a registered device. call_push_notification
  -- itself is a no-op (silently returns) for anyone without a subscription.
  FOR v_admin IN
    SELECT DISTINCT user_id FROM public.user_roles WHERE role IN ('admin', 'moderator')
  LOOP
    PERFORM public.call_push_notification(
      v_admin.user_id,
      '🚩 Neue Meldung',
      'Jemand wurde gemeldet — sieh dir den Fall in Admin · Statistiken an.',
      'new_report',
      jsonb_build_object('report_id', NEW.id)
    );
  END LOOP;

  -- Short confirmation email to whoever filed the report.
  SELECT email INTO v_email FROM auth.users WHERE id = NEW.reporter_id;
  IF v_email IS NOT NULL THEN
    v_payload := jsonb_build_object(
      'to', v_email,
      'from', 'EVENDLE <noreply@mail.evendle.com>',
      'sender_domain', 'mail.evendle.com',
      'subject', 'Deine Meldung ist bei uns eingegangen',
      'html', '<p>Hi,</p><p>danke für deine Meldung bei EVENDLE. Wir haben sie erhalten und das Team schaut sich den Fall zeitnah an.</p><p>Du musst nichts weiter tun.</p><p>— Dein EVENDLE Team</p>',
      'text', 'Hi, danke für deine Meldung bei EVENDLE. Wir haben sie erhalten und das Team schaut sich den Fall zeitnah an. Du musst nichts weiter tun. — Dein EVENDLE Team',
      'purpose', 'transactional',
      'label', 'report_confirmation'
    );
    BEGIN
      PERFORM pgmq.send('transactional_emails', v_payload);
    EXCEPTION WHEN undefined_table THEN
      PERFORM pgmq.create('transactional_emails');
      PERFORM pgmq.send('transactional_emails', v_payload);
    END;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW; -- never let a notification/email hiccup break report submission
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_new_report ON public.reports;
CREATE TRIGGER trg_notify_on_new_report
AFTER INSERT ON public.reports
FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_report();

-- ---------------------------------------------------------------------------
-- 3) Admin actions on a report
-- ---------------------------------------------------------------------------

-- Delete the reported content itself (mapped from context + reported_message_id)
-- and mark the report resolved. No-ops the content deletion if there's nothing
-- to map (e.g. a plain profile report).
CREATE OR REPLACE FUNCTION public.admin_delete_reported_content(p_report_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_context text;
  v_message_id uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT context, reported_message_id INTO v_context, v_message_id
  FROM public.reports WHERE id = p_report_id;

  IF v_message_id IS NOT NULL THEN
    IF v_context = 'feed_post' THEN
      DELETE FROM public.blitz_feed_posts WHERE id = v_message_id;
    ELSIF v_context = 'feed_comment' THEN
      DELETE FROM public.blitz_feed_post_comments WHERE id = v_message_id;
    ELSIF v_context = 'blitz' THEN
      DELETE FROM public.blitz_requests WHERE id = v_message_id;
    ELSIF v_context = 'direct_message' THEN
      DELETE FROM public.direct_messages WHERE id = v_message_id;
    END IF;
  END IF;

  UPDATE public.reports SET status = 'resolved' WHERE id = p_report_id;
END;
$$;

-- Mark handled without deleting anything (e.g. the report was unfounded).
CREATE OR REPLACE FUNCTION public.admin_resolve_report(p_report_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.reports SET status = 'resolved' WHERE id = p_report_id;
END;
$$;

-- Admin-triggered account deletion for a reported user — same best-effort
-- cleanup as delete_own_account(), just parameterized and admin-only instead
-- of self-only.
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'use delete_own_account for yourself';
  END IF;

  DELETE FROM public.blocked_users        WHERE blocker_id = p_user_id OR blocked_id = p_user_id;
  DELETE FROM public.reports              WHERE reporter_id = p_user_id OR reported_user_id = p_user_id;
  DELETE FROM public.direct_messages      WHERE sender_id = p_user_id;
  DELETE FROM public.direct_conversations WHERE participant1_id = p_user_id OR participant2_id = p_user_id;
  DELETE FROM public.blitz_swipes         WHERE swiper_id = p_user_id;
  DELETE FROM public.blitz_requests       WHERE host_id = p_user_id;
  DELETE FROM public.push_subscriptions   WHERE user_id = p_user_id;
  DELETE FROM public.friendships          WHERE requester_id = p_user_id OR addressee_id = p_user_id;
  DELETE FROM public.notifications        WHERE user_id = p_user_id;
  DELETE FROM public.profiles             WHERE user_id = p_user_id;

  DELETE FROM auth.users WHERE id = p_user_id;
EXCEPTION
  WHEN undefined_table OR undefined_column THEN
    DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_reported_content(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_reported_content(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_resolve_report(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_resolve_report(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_delete_user(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Extend admin_list('reports', ...) with the raw fields the admin UI needs
-- to act on a report (everything else in the function is unchanged).
-- ---------------------------------------------------------------------------
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
        'created_at', r.created_at,
        'reported_user_id', r.reported_user_id,
        'reported_user_name', coalesce((SELECT name FROM public.profiles WHERE user_id = r.reported_user_id), '?'),
        'reported_message_id', r.reported_message_id,
        'context', r.context,
        'status', r.status,
        'details', r.details
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
