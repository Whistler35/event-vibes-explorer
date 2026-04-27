-- Create EVENDLE system user in auth.users (only if missing)
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated',
  'system+evendle@evendle.com',
  crypt(gen_random_uuid()::text, gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"system","providers":["system"]}'::jsonb,
  '{"name":"EVENDLE","is_system":true}'::jsonb,
  false
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001'::uuid
);

-- Create matching profile (uses handle_new_user trigger or manual insert)
INSERT INTO public.profiles (user_id, name, bio)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'EVENDLE',
  'Offizieller EVENDLE-Account für kuratierte öffentliche Events aus Innsbruck und Umgebung.'
)
ON CONFLICT (user_id) DO NOTHING;