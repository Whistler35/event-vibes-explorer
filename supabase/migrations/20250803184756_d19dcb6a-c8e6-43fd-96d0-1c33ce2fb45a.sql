-- Fix Storage Policies für Event-Bilder
-- Da Events jetzt öffentlich sind, müssen auch die Bilder öffentlich uploadbar sein

-- Entferne alte Storage Policies
DROP POLICY IF EXISTS "Anyone can view event images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload event images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update event images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete event images" ON storage.objects;

-- Erstelle neue öffentliche Storage Policies für event-images bucket
CREATE POLICY "Anyone can view event images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'event-images');

CREATE POLICY "Anyone can upload event images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'event-images');

CREATE POLICY "Anyone can update event images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'event-images');

CREATE POLICY "Anyone can delete event images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'event-images');