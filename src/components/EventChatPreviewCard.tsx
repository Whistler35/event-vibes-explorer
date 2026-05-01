import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MessageCircle, ChevronRight } from "lucide-react";

interface Props {
  eventId: string;
}

interface PreviewState {
  lastMessage: string | null;
  lastSender: string | null;
  lastAt: string | null;
  unreadCount: number;
  chatId: string | null;
}

const formatRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'gerade eben';
  if (m < 60) return `vor ${m} Min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `vor ${h} Std`;
  const d = Math.floor(h / 24);
  return `vor ${d} Tag${d > 1 ? 'en' : ''}`;
};

const EventChatPreviewCard = ({ eventId }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [state, setState] = useState<PreviewState>({
    lastMessage: null,
    lastSender: null,
    lastAt: null,
    unreadCount: 0,
    chatId: null,
  });

  const loadPreview = async () => {
    if (!user) return;

    // Get chat
    const { data: chat } = await supabase
      .from('event_chats')
      .select('id')
      .eq('event_id', eventId)
      .maybeSingle();

    if (!chat) {
      setState((s) => ({ ...s, chatId: null }));
      return;
    }

    // Get last message
    const { data: msgs } = await supabase
      .from('chat_messages')
      .select('id, message, created_at, user_id')
      .eq('chat_id', chat.id)
      .order('created_at', { ascending: false })
      .limit(1);

    let lastMessage: string | null = null;
    let lastSender: string | null = null;
    let lastAt: string | null = null;

    if (msgs && msgs.length > 0) {
      const m = msgs[0];
      lastMessage = m.message;
      lastAt = m.created_at;
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('user_id', m.user_id)
        .maybeSingle();
      lastSender = profile?.name || 'Jemand';
    }

    // Get unread count via conversation_reads
    const { data: read } = await supabase
      .from('conversation_reads')
      .select('last_read_at')
      .eq('conversation_id', chat.id)
      .eq('user_id', user.id)
      .maybeSingle();

    let unreadCount = 0;
    if (lastAt) {
      const since = read?.last_read_at || '1970-01-01';
      const { count } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('chat_id', chat.id)
        .gt('created_at', since)
        .neq('user_id', user.id);
      unreadCount = count || 0;
    }

    setState({ lastMessage, lastSender, lastAt, unreadCount, chatId: chat.id });
  };

  useEffect(() => {
    loadPreview();
  }, [eventId, user?.id]);

  useEffect(() => {
    if (!state.chatId) return;
    const ch = supabase
      .channel(`chat-preview-${state.chatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `chat_id=eq.${state.chatId}` },
        () => loadPreview()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [state.chatId]);

  const handleOpen = () => {
    navigate(`/event/${eventId}/chat`);
  };

  return (
    <button
      onClick={handleOpen}
      className="w-full text-left bg-primary text-primary-foreground rounded-2xl p-4 flex items-center gap-4 hover:bg-primary/90 transition-colors shadow-md active:scale-[0.99]"
    >
      <div className="w-12 h-12 rounded-full bg-citrus flex items-center justify-center shrink-0 relative">
        <MessageCircle className="w-6 h-6 text-primary" />
        {state.unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-destructive flex items-center justify-center">
            <span className="text-[11px] font-bold text-destructive-foreground">
              {state.unreadCount > 9 ? '9+' : state.unreadCount}
            </span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-bold text-base">Veranstaltungs-Chat</p>
          {state.unreadCount > 0 && (
            <span className="text-[11px] font-bold bg-citrus text-primary px-2 py-0.5 rounded-full shrink-0">
              {state.unreadCount} neu
            </span>
          )}
        </div>
        {state.lastMessage ? (
          <>
            <p className="text-sm text-primary-foreground/85 truncate mt-0.5">
              <span className="font-semibold">{state.lastSender}:</span> {state.lastMessage}
            </p>
            <p className="text-[11px] text-primary-foreground/60 mt-0.5">
              {state.lastAt && formatRelative(state.lastAt)}
            </p>
          </>
        ) : (
          <p className="text-sm text-primary-foreground/70 mt-0.5">
            Sei der Erste, der etwas schreibt 👋
          </p>
        )}
      </div>
      <ChevronRight className="w-5 h-5 text-primary-foreground/60 shrink-0" />
    </button>
  );
};

export default EventChatPreviewCard;
