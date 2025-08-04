-- Update the handle_new_user function to include bio and fun_fact
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, age, country, bio, fun_fact)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data ->> 'name', 'New User'),
    (NEW.raw_user_meta_data ->> 'age')::INTEGER,
    NEW.raw_user_meta_data ->> 'country',
    NEW.raw_user_meta_data ->> 'bio',
    NEW.raw_user_meta_data ->> 'fun_fact'
  );
  RETURN NEW;
END;
$$;