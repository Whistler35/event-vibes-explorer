-- Bug: the previous fix (20260929200000) added idempotency_key, but the
-- email API also rejects transactional sends without an unsubscribe_token
-- (400 "Transactional emails must include an unsubscribe_token"). Fetch or
-- create one per recipient in email_unsubscribe_tokens (already used by the
-- unsubscribe infra, just never wired up to an actual send before now).

CREATE OR REPLACE FUNCTION public.notify_on_new_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_admin   record;
  v_email   text;
  v_token   text;
  v_payload jsonb;
BEGIN
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

  SELECT email INTO v_email FROM auth.users WHERE id = NEW.reporter_id;
  IF v_email IS NOT NULL THEN
    INSERT INTO public.email_unsubscribe_tokens (token, email)
    VALUES (replace(gen_random_uuid()::text, '-', ''), v_email)
    ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
    RETURNING token INTO v_token;

    v_payload := jsonb_build_object(
      'to', v_email,
      'from', 'EVENDLE <noreply@mail.evendle.com>',
      'sender_domain', 'mail.evendle.com',
      'subject', 'Deine Meldung ist bei uns eingegangen',
      'html', '<p>Hi,</p><p>danke für deine Meldung bei EVENDLE. Wir haben sie erhalten und das Team schaut sich den Fall zeitnah an.</p><p>Du musst nichts weiter tun.</p><p>— Dein EVENDLE Team</p>',
      'text', 'Hi, danke für deine Meldung bei EVENDLE. Wir haben sie erhalten und das Team schaut sich den Fall zeitnah an. Du musst nichts weiter tun. — Dein EVENDLE Team',
      'purpose', 'transactional',
      'label', 'report_confirmation',
      'idempotency_key', 'report_confirmation_' || NEW.id::text,
      'unsubscribe_token', v_token
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
  RETURN NEW;
END;
$$;
