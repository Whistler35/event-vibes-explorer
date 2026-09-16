import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Consecutive weeks (most recent backwards) with at least one completed Blitz. */
export function useBlitzStreak(userId: string | undefined) {
  const { data } = useQuery({
    queryKey: ["blitz-streak", userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_blitz_streak_weeks", { p_user_id: userId });
      if (error) return 0;
      return (data as number) ?? 0;
    },
  });
  return data ?? 0;
}
