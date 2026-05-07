import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markConversationRead } from "@/hooks/useUnreadDMCount";

interface Message {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

const DirectChat = () => {
  const { t, i18n } = useTranslation();
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch other user's profile
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

      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .eq("user_id", otherId)
        .maybeSingle();

      return profile;
    },
    enabled: !!user && !!conversationId,
  });

  // Fetch messages
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

    // Realtime subscription
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
          setMessages((prev) => [...prev, payload.new as Message]);
          markConversationRead(conversationId, user?.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !conversationId || sending) return;
    setSending(true);

    const { error } = await supabase.from("direct_messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      message: newMessage.trim(),
    } as any);

    if (!error) {
      setNewMessage("");
      // Update conversation timestamp
      await supabase
        .from("direct_conversations")
        .update({ updated_at: new Date().toISOString() } as any)
        .eq("id", conversationId);

      queryClient.invalidateQueries({ queryKey: ["dm-conversations"] });
    }

    setSending(false);
  };

  const displayName = otherProfile?.name || t('directChat.chat');
  const avatarUrl =
    otherProfile?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=ff5722&color=fff&size=100`;

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString(i18n.language === 'de' ? "de-DE" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Layout showBottomNav={false}>
      <div className="flex flex-col h-[100dvh]" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border bg-card shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/messenger")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() =>
              otherProfile && navigate(`/user/${otherProfile.user_id}`)
            }
          >
            <div className="w-10 h-10 rounded-full overflow-hidden">
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-foreground font-bold text-lg">{displayName}</h1>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-muted-foreground text-center text-sm py-8">
              {t('directChat.noMessages')}
            </p>
          )}
          {messages.map((msg) => {
            const isMine = msg.sender_id === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-card text-foreground rounded-bl-sm"
                  }`}
                >
                  <p className="text-sm">{msg.message}</p>
                  <p
                    className={`text-[10px] mt-1 ${
                      isMine
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    }`}
                  >
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border bg-background">
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Nachricht..."
              className="flex-1 bg-card rounded-full px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary border border-border"
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              className="rounded-full h-12 w-12"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DirectChat;
