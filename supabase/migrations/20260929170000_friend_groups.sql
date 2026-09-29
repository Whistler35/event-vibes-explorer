-- Friend groups: lets a user organize their friends into named groups
-- (e.g. "Arbeit", "Beachvolleyball-Crew") and reuse a group as a quick
-- audience pick when creating a Blitz ("Ausgewählte" -> pick a whole
-- group instead of tapping every person individually).

CREATE TABLE IF NOT EXISTS public.friend_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.friend_group_members (
  group_id uuid NOT NULL REFERENCES public.friend_groups(id) ON DELETE CASCADE,
  friend_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, friend_user_id)
);

CREATE INDEX IF NOT EXISTS idx_friend_groups_owner ON public.friend_groups(owner_id);
CREATE INDEX IF NOT EXISTS idx_friend_group_members_group ON public.friend_group_members(group_id);

ALTER TABLE public.friend_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_group_members ENABLE ROW LEVEL SECURITY;

-- Groups are a private organizational tool — only the owner ever sees or
-- edits them (not the members themselves, same as e.g. iOS Contacts groups).
CREATE POLICY "Owner manages own friend groups" ON public.friend_groups
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owner manages own friend group members" ON public.friend_group_members
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.friend_groups g WHERE g.id = group_id AND g.owner_id = auth.uid()))
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.friend_groups g WHERE g.id = group_id AND g.owner_id = auth.uid())
    -- Can only add people who are actually accepted friends.
    AND EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
        AND ((f.requester_id = auth.uid() AND f.addressee_id = friend_user_id)
          OR (f.addressee_id = auth.uid() AND f.requester_id = friend_user_id))
    )
  );

DROP TRIGGER IF EXISTS update_friend_groups_updated_at ON public.friend_groups;
CREATE TRIGGER update_friend_groups_updated_at
  BEFORE UPDATE ON public.friend_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
