-- Being tagged in a Blitz Feed photo now grants visibility of that post
-- regardless of its friends/public setting — you were there, you should
-- see it and have it show up in your own "Blitz-Momente" grid, even if
-- you and the poster aren't formally friends on Evendle.
CREATE OR REPLACE FUNCTION public.can_view_feed_post(p_post_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blitz_feed_posts p
    WHERE p.id = p_post_id
      AND (
        p.visibility = 'public'
        OR p.author_id = p_user_id
        OR EXISTS (
          SELECT 1 FROM public.friendships f
          WHERE f.status = 'accepted'
            AND ((f.requester_id = p.author_id AND f.addressee_id = p_user_id)
              OR (f.addressee_id = p.author_id AND f.requester_id = p_user_id))
        )
        OR EXISTS (
          SELECT 1 FROM public.blitz_feed_post_tags t
          WHERE t.post_id = p.id AND t.tagged_user_id = p_user_id
        )
      )
  );
$$;
