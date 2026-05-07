import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import evendleLogo from "@/assets/evendle-logo.jpeg";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { MessageCircle, LogIn, Zap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConversationWithProfile {
  id: string;
  other_user_id: string;
  other_name: string;
  other_avatar: string | null;
  last_message: string | null;
  last_message_at: string | null;
  isUnread: boolean;
  isBlitz?: boolean;
  matchId?: string;
  blitzActivity?: string;
  expiresAt?: string;
  isEventGroup?: boolean;
  eventId?: string;
  participantCount?: number;
}

const isConversationUnread = (convoId: string, lastMessageAt: string | null, userId: string, senderId?: string): boolean => {
  const lastRead = localStorage.getItem(`dm_last_read_${convoId}`);
  if (!lastRead) return true;
  if (!lastMessageAt) return false;
  return new Date(lastMessageAt) > new Date(lastRead);
};

const Messenger = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Realtime: refresh conversation list as soon as a new Blitz match (or new
  // direct message) appears, so the chat shows up instantly for both users.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`messenger-rt-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blitz_matches" },
        () => queryClient.invalidateQueries({ queryKey: ["dm-conversations", user.id] })
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        () => queryClient.invalidateQueries({ queryKey: ["dm-conversations", user.id] })
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "blitz_chat_messages" },
        () => queryClient.invalidateQueries({ queryKey: ["dm-conversations", user.id] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const isEvenldeUnread = !localStorage.getItem("dm_last_read_evendle-welcome");

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["dm-conversations", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: convos, error } = await supabase
        .from("direct_conversations")
        .select("*")
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .order("updated_at", { ascending: false });

      if (error || !convos) return [];

      const otherUserIds = convos.map((c: any) =>
        c.participant1_id === user.id ? c.participant2_id : c.participant1_id
      );

      if (otherUserIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", otherUserIds);

      const results: ConversationWithProfile[] = [];

      for (const convo of convos) {
        const otherId =
          (convo as any).participant1_id === user.id
            ? (convo as any).participant2_id
            : (convo as any).participant1_id;

        const profile = profiles?.find((p) => p.user_id === otherId);

        const { data: lastMsg } = await supabase
          .from("direct_messages")
          .select("message, created_at, sender_id")
          .eq("conversation_id", (convo as any).id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const lastMessageAt = lastMsg?.created_at || (convo as any).updated_at;
        const unread =
          lastMsg?.sender_id !== user.id &&
          isConversationUnread((convo as any).id, lastMessageAt, user.id);

        results.push({
          id: (convo as any).id,
          other_user_id: otherId,
          other_name: profile?.name || t('messenger.unknown'),
          other_avatar: profile?.avatar_url || null,
          last_message: lastMsg?.message || null,
          last_message_at: lastMessageAt,
          isUnread: !!unread,
        });
      }

      // Load active Blitz matches and append as chats
      const { data: matches } = await supabase
        .from("blitz_matches")
        .select("id, host_id, participant_id, status, chat_expires_at, blitz_request_id, updated_at")
        .or(`host_id.eq.${user.id},participant_id.eq.${user.id}`)
        .eq("status", "active")
        .gt("chat_expires_at", new Date().toISOString())
        .order("updated_at", { ascending: false });

      if (matches && matches.length > 0) {
        const matchIds = matches.map((m: any) => m.id);
        const otherIds = matches.map((m: any) =>
          m.host_id === user.id ? m.participant_id : m.host_id
        );
        const requestIds = matches.map((m: any) => m.blitz_request_id);

        const [{ data: blitzProfiles }, { data: blitzMsgs }, { data: blitzReqs }] = await Promise.all([
          supabase.from("profiles").select("user_id, name, avatar_url").in("user_id", otherIds),
          supabase
            .from("blitz_chat_messages")
            .select("match_id, message, created_at, sender_id")
            .in("match_id", matchIds)
            .order("created_at", { ascending: false }),
          supabase.from("blitz_requests").select("id, activity").in("id", requestIds),
        ]);

        for (const m of matches as any[]) {
          const otherId = m.host_id === user.id ? m.participant_id : m.host_id;
          const profile = blitzProfiles?.find((p: any) => p.user_id === otherId);
          const lastMsg = blitzMsgs?.find((msg: any) => msg.match_id === m.id);
          const activity = blitzReqs?.find((r: any) => r.id === m.blitz_request_id)?.activity;
          const lastAt = lastMsg?.created_at || m.updated_at;
          const unread =
            !!lastMsg &&
            lastMsg.sender_id !== user.id &&
            isConversationUnread(`blitz_${m.id}`, lastAt, user.id);

          results.push({
            id: `blitz_${m.id}`,
            matchId: m.id,
            other_user_id: otherId,
            other_name: profile?.name || t('messenger.match'),
            other_avatar: profile?.avatar_url || null,
            last_message: lastMsg?.message || `⚡ ${activity || t('messenger.match')}`,
            last_message_at: lastAt,
            isUnread: unread,
            isBlitz: true,
            blitzActivity: activity,
            expiresAt: m.chat_expires_at,
          });
        }
      }

      // Load event group chats (where user participates)
      const { data: myParticipations } = await supabase
        .from("event_participants")
        .select("event_id")
        .eq("user_id", user.id);

      const eventIds = (myParticipations || []).map((p: any) => p.event_id);

      if (eventIds.length > 0) {
        const [{ data: eventChats }, { data: eventsData }] = await Promise.all([
          supabase.from("event_chats").select("id, event_id").in("event_id", eventIds),
          supabase
            .from("events")
            .select("id, title, image_url, current_participants")
            .in("id", eventIds),
        ]);

        const chatIds = (eventChats || []).map((c: any) => c.id);

        const [{ data: lastMsgs }, { data: reads }] = await Promise.all([
          chatIds.length
            ? supabase
                .from("chat_messages")
                .select("chat_id, message, created_at, user_id")
                .in("chat_id", chatIds)
                .order("created_at", { ascending: false })
            : Promise.resolve({ data: [] as any[] }),
          chatIds.length
            ? supabase
                .from("conversation_reads")
                .select("conversation_id, last_read_at")
                .in("conversation_id", chatIds)
                .eq("user_id", user.id)
            : Promise.resolve({ data: [] as any[] }),
        ]);

        // Resolve sender names for last messages
        const senderIds = Array.from(
          new Set(
            (lastMsgs || [])
              .reduce((acc: Record<string, string>, m: any) => {
                if (!acc[m.chat_id]) acc[m.chat_id] = m.user_id;
                return acc;
              }, {} as Record<string, string>) &&
              (lastMsgs || []).map((m: any) => m.user_id)
          )
        );
        const { data: senderProfiles } = senderIds.length
          ? await supabase.from("profiles").select("user_id, name").in("user_id", senderIds)
          : { data: [] as any[] };

        for (const chat of eventChats || []) {
          const ev = eventsData?.find((e: any) => e.id === (chat as any).event_id);
          if (!ev) continue;
          const last = (lastMsgs || []).find((m: any) => m.chat_id === (chat as any).id);
          const lastAt = last?.created_at || null;
          const senderName = last
            ? senderProfiles?.find((p: any) => p.user_id === last.user_id)?.name?.split(" ")[0] || t('messenger.someone')
            : null;
          const lastReadEntry = (reads || []).find(
            (r: any) => r.conversation_id === (chat as any).id
          );
          const lastReadAt = lastReadEntry?.last_read_at;
          const unread =
            !!last &&
            last.user_id !== user.id &&
            (!lastReadAt || new Date(last.created_at) > new Date(lastReadAt));

          results.push({
            id: `event_${(chat as any).id}`,
            eventId: (ev as any).id,
            other_user_id: "",
            other_name: (ev as any).title,
            other_avatar: (ev as any).image_url || null,
            last_message: last
              ? `${senderName}: ${last.message}`
              : t('messenger.noMessageHint'),
            last_message_at: lastAt,
            isUnread: unread,
            isEventGroup: true,
            participantCount: (ev as any).current_participants || 0,
          });
        }
      }

      // Sort: unread first (newest on top), then read (newest on top)
      results.sort((a, b) => {
        if (a.isUnread !== b.isUnread) return a.isUnread ? -1 : 1;
        const dateA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const dateB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return dateB - dateA;
      });

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
            <img src={evendleLogo} alt="Evendle" className="w-9 h-9 object-contain" />
            <span className="text-foreground text-xl font-bold">EVENDLE</span>
          </div>
        </div>

        <div className="space-y-1">
          {/* EVENDLE Welcome Chat */}
          <div
            onClick={() => navigate("/dm/evendle-welcome")}
            className={`flex items-center space-x-4 p-3 rounded-2xl cursor-pointer transition-colors ${
              isEvenldeUnread
                ? "bg-primary/10 border border-primary/20"
                : "hover:bg-card/50"
            }`}
          >
            <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">E</span>
              {isEvenldeUnread && (
                <div className="absolute top-0 right-0 w-3 h-3 bg-primary rounded-full border-2 border-background" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className={`text-lg truncate ${isEvenldeUnread ? "text-foreground font-bold" : "text-foreground font-semibold"}`}>
                  EVENDLE
                </h3>
                <span className="text-muted-foreground text-sm flex-shrink-0 ml-2">Team</span>
              </div>
              <p className={`text-sm truncate ${isEvenldeUnread ? "text-foreground font-medium" : "text-muted-foreground"}`}>
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
                onClick={() =>
                  conversation.isBlitz
                    ? navigate(`/blitz/match/${conversation.matchId}`)
                    : conversation.isEventGroup
                      ? navigate(`/event/${conversation.eventId}/chat`)
                      : navigate(`/dm/${conversation.id}`)
                }
                className={`flex items-center space-x-4 p-3 rounded-2xl cursor-pointer transition-colors ${
                  conversation.isBlitz
                    ? "bg-[hsl(var(--blitz-pink))]/15 border border-[hsl(var(--blitz-pink))]/40 hover:bg-[hsl(var(--blitz-pink))]/20"
                    : conversation.isUnread
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-card/50"
                }`}
              >
                <div className={`relative w-12 h-12 ${conversation.isEventGroup ? "rounded-2xl" : "rounded-full"} overflow-hidden flex-shrink-0 bg-muted`}>
                  {conversation.isEventGroup && !conversation.other_avatar ? (
                    <div className="w-full h-full flex items-center justify-center bg-primary">
                      <Users className="w-6 h-6 text-primary-foreground" />
                    </div>
                  ) : (
                    <img
                      src={getAvatarUrl(conversation.other_name, conversation.other_avatar)}
                      alt={conversation.other_name}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {conversation.isBlitz && (
                    <div className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-[hsl(var(--blitz-pink))] flex items-center justify-center border-2 border-background">
                      <Zap className="w-2.5 h-2.5 text-white fill-white" />
                    </div>
                  )}
                  {conversation.isEventGroup && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center border-2 border-background">
                      <Users className="w-2.5 h-2.5 text-primary-foreground" />
                    </div>
                  )}
                  {!conversation.isBlitz && !conversation.isEventGroup && conversation.isUnread && (
                    <div className="absolute top-0 right-0 w-3 h-3 bg-primary rounded-full border-2 border-background" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-lg truncate ${conversation.isUnread ? "text-foreground font-bold" : "text-foreground font-semibold"}`}>
                      {conversation.other_name}
                      {conversation.isBlitz && (
                        <span className="ml-2 text-[10px] font-black uppercase tracking-wider text-[hsl(var(--blitz-pink))]">
                          Blitz
                        </span>
                      )}
                    </h3>
                    <span className={`text-sm flex-shrink-0 ml-2 ${
                      conversation.isBlitz
                        ? "text-[hsl(var(--blitz-pink))] font-bold"
                        : conversation.isUnread ? "text-primary font-semibold" : "text-muted-foreground"
                    }`}>
                      {conversation.isEventGroup && conversation.participantCount
                        ? `${conversation.participantCount} 👥`
                        : formatTime(conversation.last_message_at)}
                    </span>
                  </div>
                  <p className={`text-sm truncate ${conversation.isUnread ? "text-foreground font-medium" : "text-muted-foreground"}`}>
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
