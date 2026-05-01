ALTER TABLE public.blitz_requests
ADD COLUMN IF NOT EXISTS radius_km integer NOT NULL DEFAULT 10;

ALTER TABLE public.blitz_requests
ADD CONSTRAINT blitz_requests_radius_km_check CHECK (radius_km >= 1 AND radius_km <= 50);