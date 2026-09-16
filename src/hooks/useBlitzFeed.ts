import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FeedPost {
  id: string;
  match_id: string;
  author_id: string;
  photo_url: string;
  caption: string | null;
  visibility: "friends" | "public";
  created_at: string;
  authorName: string;
  authorAvatar: string | null;
  activity: string | null;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
}

export function useBlitzFeed(userId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ["blitz-feed", userId];

  const query = useQuery({
    queryKey,
    enabled: !!userId,
    queryFn: async () => {
      // RLS already restricts this to posts I'm allowed to see (mine,
      // friends', or public) — no visibility filtering needed client-side.
      const { data: posts } = await supabase
        .from("blitz_feed_posts" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(60);
      if (!posts || posts.length === 0) return [] as FeedPost[];

      const postIds = posts.map((p: any) => p.id);
      const authorIds = Array.from(new Set(posts.map((p: any) => p.author_id)));
      const matchIds = Array.from(new Set(posts.map((p: any) => p.match_id)));

      const [{ data: authors }, { data: matches }, { data: likes }, { data: comments }] = await Promise.all([
        supabase.from("profiles").select("user_id, name, avatar_url").in("user_id", authorIds),
        supabase.from("blitz_matches").select("id, blitz_request_id").in("id", matchIds),
        supabase.from("blitz_feed_post_likes" as any).select("post_id, user_id").in("post_id", postIds),
        supabase.from("blitz_feed_post_comments" as any).select("post_id").in("post_id", postIds),
      ]);

      const requestIds = Array.from(new Set((matches ?? []).map((m: any) => m.blitz_request_id)));
      const { data: requests } = requestIds.length
        ? await supabase.from("blitz_requests").select("id, activity").in("id", requestIds)
        : { data: [] as any[] };

      const activityByMatch = new Map(
        (matches ?? []).map((m: any) => [
          m.id,
          requests?.find((r: any) => r.id === m.blitz_request_id)?.activity ?? null,
        ])
      );

      return posts.map((p: any) => {
        const author = authors?.find((a: any) => a.user_id === p.author_id);
        const postLikes = ((likes ?? []) as any[]).filter((l) => l.post_id === p.id);
        return {
          id: p.id,
          match_id: p.match_id,
          author_id: p.author_id,
          photo_url: p.photo_url,
          caption: p.caption,
          visibility: p.visibility,
          created_at: p.created_at,
          authorName: author?.name || "Jemand",
          authorAvatar: author?.avatar_url || null,
          activity: activityByMatch.get(p.match_id) ?? null,
          likeCount: postLikes.length,
          likedByMe: postLikes.some((l) => l.user_id === userId),
          commentCount: ((comments ?? []) as any[]).filter((c) => c.post_id === p.id).length,
        } as FeedPost;
      });
    },
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`blitz-feed-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "blitz_feed_posts" }, () =>
        queryClient.invalidateQueries({ queryKey })
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "blitz_feed_post_likes" }, () =>
        queryClient.invalidateQueries({ queryKey })
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "blitz_feed_post_comments" }, () =>
        queryClient.invalidateQueries({ queryKey })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const toggleLike = useCallback(
    async (postId: string, currentlyLiked: boolean) => {
      if (!userId) return;
      queryClient.setQueryData<FeedPost[]>(queryKey, (old) =>
        (old ?? []).map((p) =>
          p.id === postId
            ? { ...p, likedByMe: !currentlyLiked, likeCount: p.likeCount + (currentlyLiked ? -1 : 1) }
            : p
        )
      );
      if (currentlyLiked) {
        await supabase
          .from("blitz_feed_post_likes" as any)
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId);
      } else {
        await supabase.from("blitz_feed_post_likes" as any).insert({ post_id: postId, user_id: userId });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId]
  );

  const deletePost = useCallback(
    async (postId: string) => {
      await supabase.from("blitz_feed_posts" as any).delete().eq("id", postId);
      queryClient.invalidateQueries({ queryKey });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId]
  );

  return { posts: query.data ?? [], isLoading: query.isLoading, toggleLike, deletePost, refetch: query.refetch };
}
