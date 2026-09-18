import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FriendProfile {
  user_id: string;
  name: string;
  avatar_url: string | null;
}

/** All of the user's accepted friends — used for @-mention autocomplete in comments. */
export function useFriends(userId: string | undefined) {
  return useQuery({
    queryKey: ["friends", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [] as FriendProfile[];
      const { data: fs } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
      const ids = Array.from(
        new Set((fs ?? []).map((f: any) => (f.requester_id === userId ? f.addressee_id : f.requester_id)))
      );
      if (ids.length === 0) return [] as FriendProfile[];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", ids);
      return (profiles ?? []) as FriendProfile[];
    },
  });
}
