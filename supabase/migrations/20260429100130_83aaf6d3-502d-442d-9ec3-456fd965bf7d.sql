-- Create public bucket for event images (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-images', 'event-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read access
CREATE POLICY "Public can view event images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'event-images');

-- Admins can manage
CREATE POLICY "Admins can upload event images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'event-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update event images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'event-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete event images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'event-images' AND has_role(auth.uid(), 'admin'::app_role));