
CREATE TABLE public.host_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  host_user_id uuid NOT NULL,
  rating smallint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, host_user_id)
);

-- Validation trigger: rating must be 1-5
CREATE OR REPLACE FUNCTION public.validate_host_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  -- Prevent self-rating
  IF NEW.user_id = NEW.host_user_id THEN
    RAISE EXCEPTION 'Cannot rate yourself';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER check_host_rating
  BEFORE INSERT OR UPDATE ON public.host_ratings
  FOR EACH ROW EXECUTE FUNCTION public.validate_host_rating();

-- Updated_at trigger
CREATE TRIGGER update_host_ratings_updated_at
  BEFORE UPDATE ON public.host_ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.host_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ratings"
  ON public.host_ratings FOR SELECT
  USING (true);

CREATE POLICY "Auth users can create ratings"
  ON public.host_ratings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ratings"
  ON public.host_ratings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ratings"
  ON public.host_ratings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Index for fast avg queries
CREATE INDEX idx_host_ratings_host_user_id ON public.host_ratings(host_user_id);
