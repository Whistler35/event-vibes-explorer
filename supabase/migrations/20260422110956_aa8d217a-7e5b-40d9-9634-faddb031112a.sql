-- Status enums
CREATE TYPE public.blitz_status AS ENUM ('active', 'expired', 'cancelled', 'matched');
CREATE TYPE public.blitz_swipe_direction AS ENUM ('left', 'right');
CREATE TYPE public.blitz_match_status AS ENUM ('active', 'expired', 'closed');

-- Helper trigger function for updated_at (create only if missing)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =============================================
-- blitz_requests
-- =============================================
CREATE TABLE public.blitz_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID NOT NULL,
  activity TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  city TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status public.blitz_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT blitz_activity_length CHECK (char_length(activity) BETWEEN 1 AND 80),
  CONSTRAINT blitz_duration_range CHECK (duration_minutes BETWEEN 15 AND 240)
);

CREATE INDEX idx_blitz_requests_host ON public.blitz_requests(host_id);
CREATE INDEX idx_blitz_requests_discovery ON public.blitz_requests(status, expires_at DESC, city);

ALTER TABLE public.blitz_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users view active blitz requests"
ON public.blitz_requests FOR SELECT TO authenticated
USING (status = 'active' AND expires_at > now());

CREATE POLICY "Hosts can view own blitz requests"
ON public.blitz_requests FOR SELECT TO authenticated
USING (auth.uid() = host_id);

CREATE POLICY "Authenticated users create own blitz requests"
ON public.blitz_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update own blitz requests"
ON public.blitz_requests FOR UPDATE TO authenticated
USING (auth.uid() = host_id);

CREATE POLICY "Hosts can delete own blitz requests"
ON public.blitz_requests FOR DELETE TO authenticated
USING (auth.uid() = host_id);

CREATE TRIGGER update_blitz_requests_updated_at
BEFORE UPDATE ON public.blitz_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- blitz_swipes
-- =============================================
CREATE TABLE public.blitz_swipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blitz_request_id UUID NOT NULL REFERENCES public.blitz_requests(id) ON DELETE CASCADE,
  swiper_id UUID NOT NULL,
  direction public.blitz_swipe_direction NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(blitz_request_id, swiper_id)
);

ALTER TABLE public.blitz_swipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own swipes"
ON public.blitz_swipes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = swiper_id);

CREATE POLICY "Users can view own swipes"
ON public.blitz_swipes FOR SELECT TO authenticated
USING (auth.uid() = swiper_id);

CREATE POLICY "Hosts can view swipes on their requests"
ON public.blitz_swipes FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.blitz_requests br
  WHERE br.id = blitz_swipes.blitz_request_id AND br.host_id = auth.uid()
));

CREATE POLICY "Hosts can update swipes on their requests"
ON public.blitz_swipes FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.blitz_requests br
  WHERE br.id = blitz_swipes.blitz_request_id AND br.host_id = auth.uid()
));

CREATE INDEX idx_blitz_swipes_request ON public.blitz_swipes(blitz_request_id);
CREATE INDEX idx_blitz_swipes_swiper ON public.blitz_swipes(swiper_id);

CREATE TRIGGER trg_blitz_swipes_updated
BEFORE UPDATE ON public.blitz_swipes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- blitz_matches
-- =============================================
CREATE TABLE public.blitz_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blitz_request_id UUID NOT NULL REFERENCES public.blitz_requests(id) ON DELETE CASCADE,
  host_id UUID NOT NULL,
  participant_id UUID NOT NULL,
  status public.blitz_match_status NOT NULL DEFAULT 'active',
  chat_expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(blitz_request_id, participant_id)
);

ALTER TABLE public.blitz_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Match participants can view"
ON public.blitz_matches FOR SELECT TO authenticated
USING (auth.uid() = host_id OR auth.uid() = participant_id);

CREATE POLICY "Hosts can create matches on own requests"
ON public.blitz_matches FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = host_id
  AND EXISTS (
    SELECT 1 FROM public.blitz_requests br
    WHERE br.id = blitz_matches.blitz_request_id AND br.host_id = auth.uid()
  )
);

CREATE POLICY "Match participants can update"
ON public.blitz_matches FOR UPDATE TO authenticated
USING (auth.uid() = host_id OR auth.uid() = participant_id);

CREATE INDEX idx_blitz_matches_request ON public.blitz_matches(blitz_request_id);
CREATE INDEX idx_blitz_matches_host ON public.blitz_matches(host_id);
CREATE INDEX idx_blitz_matches_participant ON public.blitz_matches(participant_id);

CREATE TRIGGER trg_blitz_matches_updated
BEFORE UPDATE ON public.blitz_matches
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- blitz_chat_messages
-- =============================================
CREATE TABLE public.blitz_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.blitz_matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.blitz_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Match participants can view messages"
ON public.blitz_chat_messages FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.blitz_matches bm
  WHERE bm.id = blitz_chat_messages.match_id
    AND (bm.host_id = auth.uid() OR bm.participant_id = auth.uid())
));

CREATE POLICY "Match participants can send messages"
ON public.blitz_chat_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.blitz_matches bm
    WHERE bm.id = blitz_chat_messages.match_id
      AND bm.status = 'active'
      AND bm.chat_expires_at > now()
      AND (bm.host_id = auth.uid() OR bm.participant_id = auth.uid())
  )
);

CREATE INDEX idx_blitz_chat_match ON public.blitz_chat_messages(match_id);

-- =============================================
-- Notification triggers
-- =============================================
CREATE OR REPLACE FUNCTION public.notify_host_on_blitz_swipe()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_host_id UUID;
  v_activity TEXT;
  v_swiper_name TEXT;
BEGIN
  IF NEW.direction <> 'right' THEN
    RETURN NEW;
  END IF;

  SELECT host_id, activity INTO v_host_id, v_activity
  FROM public.blitz_requests WHERE id = NEW.blitz_request_id;

  SELECT name INTO v_swiper_name
  FROM public.profiles WHERE user_id = NEW.swiper_id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_host_id, 'blitz_request', 'Neue Blitz-Anfrage ⚡',
    COALESCE(v_swiper_name, 'Jemand') || ' möchte bei "' || v_activity || '" mitmachen!',
    jsonb_build_object(
      'blitz_request_id', NEW.blitz_request_id,
      'swipe_id', NEW.id,
      'swiper_id', NEW.swiper_id
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_host_on_blitz_swipe
AFTER INSERT ON public.blitz_swipes
FOR EACH ROW EXECUTE FUNCTION public.notify_host_on_blitz_swipe();

CREATE OR REPLACE FUNCTION public.notify_on_blitz_match()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_activity TEXT;
  v_host_name TEXT;
BEGIN
  SELECT activity INTO v_activity
  FROM public.blitz_requests WHERE id = NEW.blitz_request_id;

  SELECT name INTO v_host_name
  FROM public.profiles WHERE user_id = NEW.host_id;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    NEW.participant_id, 'blitz_match', 'MATCH! ⚡',
    'Du machst mit ' || COALESCE(v_host_name, 'jemandem') || ' bei "' || v_activity || '" mit. Chat startet jetzt!',
    jsonb_build_object(
      'match_id', NEW.id,
      'blitz_request_id', NEW.blitz_request_id,
      'host_id', NEW.host_id
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_blitz_match
AFTER INSERT ON public.blitz_matches
FOR EACH ROW EXECUTE FUNCTION public.notify_on_blitz_match();

-- =============================================
-- Realtime
-- =============================================
ALTER TABLE public.blitz_swipes REPLICA IDENTITY FULL;
ALTER TABLE public.blitz_matches REPLICA IDENTITY FULL;
ALTER TABLE public.blitz_chat_messages REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.blitz_swipes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blitz_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blitz_chat_messages;