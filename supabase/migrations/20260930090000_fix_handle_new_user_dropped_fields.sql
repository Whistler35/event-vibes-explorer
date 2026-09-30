-- Bug: handle_new_user() only ever wrote (user_id, name) to profiles since
-- 20260305132241 (and again 20260915100000) silently replaced the original
-- version, which also copied age/country/bio from the signup form's
-- metadata. Every account created since then has had those three fields
-- permanently null regardless of what was entered at signup — the classic
-- symptom: EditProfile shows blank fields for someone who swears they
-- already filled this in.
--
-- Also adds a real `birthday` column: Auth.tsx's signup form already
-- collects a date of birth and computes `age` from it client-side, but only
-- ever sent the derived age to the trigger — birthday itself was discarded.
-- EditProfile can now show/edit the actual birthday instead of a raw
-- "age" number that goes stale every year.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birthday date;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, age, birthday, country, bio)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'User'),
    (NEW.raw_user_meta_data->>'age')::INTEGER,
    NULLIF(NEW.raw_user_meta_data->>'birthday', '')::date,
    NEW.raw_user_meta_data->>'country',
    NEW.raw_user_meta_data->>'bio'
  );
  PERFORM public.create_evendle_welcome_chat(NEW.id);
  RETURN NEW;
END;
$$;
