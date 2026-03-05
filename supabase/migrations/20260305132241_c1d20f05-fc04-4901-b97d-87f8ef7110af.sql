
-- =============================================
-- EVENDLE: Complete Backend Schema Setup
-- =============================================

-- 1) PostGIS Extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2) Enums
CREATE TYPE public.event_category AS ENUM (
  'music', 'sports', 'culture', 'food', 'nightlife',
  'outdoor', 'community', 'workshop', 'other'
);
CREATE TYPE public.event_source AS ENUM ('curated', 'imported', 'community');
CREATE TYPE public.event_visibility AS ENUM ('public', 'unlisted');
CREATE TYPE public.join_request_status AS ENUM ('pending', 'accepted', 'rejected', 'cancelled');

-- 3) Updated_at helper function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 4) Events table (full schema)
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category public.event_category DEFAULT 'other',
  source public.event_source DEFAULT 'community',
  visibility public.event_visibility DEFAULT 'public',
  event_date TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  location_name TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location geography(Point, 4326),
  image_url TEXT,
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Events RLS: Public read for visible events, owner-based write
CREATE POLICY "Public can view visible events"
  ON public.events FOR SELECT
  USING (visibility = 'public');

CREATE POLICY "Auth users create events"
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owner updates own events"
  ON public.events FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Owner deletes own events"
  ON public.events FOR DELETE
  USING (auth.uid() = created_by);

-- Events indexes
CREATE INDEX idx_events_location ON public.events USING GIST (location);
CREATE INDEX idx_events_category ON public.events (category);
CREATE INDEX idx_events_event_date ON public.events (event_date);
CREATE INDEX idx_events_source ON public.events (source);
CREATE INDEX idx_events_visibility ON public.events (visibility);
CREATE INDEX idx_events_created_by ON public.events (created_by);

-- Auto-sync geography from lat/lng
CREATE OR REPLACE FUNCTION public.sync_event_location()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER sync_location_on_upsert
  BEFORE INSERT OR UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.sync_event_location();

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age INTEGER,
  bio TEXT,
  fun_fact TEXT,
  country TEXT,
  avatar_url TEXT,
  instagram_username TEXT,
  instagram_followers TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'User'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6) Event participants
CREATE TABLE public.event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view participants"
  ON public.event_participants FOR SELECT USING (true);

CREATE POLICY "Auth users can join events"
  ON public.event_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave events"
  ON public.event_participants FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_participants_event ON public.event_participants (event_id);
CREATE INDEX idx_participants_user ON public.event_participants (user_id);

-- 7) Event chats
CREATE TABLE public.event_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
  chat_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.event_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view event chats"
  ON public.event_chats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.event_participants
      WHERE event_participants.event_id = event_chats.event_id
      AND event_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "System can create event chats"
  ON public.event_chats FOR INSERT
  WITH CHECK (true);

CREATE TRIGGER update_event_chats_updated_at
  BEFORE UPDATE ON public.event_chats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8) Chat messages
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.event_chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view chat messages"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.event_chats ec
      JOIN public.event_participants ep ON ep.event_id = ec.event_id
      WHERE ec.id = chat_messages.chat_id
      AND ep.user_id = auth.uid()
    )
  );

CREATE POLICY "Participants can send messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.event_chats ec
      JOIN public.event_participants ep ON ep.event_id = ec.event_id
      WHERE ec.id = chat_id
      AND ep.user_id = auth.uid()
    )
  );

CREATE INDEX idx_chat_messages_chat ON public.chat_messages (chat_id);

-- 9) Join requests (Community Events)
CREATE TABLE public.join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.join_request_status NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own requests"
  ON public.join_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owners see requests for their events"
  ON public.join_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = join_requests.event_id
      AND events.created_by = auth.uid()
    )
  );

CREATE POLICY "Auth users can request"
  ON public.join_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update request status"
  ON public.join_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = join_requests.event_id
      AND events.created_by = auth.uid()
    )
  );

CREATE POLICY "User can cancel own request"
  ON public.join_requests FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending');

CREATE INDEX idx_join_requests_event ON public.join_requests (event_id);
CREATE INDEX idx_join_requests_user ON public.join_requests (user_id);
CREATE INDEX idx_join_requests_status ON public.join_requests (status);

CREATE TRIGGER update_join_requests_updated_at
  BEFORE UPDATE ON public.join_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10) Auto-create chat on first participant join
CREATE OR REPLACE FUNCTION public.create_event_chat_on_first_join()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.event_chats (event_id, chat_name)
  SELECT NEW.event_id, (SELECT title FROM public.events WHERE id = NEW.event_id)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.event_chats WHERE event_id = NEW.event_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_create_event_chat_on_first_join
  AFTER INSERT ON public.event_participants
  FOR EACH ROW EXECUTE FUNCTION public.create_event_chat_on_first_join();

-- 11) PostGIS RPC functions for geo queries
CREATE OR REPLACE FUNCTION public.search_events_bbox(sw_lat float, sw_lng float, ne_lat float, ne_lng float)
RETURNS SETOF public.events AS $$
  SELECT * FROM public.events
  WHERE location IS NOT NULL
    AND ST_Intersects(
      location::geometry,
      ST_MakeEnvelope(sw_lng, sw_lat, ne_lng, ne_lat, 4326)
    )
    AND visibility = 'public';
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.search_events_radius(center_lat float, center_lng float, radius_meters float)
RETURNS SETOF public.events AS $$
  SELECT * FROM public.events
  WHERE location IS NOT NULL
    AND ST_DWithin(location, ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography, radius_meters)
    AND visibility = 'public';
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 12) Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('event-images', 'event-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

CREATE POLICY "Anyone can view event images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'event-images');

CREATE POLICY "Auth users can upload event images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'event-images' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
