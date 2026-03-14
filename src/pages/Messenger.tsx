import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { MessageCircle, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConversationWithProfile {
  id: string;
  other_user_id: string;
  other_name: string;
  other_avatar: string | null;
  last_message: string | null;
  last_message_at: string | null;
}

const Messenger = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["dm-conversations", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get all conversations
      const { data: convos, error } = await supabase
        .from("direct_conversations")
        .select("*")
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .order("updated_at", { ascending: false });

      if (error || !convos) return [];

      // Get other user profiles
      const otherUserIds = convos.map((c: any) =>
        c.participant1_id === user.id ? c.participant2_id : c.participant1_id
      );

      if (otherUserIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", otherUserIds);

      // Get last message for each conversation
      const results: ConversationWithProfile[] = [];

      for (const convo of convos) {
        const otherId =
          (convo as any).participant1_id === user.id
            ? (convo as any).participant2_id
            : (convo as any).participant1_id;

        const profile = profiles?.find((p) => p.user_id === otherId);

        const { data: lastMsg } = await supabase
          .from("direct_messages")
          .select("message, created_at")
          .eq("conversation_id", (convo as any).id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        results.push({
          id: (convo as any).id,
          other_user_id: otherId,
          other_name: profile?.name || "Unbekannt",
          other_avatar: profile?.avatar_url || null,
          last_message: lastMsg?.message || null,
          last_message_at: lastMsg?.created_at || (convo as any).updated_at,
        });
      }

      return results;
    },
    enabled: !!user,
  });

  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[70vh] p-6 space-y-6">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
            <LogIn className="w-10 h-10 text-muted-foreground" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-foreground text-xl font-bold">Nicht eingeloggt</h2>
            <p className="text-muted-foreground text-sm">
              Melde dich an, um Nachrichten zu senden.
            </p>
          </div>
          <Button onClick={() => navigate("/auth")} className="w-full max-w-xs">
            Anmelden
          </Button>
        </div>
      </Layout>
    );
  }

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 0)
      return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return "Gestern";
    if (diffDays < 7)
      return date.toLocaleDateString("de-DE", { weekday: "long" });
    return date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  };

  const getAvatarUrl = (name: string, avatar: string | null) =>
    avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ff5722&color=fff&size=100`;

  return (
    <Layout>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="text-primary text-2xl font-bold">+</div>
            <span className="text-foreground text-xl font-bold">Nachrichten</span>
          </div>
        </div>

        {/* Conversations List */}
        <div className="space-y-1">
          {/* EVENDLE Welcome Chat - always first */}
          <div
            onClick={() => navigate("/dm/evendle-welcome")}
            className="flex items-center space-x-4 p-3 rounded-2xl cursor-pointer hover:bg-card/50 transition-colors"
          >
            <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">E</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-foreground font-semibold text-lg truncate">EVENDLE</h3>
                <span className="text-muted-foreground text-sm flex-shrink-0 ml-2">Team</span>
              </div>
              <p className="text-muted-foreground text-sm truncate">
                Willkommen bei Evendle! 🎉
              </p>
            </div>
          </div>

          {/* Real conversations */}
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Laden...</p>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => navigate(`/dm/${conversation.id}`)}
                className="flex items-center space-x-4 p-3 rounded-2xl cursor-pointer hover:bg-card/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                  <img
                    src={getAvatarUrl(conversation.other_name, conversation.other_avatar)}
                    alt={conversation.other_name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-foreground font-semibold text-lg truncate">
                      {conversation.other_name}
                    </h3>
                    <span className="text-muted-foreground text-sm flex-shrink-0 ml-2">
                      {formatTime(conversation.last_message_at)}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm truncate">
                    {conversation.last_message || "Noch keine Nachricht"}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Messenger;
