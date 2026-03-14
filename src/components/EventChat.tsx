import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Send } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  message: string;
  created_at: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
}

interface EventChatProps {
  eventId: string;
  eventTitle: string;
}

const EventChat = ({ eventId, eventTitle }: EventChatProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (eventId) {
      fetchChat();
    }
  }, [eventId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (chatId) {
      // Set up real-time subscription for new messages
      const channel = supabase
        .channel('chat-messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `chat_id=eq.${chatId}`
          },
          (payload) => {
            fetchMessages(); // Refetch to get user info
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [chatId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchChat = async () => {
    console.log('fetchChat called for eventId:', eventId);
    try {
      // Use get_or_create to ensure chat exists
      const { data: chatIdResult, error: rpcError } = await supabase
        .rpc('get_or_create_event_chat', { p_event_id: eventId });

      if (rpcError) {
        console.error('RPC error:', rpcError);
        // Fallback: try to just select
        const { data: chatData, error: chatError } = await supabase
          .from('event_chats')
          .select('id')
          .eq('event_id', eventId)
          .maybeSingle();

        if (chatError || !chatData) {
          setLoading(false);
          return;
        }
        setChatId(chatData.id);
        await fetchMessages(chatData.id);
        return;
      }

      if (chatIdResult) {
        setChatId(chatIdResult);
        await fetchMessages(chatIdResult);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching chat:', error);
      toast.error('Chat konnte nicht geladen werden');
      setLoading(false);
    }
  };

  const fetchMessages = async (chatIdParam?: string) => {
    const targetChatId = chatIdParam || chatId;
    if (!targetChatId) return;

    try {
      // Get messages with user info
      const { data: messageData, error: messageError } = await supabase
        .from('chat_messages')
        .select('id, message, created_at, user_id')
        .eq('chat_id', targetChatId)
        .order('created_at', { ascending: true });

      if (messageError) throw messageError;

      if (!messageData || messageData.length === 0) {
        setMessages([]);
        setLoading(false);
        return;
      }

      // Get user profiles for the messages
      const userIds = [...new Set(messageData.map(m => m.user_id))];
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, name, avatar_url')
        .in('user_id', userIds);

      if (profileError) throw profileError;

      // Combine messages with user info
      const messagesWithUsers = messageData.map(message => {
        const profile = profileData?.find(p => p.user_id === message.user_id);
        return {
          ...message,
          user_name: profile?.name || 'Unbekannter User',
          user_avatar: profile?.avatar_url
        };
      });

      setMessages(messagesWithUsers);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !chatId || sending) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          chat_id: chatId,
          user_id: user.id,
          message: newMessage.trim()
        });

      if (error) throw error;

      setNewMessage('');
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Nachricht konnte nicht gesendet werden');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Chat wird geladen...</div>
      </div>
    );
  }

  if (!chatId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-evendle-light-gray">
          <p>Noch kein Chat verfügbar.</p>
          <p className="text-sm mt-2">Der Chat wird erstellt, sobald jemand dem Event beitritt.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 border-b border-evendle-gray">
        <h3 className="text-white font-bold text-lg">{eventTitle}</h3>
        <p className="text-evendle-light-gray text-sm">Gruppenchat</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-evendle-light-gray">
            <p>Noch keine Nachrichten.</p>
            <p className="text-sm mt-2">Schreibe die erste Nachricht! 👋</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.user_id === user?.id ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex items-start space-x-2 max-w-[70%] ${
                  message.user_id === user?.id ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <Avatar className="w-8 h-8 mt-1">
                  <AvatarImage src={message.user_avatar} />
                  <AvatarFallback className="bg-evendle-orange text-white text-xs">
                    {message.user_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={`p-3 rounded-2xl ${
                    message.user_id === user?.id
                      ? 'bg-evendle-orange text-white rounded-br-md'
                      : 'bg-evendle-dark-card text-white rounded-bl-md'
                  }`}
                >
                  {message.user_id !== user?.id && (
                    <p className="text-xs text-evendle-light-gray mb-1">{message.user_name}</p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(message.created_at).toLocaleTimeString('de-DE', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-evendle-gray">
        <div className="flex space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Nachricht schreiben..."
            className="flex-1 bg-evendle-dark-card border-evendle-gray text-white"
          />
          <Button
            onClick={sendMessage}
            disabled={!newMessage.trim() || sending}
            className="bg-evendle-orange hover:bg-evendle-orange/80 text-white"
          >
            {sending ? '...' : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EventChat;