-- Real, DB-backed "EVENDLE" welcome chat for every new user, replacing the
-- previous client-only fake entry (hardcoded list item in Messenger.tsx,
-- routing to /dm/evendle-welcome — a non-UUID id that made every DB query
-- against it error out, so it could never actually be marked read).
--
-- The EVENDLE system account is a reserved sentinel UUID with NO row in
-- auth.users or public.profiles (direct_conversations/direct_messages have
-- no FK to auth.users, so this is fine at the DB level) — the client
-- recognizes this id and renders "EVENDLE" + a fallback avatar directly
-- instead of looking up a profile.

CREATE OR REPLACE FUNCTION public.create_evendle_welcome_chat(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_system_id CONSTANT uuid := '00000000-0000-0000-0000-0000000000e1';
  v_p1 uuid;
  v_p2 uuid;
  v_conv_id uuid;
BEGIN
  IF p_user_id = v_system_id THEN RETURN; END IF;

  IF p_user_id < v_system_id THEN v_p1 := p_user_id; v_p2 := v_system_id;
  ELSE v_p1 := v_system_id; v_p2 := p_user_id; END IF;

  SELECT id INTO v_conv_id FROM public.direct_conversations
  WHERE participant1_id = v_p1 AND participant2_id = v_p2;

  IF v_conv_id IS NOT NULL THEN RETURN; END IF; -- idempotent, e.g. re-run for an existing user

  INSERT INTO public.direct_conversations (participant1_id, participant2_id)
  VALUES (v_p1, v_p2)
  RETURNING id INTO v_conv_id;

  INSERT INTO public.direct_messages (conversation_id, sender_id, message, created_at) VALUES
    (v_conv_id, v_system_id,
     'Willkommen bei EVENDLE ⚡ Kurz erklärt, wie''s funktioniert:',
     now()),
    (v_conv_id, v_system_id,
     'Ein „Blitz" ist eine Aktivität, auf die du gerade Lust hast — z. B. „Kaffee?" oder „Padel?". Unter „Mein Blitz" erstellst du einen, stellst eine Dauer ein, fertig.',
     now() + interval '1 second'),
    (v_conv_id, v_system_id,
     'Leute in deiner Nähe sehen deinen Blitz unter „Entdecken" und können mitmachen. Sobald jemand dabei ist, entsteht automatisch ein „Huddle" — ein Gruppenchat nur für euch, genau hier bei den Chats.',
     now() + interval '2 seconds'),
    (v_conv_id, v_system_id,
     'Der Huddle läuft, solange dein Blitz aktiv ist — danach verschwindet er wieder von selbst. Und jetzt: worauf hast du gerade Lust? ⚡',
     now() + interval '3 seconds');
END;
$$;

REVOKE ALL ON FUNCTION public.create_evendle_welcome_chat(uuid) FROM public, anon, authenticated;

-- Extend the existing new-user trigger to also create the welcome chat.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'User'));
  PERFORM public.create_evendle_welcome_chat(NEW.id);
  RETURN NEW;
END;
$$;

-- Backfill: give every existing user the welcome chat too.
DO $$
DECLARE
  v_user record;
BEGIN
  FOR v_user IN SELECT user_id FROM public.profiles LOOP
    PERFORM public.create_evendle_welcome_chat(v_user.user_id);
  END LOOP;
END $$;
