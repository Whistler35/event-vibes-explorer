-- Fix 1: Storage - Add user-scoped path restrictions to avatars bucket
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Fix 1b: Storage - Add user-scoped path restrictions to event-images bucket
DROP POLICY IF EXISTS "Users can upload event images" ON storage.objects;
CREATE POLICY "Users can upload event images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'event-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update event images" ON storage.objects;
CREATE POLICY "Users can update event images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'event-images'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Fix 2: Geo RPCs - Add approval_status filter
CREATE OR REPLACE FUNCTION public.search_events_bbox(sw_lat float, sw_lng float, ne_lat float, ne_lng float)
RETURNS SETOF public.events AS $$
  SELECT * FROM public.events
  WHERE location IS NOT NULL
    AND visibility = 'public'
    AND approval_status = 'approved'
    AND ST_Intersects(
      location::geometry,
      ST_MakeEnvelope(sw_lng, sw_lat, ne_lng, ne_lat, 4326)
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.search_events_radius(center_lat float, center_lng float, radius_meters float)
RETURNS SETOF public.events AS $$
  SELECT * FROM public.events
  WHERE location IS NOT NULL
    AND visibility = 'public'
    AND approval_status = 'approved'
    AND ST_DWithin(location, ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography, radius_meters);
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;