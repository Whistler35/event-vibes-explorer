import React from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EventDetailSheetProps {
  event: {
    id: number | string;
    title: string;
    image?: string;
    category?: string;
    description?: string;
    event_date?: string;
    location_name?: string;
    max_participants?: number;
    current_participants?: number;
  } | null;
  open: boolean;
  onClose: () => void;
}

const categoryLabels: Record<string, string> = {
  music: "🎵 Music",
  sports: "⚽ Sports",
  culture: "🎭 Culture",
  food: "🍕 Food",
  nightlife: "🌙 Nightlife",
  outdoor: "🏔️ Outdoor",
  community: "👥 Community",
  workshop: "🔧 Workshop",
  other: "📌 Other",
};

const formatEventDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatEventTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
};

const EventDetailSheet: React.FC<EventDetailSheetProps> = ({ event, open, onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const eventId = event?.id?.toString() || '';

  // Check if user liked this event
  const { data: isLiked = false } = useQuery({
    queryKey: ['event-like', eventId, user?.id],
    queryFn: async () => {
      if (!user || !eventId) return false;
      const { data } = await supabase
        .from('event_likes')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && !!eventId && open,
  });

  // Like count
  const { data: likeCount = 0 } = useQuery({
    queryKey: ['event-like-count', eventId],
    queryFn: async () => {
      if (!eventId) return 0;
      const { count } = await supabase
        .from('event_likes')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId);
      return count || 0;
    },
    enabled: !!eventId && open,
  });

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!user || !eventId) throw new Error('Not authenticated');
      if (isLiked) {
        const { error } = await supabase
          .from('event_likes')
          .delete()
          .eq('event_id', eventId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('event_likes')
          .insert({ event_id: eventId, user_id: user.id } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-like', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event-like-count', eventId] });
    },
    onError: () => toast.error('Error liking event.'),
  });

  if (!event) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl bg-card border-border p-0 max-h-[80vh] flex flex-col overflow-hidden">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 px-5 pb-6 space-y-4 overscroll-contain touch-pan-y">
          {/* Image */}
          {event.image && (
            <div className="rounded-2xl overflow-hidden -mx-1">
              <img
                src={event.image}
                alt={event.title}
                className="w-full h-44 object-cover"
              />
            </div>
          )}

          {/* Title + Category + Like */}
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-2 flex-1">
              <h2 className="text-foreground text-xl font-bold">{event.title}</h2>
              {event.category && (
                <Badge variant="secondary" className="text-xs">
                  {categoryLabels[event.category] || event.category}
                </Badge>
              )}
            </div>
            {user && (
              <button
                onClick={() => toggleLike.mutate()}
                disabled={toggleLike.isPending}
                className="flex flex-col items-center gap-0.5 pt-1"
              >
                <Heart
                  className={`h-6 w-6 transition-colors ${
                    isLiked ? 'fill-destructive text-destructive' : 'text-muted-foreground'
                  }`}
                />
                {likeCount > 0 && (
                  <span className="text-muted-foreground text-xs">{likeCount}</span>
                )}
              </button>
            )}
          </div>

          {/* Info grid */}
          <div className="space-y-3">
            {event.event_date && (
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-foreground text-sm font-medium">{formatEventDate(event.event_date)}</p>
                  <p className="text-muted-foreground text-xs">{formatEventTime(event.event_date)}</p>
                </div>
              </div>
            )}

            {event.location_name && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <p className="text-foreground text-sm">{event.location_name}</p>
              </div>
            )}

            {event.max_participants != null && (
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <p className="text-foreground text-sm">
                  {event.current_participants ?? 0} / {event.max_participants} Participants
                </p>
              </div>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <div>
              <h3 className="text-foreground text-sm font-semibold mb-1">Description</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{event.description}</p>
            </div>
          )}

          {/* Action */}
          <Button
            className="w-full mt-2"
            onClick={() => {
              onClose();
              navigate(`/event/${event.id}`);
            }}
          >
            Mehr Details ansehen
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EventDetailSheet;
