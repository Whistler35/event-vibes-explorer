import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FriendGroup {
  id: string;
  name: string;
  memberIds: string[];
}

export function useFriendGroups(userId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ["friend-groups", userId];

  const query = useQuery({
    queryKey,
    enabled: !!userId,
    queryFn: async () => {
      const { data: groups, error } = await supabase
        .from("friend_groups" as any)
        .select("id, name")
        .order("created_at", { ascending: true });
      if (error) throw error;

      const groupIds = (groups ?? []).map((g: any) => g.id);
      const { data: members } = groupIds.length
        ? await supabase
            .from("friend_group_members" as any)
            .select("group_id, friend_user_id")
            .in("group_id", groupIds)
        : { data: [] as any[] };

      return (groups ?? []).map((g: any) => ({
        id: g.id,
        name: g.name,
        memberIds: ((members ?? []) as any[])
          .filter((m) => m.group_id === g.id)
          .map((m) => m.friend_user_id),
      })) as FriendGroup[];
    },
  });

  const createGroup = async (name: string) => {
    if (!userId || !name.trim()) return;
    const { error } = await supabase
      .from("friend_groups" as any)
      .insert({ owner_id: userId, name: name.trim() });
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey });
  };

  const renameGroup = async (groupId: string, name: string) => {
    if (!name.trim()) return;
    const { error } = await supabase
      .from("friend_groups" as any)
      .update({ name: name.trim() })
      .eq("id", groupId);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey });
  };

  const deleteGroup = async (groupId: string) => {
    const { error } = await supabase.from("friend_groups" as any).delete().eq("id", groupId);
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey });
  };

  const setGroupMembers = async (groupId: string, memberIds: string[]) => {
    // Simplest correct approach for a small friend list: replace wholesale.
    await supabase.from("friend_group_members" as any).delete().eq("group_id", groupId);
    if (memberIds.length > 0) {
      const { error } = await supabase
        .from("friend_group_members" as any)
        .insert(memberIds.map((friend_user_id) => ({ group_id: groupId, friend_user_id })));
      if (error) throw error;
    }
    queryClient.invalidateQueries({ queryKey });
  };

  return {
    groups: query.data ?? [],
    isLoading: query.isLoading,
    createGroup,
    renameGroup,
    deleteGroup,
    setGroupMembers,
  };
}
