-- Apple's Guideline 2.1(a) reply: "we need to have a way to verify all app
-- features... including access to other users" — the review demo account
-- (benjamin+applereview@evendle.com) had zero friends, so the whole
-- friends/profile-of-others part of the app was empty for the reviewer.
-- Give it an accepted friendship with the main account so there's someone
-- to look at.

DO $$
DECLARE
  v_demo_id uuid;
  v_main_id uuid;
BEGIN
  SELECT id INTO v_demo_id FROM auth.users WHERE email = 'benjamin+applereview@evendle.com';
  SELECT id INTO v_main_id FROM auth.users WHERE email = 'benjamin@evendle.com';

  IF v_demo_id IS NULL OR v_main_id IS NULL THEN
    RAISE NOTICE 'Skipping: demo (%) or main (%) account not found', v_demo_id, v_main_id;
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE (requester_id = v_demo_id AND addressee_id = v_main_id)
       OR (requester_id = v_main_id AND addressee_id = v_demo_id)
  ) THEN
    INSERT INTO public.friendships (requester_id, addressee_id, status)
    VALUES (v_demo_id, v_main_id, 'accepted');
  END IF;
END $$;
