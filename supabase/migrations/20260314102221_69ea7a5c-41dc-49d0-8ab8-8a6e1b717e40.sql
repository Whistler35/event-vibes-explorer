
-- Friendships table (bidirectional after acceptance)
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  addressee_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id)
);

-- Event likes table
CREATE TABLE public.event_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

-- Enable RLS
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_likes ENABLE ROW LEVEL SECURITY;

-- Friendships RLS policies
CREATE POLICY "Users can view own friendships" ON public.friendships
  FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can send friend requests" ON public.friendships
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update friendships addressed to them" ON public.friendships
  FOR UPDATE TO authenticated
  USING (auth.uid() = addressee_id);

CREATE POLICY "Users can delete own friendships" ON public.friendships
  FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Event likes RLS policies
CREATE POLICY "Users can view all likes" ON public.event_likes
  FOR SELECT USING (true);

CREATE POLICY "Auth users can like events" ON public.event_likes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike events" ON public.event_likes
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
