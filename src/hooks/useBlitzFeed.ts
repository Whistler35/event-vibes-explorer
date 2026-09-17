import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { getBlockedIds } from "@/lib/moderation";
import { deleteStoragePhoto } from "@/lib/storagePhoto";

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
  taggedPeople: { user_id: string; name: string; avatar_url: string | null }[];
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
      const [{ data: postsRaw }, blockedIds] = await Promise.all([
        supabase
          .from("blitz_feed_posts" as any)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(60),
        getBlockedIds(),
      ]);
      const posts = (postsRaw ?? []).filter((p: any) => !blockedIds.has(p.author_id));
      if (posts.length === 0) return [] as FeedPost[];

      const postIds = posts.map((p: any) => p.id);
      const authorIds = Array.from(new Set(posts.map((p: any) => p.author_id)));
      const matchIds = Array.from(new Set(posts.map((p: any) => p.match_id)));

      const [{ data: authors }, { data: matches }, { data: likes }, { data: comments }, { data: tags }] =
        await Promise.all([
          supabase.from("profiles").select("user_id, name, avatar_url").in("user_id", authorIds),
          supabase.from("blitz_matches").select("id, blitz_request_id").in("id", matchIds),
          supabase.from("blitz_feed_post_likes" as any).select("post_id, user_id").in("post_id", postIds),
          supabase.from("blitz_feed_post_comments" as any).select("post_id").in("post_id", postIds),
          supabase.from("blitz_feed_post_tags" as any).select("post_id, tagged_user_id").in("post_id", postIds),
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

      const taggedIds = Array.from(new Set(((tags ?? []) as any[]).map((t) => t.tagged_user_id)));
      const { data: taggedProfiles } = taggedIds.length
        ? await supabase.from("profiles").select("user_id, name, avatar_url").in("user_id", taggedIds)
        : { data: [] as any[] };

      return posts.map((p: any) => {
        const author = authors?.find((a: any) => a.user_id === p.author_id);
        const postLikes = ((likes ?? []) as any[]).filter((l) => l.post_id === p.id);
        const postTags = ((tags ?? []) as any[]).filter((t) => t.post_id === p.id);
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
          taggedPeople: postTags.map((t) => {
            const prof = taggedProfiles?.find((tp: any) => tp.user_id === t.tagged_user_id);
            return { user_id: t.tagged_user_id, name: prof?.name || "Jemand", avatar_url: prof?.avatar_url || null };
          }),
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
      .on("postgres_changes", { event: "*", schema: "public", table: "blitz_feed_post_tags" }, () =>
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
        trackEvent(userId, "feed_post_liked", { post_id: postId });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId]
  );

  const deletePost = useCallback(
    async (postId: string, photoUrl?: string) => {
      await supabase.from("blitz_feed_posts" as any).delete().eq("id", postId);
      queryClient.invalidateQueries({ queryKey });
      deleteStoragePhoto(photoUrl);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId]
  );

  const setPostTags = useCallback(
    async (postId: string, taggedUserIds: string[]) => {
      if (!userId) return;
      const { data: existing } = await supabase
        .from("blitz_feed_post_tags" as any)
        .select("tagged_user_id")
        .eq("post_id", postId);
      const existingIds = new Set(((existing ?? []) as any[]).map((t) => t.tagged_user_id));
      const toAdd = taggedUserIds.filter((id) => !existingIds.has(id));
      const toRemove = Array.from(existingIds).filter((id) => !taggedUserIds.includes(id as string));

      if (toAdd.length) {
        await supabase
          .from("blitz_feed_post_tags" as any)
          .insert(toAdd.map((tagged_user_id) => ({ post_id: postId, tagged_user_id, tagged_by: userId })));
      }
      if (toRemove.length) {
        await supabase
          .from("blitz_feed_post_tags" as any)
          .delete()
          .eq("post_id", postId)
          .in("tagged_user_id", toRemove as string[]);
      }
      queryClient.invalidateQueries({ queryKey });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId]
  );

  return {
    posts: query.data ?? [],
    isLoading: query.isLoading,
    toggleLike,
    deletePost,
    setPostTags,
    refetch: query.refetch,
  };
}
