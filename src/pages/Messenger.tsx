import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { MessageCircle, LogIn, Zap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isHuddleActive } from "@/lib/blitzHuddle";
import { getBlockedIds } from "@/lib/moderation";
import NotificationBell from "@/components/NotificationBell";

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
  isPendingBlitz?: boolean;
  blitzRequestId?: string;
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
        { event: "*", schema: "public", table: "blitz_match_participants" },
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blitz_requests", filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["dm-conversations", user.id] })
      )
      .subscribe();

    // Re-evaluate every 30s so expired huddles disappear without page reload.
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["dm-conversations", user.id] });
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user, queryClient]);

  const isEvenldeUnread = !localStorage.getItem("dm_last_read_evendle-welcome");

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["dm-conversations", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const [{ data: convosRaw, error }, blockedIds] = await Promise.all([
        supabase
          .from("direct_conversations")
          .select("*")
          .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
          .order("updated_at", { ascending: false }),
        getBlockedIds(),
      ]);

      if (error || !convosRaw) return [];

      const convos = convosRaw.filter((c: any) => {
        const otherId =
          c.participant1_id === user.id ? c.participant2_id : c.participant1_id;
        return !blockedIds.has(otherId);
      });

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

      // Load active Blitz group matches (where I'm a participant) and append as chats
      const { data: myParts } = await supabase
        .from("blitz_match_participants")
        .select("match_id")
        .eq("user_id", user.id);
      const myMatchIds = Array.from(new Set((myParts ?? []).map((p: any) => p.match_id)));

      const { data: matches } = myMatchIds.length
        ? await supabase
            .from("blitz_matches")
            .select("id, host_id, status, chat_expires_at, blitz_request_id, updated_at")
            .in("id", myMatchIds)
            .eq("status", "active")
            .gt("chat_expires_at", new Date().toISOString())
            .order("updated_at", { ascending: false })
        : { data: [] as any[] };

      if (matches && matches.length > 0) {
        const matchIds = matches.map((m: any) => m.id);
        const requestIds = matches.map((m: any) => m.blitz_request_id);

        const [{ data: allParts }, { data: blitzMsgs }, { data: blitzReqs }] = await Promise.all([
          supabase
            .from("blitz_match_participants")
            .select("match_id, user_id")
            .in("match_id", matchIds),
          supabase
            .from("blitz_chat_messages")
            .select("match_id, message, created_at, sender_id")
            .in("match_id", matchIds)
            .order("created_at", { ascending: false }),
          supabase.from("blitz_requests").select("id, activity").in("id", requestIds),
        ]);

        const otherIds = Array.from(
          new Set(
            (allParts ?? [])
              .map((p: any) => p.user_id)
              .filter((id: string) => id !== user.id)
          )
        );
        const { data: blitzProfiles } = otherIds.length
          ? await supabase.from("profiles").select("user_id, name, avatar_url").in("user_id", otherIds)
          : { data: [] as any[] };

        for (const m of matches as any[]) {
          const partsForMatch = (allParts ?? []).filter((p: any) => p.match_id === m.id);
          const otherIdsForMatch = partsForMatch
            .map((p: any) => p.user_id)
            .filter((id: string) => id !== user.id);
          const firstOther = blitzProfiles?.find((p: any) => p.user_id === otherIdsForMatch[0]);
          const lastMsg = blitzMsgs?.find((msg: any) => msg.match_id === m.id);
          const activity = blitzReqs?.find((r: any) => r.id === m.blitz_request_id)?.activity;
          const lastAt = lastMsg?.created_at || m.updated_at;
          const unread =
            !!lastMsg &&
            lastMsg.sender_id !== user.id &&
            isConversationUnread(`blitz_${m.id}`, lastAt, user.id);

          // A huddle is always named after its Blitz. Only fall back to a
          // participant's name if the Blitz somehow has no activity text.
          const huddleName = activity || firstOther?.name || t('messenger.match');
          const title =
            partsForMatch.length > 2
              ? `${huddleName} · ${partsForMatch.length} 👥`
              : huddleName;

          results.push({
            id: `blitz_${m.id}`,
            matchId: m.id,
            other_user_id: otherIdsForMatch[0] ?? "",
            other_name: title,
            other_avatar: firstOther?.avatar_url || null,
            last_message: lastMsg?.message || `⚡ ${activity || t('messenger.match')}`,
            last_message_at: lastAt,
            isUnread: unread,
            isBlitz: true,
            blitzActivity: activity,
            expiresAt: m.chat_expires_at,
            participantCount: partsForMatch.length,
          });
        }
      }

      // Own active Blitz requests → show a pending huddle even before any match exists
      const nowIso = new Date().toISOString();
      const { data: myRequests } = await (supabase as any)
        .from("blitz_requests")
        .select("id, activity, expires_at, status, created_at")
        .eq("user_id", user.id)
        .eq("status", "active")
        .gt("expires_at", nowIso);

      const matchedRequestIds = new Set(
        (matches ?? []).map((m: any) => m.blitz_request_id).filter(Boolean)
      );

      for (const req of (myRequests ?? []) as any[]) {
        if (matchedRequestIds.has(req.id)) continue;
        if (!isHuddleActive({ expires_at: req.expires_at, status: req.status })) continue;
        results.push({
          id: `pending_blitz_${req.id}`,
          blitzRequestId: req.id,
          other_user_id: "",
          other_name: req.activity ?? t('messenger.match'),
          other_avatar: null,
          last_message: t('messenger.waitingForParticipants'),
          last_message_at: req.created_at,
          isUnread: false,
          isBlitz: true,
          isPendingBlitz: true,
          blitzActivity: req.activity,
          expiresAt: req.expires_at,
          participantCount: 1,
        });
      }

      // Event group chats were removed with the events feature (Lovable rebuild 3f3307a).

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
            <h2 className="text-foreground text-xl font-bold">{t('messenger.notLoggedIn')}</h2>
            <p className="text-muted-foreground text-sm">
              {t('messenger.notLoggedInSub')}
            </p>
          </div>
          <Button onClick={() => navigate("/auth")} className="w-full max-w-xs">
            {t('messenger.signIn')}
          </Button>
        </div>
      </Layout>
    );
  }

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const locale = i18n.language === 'de' ? 'de-DE' : 'en-GB';
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 0)
      return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
    if (diffDays === 1) return t('messenger.yesterday');
    if (diffDays < 7)
      return date.toLocaleDateString(locale, { weekday: "long" });
    return date.toLocaleDateString(locale, { day: "2-digit", month: "2-digit" });
  };

  const getAvatarUrl = (name: string, avatar: string | null) =>
    avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=ff5722&color=fff&size=100`;

  const activeConversations = conversations.filter((c) => c.isBlitz);
  const otherConversations = conversations.filter((c) => !c.isBlitz);

  const renderConversation = (conversation: ConversationWithProfile) => (
    <div
      key={conversation.id}
      onClick={() =>
        conversation.isPendingBlitz
          ? navigate("/blitz")
          : conversation.isBlitz
            ? navigate(`/blitz/match/${conversation.matchId}`)
            : conversation.isEventGroup
              ? navigate(`/event/${conversation.eventId}/chat`)
              : navigate(`/dm/${conversation.id}`)
      }
      className="flex items-center gap-4 p-4 rounded-3xl cursor-pointer transition bg-card hover:bg-card/90 shadow-[0_6px_18px_-8px_rgba(15,20,16,0.10)]"
    >
      <div className={`relative w-12 h-12 ${conversation.isBlitz || conversation.isEventGroup ? "rounded-2xl" : "rounded-full"} overflow-hidden flex-shrink-0 bg-[hsl(var(--muted))] flex items-center justify-center`}>
        {conversation.isBlitz ? (
          <Zap className="w-6 h-6 text-[hsl(var(--blitz-forest))] fill-[hsl(var(--blitz-forest))]" />
        ) : conversation.isEventGroup && !conversation.other_avatar ? (
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
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className={`truncate ${conversation.isUnread ? "font-black text-foreground" : "font-bold text-foreground"}`}>
            {conversation.other_name}
          </h3>
          <span className="text-xs text-muted-foreground flex-shrink-0 font-semibold">
            {conversation.isEventGroup && conversation.participantCount
              ? `${conversation.participantCount} 👥`
              : formatTime(conversation.last_message_at)}
          </span>
        </div>
        <p className={`text-sm truncate mt-0.5 ${conversation.isUnread ? "text-foreground" : "text-muted-foreground"}`}>
          {conversation.last_message || t('messenger.noMessage')}
        </p>
      </div>
      {conversation.isUnread && (
        <span className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--bolt))] flex-shrink-0" />
      )}
    </div>
  );


  return (
    <Layout>
      <div className="max-w-md mx-auto p-5 space-y-5">
        {/* Header */}
        <div className="pt-2 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-foreground">Chats</h1>
            <p className="text-sm text-muted-foreground mt-1">Your active Blitz huddles.</p>
          </div>
          <NotificationBell />
        </div>

        {/* EVENDLE Welcome Chat */}
        <div
          onClick={() => navigate("/dm/evendle-welcome")}
          className="flex items-center gap-4 p-4 rounded-3xl cursor-pointer transition bg-card hover:bg-card/90 shadow-[0_6px_18px_-8px_rgba(15,20,16,0.10)]"
        >
          <div className="relative w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0 bg-[hsl(var(--blitz-forest))] flex items-center justify-center">
            <span className="text-white font-black text-lg">E</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className={`truncate ${isEvenldeUnread ? "font-black" : "font-bold"} text-foreground`}>EVENDLE</h3>
              <span className="text-xs text-muted-foreground font-semibold">{t('messenger.team')}</span>
            </div>
            <p className={`text-sm truncate mt-0.5 ${isEvenldeUnread ? "text-foreground" : "text-muted-foreground"}`}>
              {t('messenger.welcome')}
            </p>
          </div>
          {isEvenldeUnread && <span className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--bolt))] flex-shrink-0" />}
        </div>


        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-3xl bg-card animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {activeConversations.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground px-2 flex items-center gap-1.5">
                  <Zap className="w-3 h-3 fill-current" /> Aktiv
                </h2>
                {activeConversations.map(renderConversation)}
              </section>
            )}

            {otherConversations.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground px-2">
                  Chats
                </h2>
                {otherConversations.map(renderConversation)}
              </section>
            )}

            {conversations.length === 0 && (
              <div className="text-center py-12 space-y-2">
                <p className="text-foreground font-bold">Noch keine Chats</p>
                <p className="text-sm text-muted-foreground">
                  Starte einen Blitz und match dich mit Leuten in deiner Nähe.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Messenger;
