import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EligibleRecap {
  matchId: string;
  activity: string | null;
  endedAt: string;
}

/** Matches the user was part of that have ended and don't have a post from them yet. */
export function useEligibleRecaps(userId: string | undefined) {
  return useQuery({
    queryKey: ["eligible-recaps", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [] as EligibleRecap[];
      const nowIso = new Date().toISOString();

      const [{ data: hosted }, { data: myParts }] = await Promise.all([
        supabase
          .from("blitz_matches")
          .select("id, blitz_request_id, chat_expires_at")
          .eq("host_id", userId)
          .lte("chat_expires_at", nowIso),
        supabase.from("blitz_match_participants").select("match_id").eq("user_id", userId),
      ]);

      const joinedIds = (myParts ?? []).map((p: any) => p.match_id);
      const { data: joined } = joinedIds.length
        ? await supabase
            .from("blitz_matches")
            .select("id, blitz_request_id, chat_expires_at")
            .in("id", joinedIds)
            .lte("chat_expires_at", nowIso)
        : { data: [] as any[] };

      const uniqueMatches = Array.from(
        new Map([...(hosted ?? []), ...(joined ?? [])].map((m: any) => [m.id, m])).values()
      );
      if (uniqueMatches.length === 0) return [];

      const matchIds = uniqueMatches.map((m: any) => m.id);
      const { data: myPosts } = await supabase
        .from("blitz_feed_posts" as any)
        .select("match_id")
        .eq("author_id", userId)
        .in("match_id", matchIds);
      const postedIds = new Set(((myPosts ?? []) as any[]).map((p) => p.match_id));

      const remaining = uniqueMatches.filter((m: any) => !postedIds.has(m.id));
      const requestIds = Array.from(new Set(remaining.map((m: any) => m.blitz_request_id)));
      const { data: requests } = requestIds.length
        ? await supabase.from("blitz_requests").select("id, activity").in("id", requestIds)
        : { data: [] as any[] };

      return remaining
        .map((m: any) => ({
          matchId: m.id,
          activity: requests?.find((r: any) => r.id === m.blitz_request_id)?.activity ?? null,
          endedAt: m.chat_expires_at,
        }))
        .sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime());
    },
  });
}
