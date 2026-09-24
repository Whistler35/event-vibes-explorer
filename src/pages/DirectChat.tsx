import { useState, useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Zap, Users, Heart, Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { markConversationRead } from "@/hooks/useUnreadDMCount";
import { markDmNotificationsRead } from "@/hooks/useNotifications";
import UserActionsMenu from "@/components/moderation/UserActionsMenu";
import { EVENDLE_SYSTEM_ID } from "@/lib/constants";
import { shareInvite } from "@/lib/share";
import { PUBLIC_WEB_ORIGIN } from "@/lib/publicUrl";
import { useMessageReactions } from "@/hooks/useMessageReactions";
import { uploadChatPhoto, PHOTO_PLACEHOLDER } from "@/lib/chatPhoto";

interface Message {
  id: string;
  sender_id: string;
  message: string;
  photo_url?: string | null;
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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [burstId, setBurstId] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const { reactions, toggleHeart } = useMessageReactions(
    "direct_message_reactions",
    "conversation_id",
    conversationId,
    user?.id
  );

  const handleDoubleTap = (messageId: string) => {
    toggleHeart(messageId);
    setBurstId(messageId);
    setTimeout(() => setBurstId((cur) => (cur === messageId ? null : cur)), 700);
  };
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

    // Merges in any messages we don't already have — used for the initial
    // load, and as a fallback catch-up whenever realtime might have missed
    // something (app resumed from background, socket hiccup, etc.). Realtime
    // alone was leaving the chat stale until you left and re-entered the
    // screen, presumably because iOS suspends the WebView's WebSocket while
    // backgrounded and it doesn't always recover on its own.
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (data) {
        setMessages((prev) => {
          const byId = new Map(prev.map((m) => [m.id, m]));
          (data as Message[]).forEach((m) => byId.set(m.id, m));
          return Array.from(byId.values()).sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        });
        markConversationRead(conversationId, user?.id);
        if (user) markDmNotificationsRead(user.id, conversationId);
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
          if (user) markDmNotificationsRead(user.id, conversationId);
        }
      )
      .subscribe();

    // Poll as a safety net (realtime should usually beat this) and refetch
    // immediately whenever the app comes back to the foreground.
    const pollId = setInterval(fetchMessages, 4000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchMessages();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    let removeCapListener: (() => void) | undefined;
    if (Capacitor.isNativePlatform()) {
      import("@capacitor/app").then(({ App: CapApp }) => {
        CapApp.addListener("appStateChange", ({ isActive }) => {
          if (isActive) fetchMessages();
        }).then((handle) => {
          removeCapListener = () => handle.remove();
        });
      });
    }

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollId);
      document.removeEventListener("visibilitychange", handleVisibility);
      removeCapListener?.();
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

  const handlePickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) e.target.value = "";
    if (!file || !user || !conversationId) return;
    setUploadingPhoto(true);
    try {
      const photoUrl = await uploadChatPhoto(user.id, file);
      const { data, error } = await supabase
        .from("direct_messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          message: newMessage.trim() || PHOTO_PLACEHOLDER,
          photo_url: photoUrl,
        } as any)
        .select()
        .single();
      if (error) throw error;
      setNewMessage("");
      if (data) {
        const inserted = data as Message;
        setMessages((prev) => (prev.some((m) => m.id === inserted.id) ? prev : [...prev, inserted]));
      }
      await supabase
        .from("direct_conversations")
        .update({ updated_at: new Date().toISOString() } as any)
        .eq("id", conversationId);
      queryClient.invalidateQueries({ queryKey: ["dm-conversations"] });
    } catch (err: any) {
      toast.error(err.message || "Foto konnte nicht gesendet werden");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleInvite = () =>
    shareInvite({
      title: "EVENDLE",
      text: "Join me on EVENDLE",
      url: `${PUBLIC_WEB_ORIGIN}/`,
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
          const msgReactions = reactions[msg.id] ?? [];
          return (
            <div key={msg.id} className={`w-full ${mine ? "flex justify-end" : ""}`}>
              <div className="relative max-w-[85%]" onDoubleClick={() => handleDoubleTap(msg.id)}>
                <div
                  className={`${msg.photo_url ? "p-1.5" : "px-4 py-3"} rounded-2xl shadow-sm select-none ${
                    mine
                      ? "bg-[hsl(var(--blitz-forest))] text-white rounded-br-md"
                      : "bg-white text-foreground rounded-bl-md"
                  }`}
                >
                  {!mine && (
                    <p className={`text-[11px] font-black text-[hsl(var(--blitz-forest))] mb-0.5 ${msg.photo_url ? "px-2 pt-1" : ""}`}>
                      {firstName}
                    </p>
                  )}
                  {msg.photo_url && (
                    <button type="button" onClick={() => setPreviewPhoto(msg.photo_url!)} className="block">
                      <img
                        src={msg.photo_url}
                        alt=""
                        loading="lazy"
                        className="max-w-[220px] max-h-[280px] w-auto h-auto rounded-xl object-cover"
                      />
                    </button>
                  )}
                  {msg.message && msg.message !== PHOTO_PLACEHOLDER && (
                    <p className={`text-sm break-words whitespace-pre-wrap leading-snug ${msg.photo_url ? "px-2 pt-1.5 pb-0.5" : ""}`}>
                      {msg.message}
                    </p>
                  )}
                </div>
                {msgReactions.length > 0 && (
                  <div
                    className={`absolute -bottom-2.5 ${mine ? "left-1.5" : "right-1.5"} bg-white rounded-full shadow-sm px-1.5 py-0.5 flex items-center gap-0.5`}
                  >
                    <span className="text-xs">❤️</span>
                    {msgReactions.length > 1 && (
                      <span className="text-[10px] font-bold text-muted-foreground">{msgReactions.length}</span>
                    )}
                  </div>
                )}
                {burstId === msg.id && (
                  <Heart
                    className="absolute inset-0 m-auto w-14 h-14 text-[hsl(var(--blitz-pink))] fill-[hsl(var(--blitz-pink))] pointer-events-none animate-heart-burst"
                  />
                )}
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
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          disabled={uploadingPhoto}
          className="w-11 h-11 shrink-0 rounded-full bg-white flex items-center justify-center shadow-[0_8px_20px_-6px_rgba(0,0,0,0.12)] disabled:opacity-50"
          aria-label="Foto senden"
        >
          {uploadingPhoto ? (
            <Loader2 className="w-5 h-5 animate-spin text-[hsl(var(--blitz-forest))]" />
          ) : (
            <Camera className="w-5 h-5 text-[hsl(var(--blitz-forest))]" />
          )}
        </button>
        <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePickPhoto} />
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

      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4"
        >
          <img src={previewPhoto} alt="" className="max-w-full max-h-full rounded-2xl" />
        </div>
      )}
    </div>
  );
};

export default DirectChat;
