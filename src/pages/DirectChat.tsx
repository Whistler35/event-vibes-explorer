import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Zap, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { markConversationRead } from "@/hooks/useUnreadDMCount";
import UserActionsMenu from "@/components/moderation/UserActionsMenu";
import { EVENDLE_SYSTEM_ID } from "@/lib/constants";
import { shareInvite } from "@/lib/share";

interface Message {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

const DirectChat = () => {
  const { t } = useTranslation();
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: otherProfile } = useQuery({
    queryKey: ["dm-other-profile", conversationId],
    queryFn: async () => {
      if (!user || !conversationId) return null;
      const { data: convo } = await supabase
        .from("direct_conversations")
        .select("*")
        .eq("id", conversationId)
        .maybeSingle();
      if (!convo) return null;
      const otherId =
        (convo as any).participant1_id === user.id
          ? (convo as any).participant2_id
          : (convo as any).participant1_id;
      if (otherId === EVENDLE_SYSTEM_ID) {
        return { user_id: EVENDLE_SYSTEM_ID, name: "EVENDLE", avatar_url: null };
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .eq("user_id", otherId)
        .maybeSingle();
      return profile;
    },
    enabled: !!user && !!conversationId,
  });

  const { data: myProfile } = useQuery({
    queryKey: ["dm-my-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!conversationId) return;
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (data) {
        setMessages(data as Message[]);
        markConversationRead(conversationId, user?.id);
      }
    };
    fetchMessages();

    const channel = supabase
      .channel(`dm-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const incoming = payload.new as Message;
          setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
          markConversationRead(conversationId, user?.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !user || !conversationId || sending) return;
    setSending(true);
    const text = newMessage.trim();
    setNewMessage("");
    const { data, error } = await supabase
      .from("direct_messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        message: text,
      } as any)
      .select()
      .single();
    if (!error) {
      if (data) {
        const inserted = data as Message;
        setMessages((prev) => (prev.some((m) => m.id === inserted.id) ? prev : [...prev, inserted]));
      }
      await supabase
        .from("direct_conversations")
        .update({ updated_at: new Date().toISOString() } as any)
        .eq("id", conversationId);
      queryClient.invalidateQueries({ queryKey: ["dm-conversations"] });
    }
    setSending(false);
  };

  const handleInvite = () =>
    shareInvite({
      title: "EVENDLE",
      text: "Join me on EVENDLE",
      url: `${window.location.origin}/`,
      copiedMessage: "Einladungslink kopiert",
    });

  const displayName = otherProfile?.name || t("directChat.chat");
  const firstName = displayName.split(" ")[0];
  const myFirst = myProfile?.name?.split(" ")[0] ?? "You";

  return (
    <div
      className="h-[100dvh] bg-background text-foreground flex flex-col"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
        <button
          onClick={() => navigate("/messenger")}
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-[0_4px_12px_-4px_rgba(0,0,0,0.1)]"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5 text-[hsl(var(--blitz-forest))]" />
        </button>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-black bg-[hsl(var(--bolt))] text-[hsl(var(--blitz-forest))]">
            <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--blitz-forest))]" />
            2 IN
          </div>
          {otherProfile?.user_id && otherProfile.user_id !== EVENDLE_SYSTEM_ID && (
            <UserActionsMenu
              targetUserId={otherProfile.user_id}
              targetUserName={otherProfile.name ?? undefined}
              context="direct_message"
              onBlockChange={(b) => {
                if (b) navigate("/messenger");
              }}
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-[0_4px_12px_-4px_rgba(0,0,0,0.1)] text-[hsl(var(--blitz-forest))]"
            />
          )}
        </div>
      </div>

      {/* Title + host */}
      <div className="px-5 pt-2 pb-4 shrink-0">
        <h1 className="font-display text-4xl font-bold tracking-tight text-foreground leading-tight">
          {displayName}
        </h1>
        <div
          className={`mt-3 flex items-center gap-2 ${otherProfile && otherProfile.user_id !== EVENDLE_SYSTEM_ID ? "cursor-pointer" : ""}`}
          onClick={() =>
            otherProfile &&
            otherProfile.user_id !== EVENDLE_SYSTEM_ID &&
            navigate(`/user/${otherProfile.user_id}`)
          }
        >
          <Avatar className="w-8 h-8">
            <AvatarImage src={otherProfile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-[hsl(var(--blitz-forest))] text-white text-[10px] font-black">
              {firstName?.[0] ?? "?"}
            </AvatarFallback>
          </Avatar>
          <p className="text-sm text-muted-foreground">
            {t('directChat.directChatWith')}{" "}
            <span className="text-foreground font-black">{firstName}</span>
          </p>
        </div>
      </div>

      {/* Who's in */}
      <div className="px-5 pb-4 shrink-0">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-2">
          {t('directChat.whosIn')}
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { p: myProfile, label: t('directChat.you') },
            { p: otherProfile, label: "IN" },
          ].map(({ p, label }, i) => (
            <div
              key={i}
              className="inline-flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-white shadow-sm"
            >
              <Avatar className="w-7 h-7">
                <AvatarImage src={p?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-[hsl(var(--blitz-forest))] text-white text-[10px] font-black">
                  {p?.name?.[0] ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="leading-tight">
                <p className="text-xs font-black">{p?.name?.split(" ")[0] ?? "?"}</p>
                <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
                  {label}
                </p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleInvite}
          className="mt-3 w-full rounded-full py-3 text-[13px] font-semibold text-[hsl(var(--blitz-forest))] border border-[hsl(var(--blitz-forest))]/20 hover:bg-white/60 active:scale-[0.98] transition inline-flex items-center justify-center gap-2"
        >
          <Users className="w-4 h-4" />
          {t('directChat.inviteMore')}
        </button>
      </div>

      {/* Chat */}
      <div className="px-5 pb-2 shrink-0">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground">
          The Huddle
        </p>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 pb-40 space-y-2">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground text-sm py-12">
            {t("directChat.noMessages")}
          </div>
        )}
        {messages.map((msg) => {
          const mine = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`w-full ${mine ? "flex justify-end" : ""}`}>
              <div
                className={`max-w-[85%] px-4 py-3 rounded-2xl shadow-sm ${
                  mine
                    ? "bg-[hsl(var(--blitz-forest))] text-white rounded-br-md"
                    : "bg-white text-foreground rounded-bl-md"
                }`}
              >
                {!mine && (
                  <p className="text-[11px] font-black text-[hsl(var(--blitz-forest))] mb-0.5">
                    {firstName}
                  </p>
                )}
                <p className="text-sm break-words whitespace-pre-wrap leading-snug">
                  {msg.message}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={handleSend}
        className="fixed left-0 right-0 bottom-0 px-4 pt-3 pb-4 flex items-center gap-2 z-20"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        <div className="flex-1 flex items-center gap-2 bg-white rounded-full pl-5 pr-2 py-2 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.12)]">
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={t('directChat.messagePlaceholder')}
            className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-sm"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="w-10 h-10 rounded-full bg-[hsl(var(--blitz-forest))] flex items-center justify-center disabled:opacity-30 shadow-sm"
            aria-label="Send"
          >
            <Zap className="w-4 h-4 fill-[hsl(var(--bolt))] text-[hsl(var(--bolt))]" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default DirectChat;
