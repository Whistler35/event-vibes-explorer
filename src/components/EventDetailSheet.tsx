import React from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Clock, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
  music: "🎵 Musik",
  sports: "⚽ Sport",
  culture: "🎭 Kultur",
  food: "🍕 Food",
  nightlife: "🌙 Nightlife",
  outdoor: "🏔️ Outdoor",
  community: "👥 Community",
  workshop: "🔧 Workshop",
  other: "📌 Sonstiges",
};

const formatEventDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatEventTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " Uhr";
};

const EventDetailSheet: React.FC<EventDetailSheetProps> = ({ event, open, onClose }) => {
  const navigate = useNavigate();

  if (!event) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl bg-card border-border p-0 max-h-[75vh]">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <div className="overflow-y-auto px-5 pb-6 space-y-4">
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

          {/* Title + Category */}
          <div className="space-y-2">
            <h2 className="text-foreground text-xl font-bold">{event.title}</h2>
            {event.category && (
              <Badge variant="secondary" className="text-xs">
                {categoryLabels[event.category] || event.category}
              </Badge>
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
                  {event.current_participants ?? 0} / {event.max_participants} Teilnehmer
                </p>
              </div>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <div>
              <h3 className="text-foreground text-sm font-semibold mb-1">Beschreibung</h3>
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
