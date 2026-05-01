import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Check, Ticket as TicketIcon, MapPin, Calendar as CalendarIcon } from "lucide-react";
import EventChatPreviewCard from "./EventChatPreviewCard";
import QuickTicketSheet from "./QuickTicketSheet";
import { downloadEventIcs, formatCountdown } from "@/lib/calendar";

interface Participant {
  id: string;
  user_id: string;
  name: string;
  avatar_url?: string | null;
}

interface EventLite {
  id: string;
  title: string;
  description?: string | null;
  event_date: string;
  end_time?: string | null;
  location_name: string;
  latitude: number | null;
  longitude: number | null;
}

interface Props {
  event: EventLite;
  userId: string;
  participants: Participant[];
  onLeave: () => void;
  leaveLoading: boolean;
}

const EventParticipantStatus = ({ event, userId, participants, onLeave, leaveLoading }: Props) => {
  const navigate = useNavigate();
  const [ticketOpen, setTicketOpen] = useState(false);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
  const [countdown, setCountdown] = useState(() => formatCountdown(event.event_date, event.end_time));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const i = setInterval(() => {
      setCountdown(formatCountdown(event.event_date, event.end_time));
    }, 30000);
    return () => clearInterval(i);
  }, [event.event_date, event.end_time]);

  const handleRoute = () => {
    if (event.latitude && event.longitude) {
      window.open(
        `https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`,
        '_blank'
      );
    } else {
      window.open(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location_name)}`,
        '_blank'
      );
    }
  };

  const handleCalendar = () => {
    downloadEventIcs(event);
  };

  const otherParticipants = participants.filter((p) => p.user_id !== userId);

  return (
    <div ref={ref} id="participant-status-block" className="space-y-3">
      {/* Status Card */}
      <div className="rounded-2xl bg-primary/10 border-2 border-primary p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0">
          <Check className="w-5 h-5 text-primary-foreground stroke-[3]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground">Du bist dabei!</p>
          <p className="text-sm text-muted-foreground">{countdown}</p>
        </div>
      </div>

      {/* Chat Preview - das Herzstück */}
      <EventChatPreviewCard eventId={event.id} />

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setTicketOpen(true)}
          className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl bg-card border border-border hover:bg-accent transition-colors active:scale-95"
        >
          <TicketIcon className="w-5 h-5 text-primary" />
          <span className="text-xs font-semibold text-foreground">Ticket</span>
        </button>
        <button
          onClick={handleRoute}
          className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl bg-card border border-border hover:bg-accent transition-colors active:scale-95"
        >
          <MapPin className="w-5 h-5 text-primary" />
          <span className="text-xs font-semibold text-foreground">Route</span>
        </button>
        <button
          onClick={handleCalendar}
          className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl bg-card border border-border hover:bg-accent transition-colors active:scale-95"
        >
          <CalendarIcon className="w-5 h-5 text-primary" />
          <span className="text-xs font-semibold text-foreground">Kalender</span>
        </button>
      </div>

      {/* Mitstreiter */}
      {otherParticipants.length > 0 && (
        <div className="rounded-2xl bg-card border border-border p-4">
          <p className="text-sm font-bold text-foreground mb-3">
            Mitstreiter ({otherParticipants.length})
          </p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {otherParticipants.slice(0, 12).map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/user/${p.user_id}`)}
                className="flex flex-col items-center gap-1 shrink-0 w-14 active:scale-95 transition-transform"
              >
                <Avatar className="w-12 h-12 border-2 border-primary/20">
                  <AvatarImage src={p.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                    {p.name[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                  {p.name.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Leave Button - dezent */}
      <div className="pt-2 flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirmLeaveOpen(true)}
          disabled={leaveLoading}
          className="text-muted-foreground hover:text-destructive text-xs"
        >
          {leaveLoading ? 'Wird abgemeldet...' : 'Doch absagen'}
        </Button>
      </div>

      <QuickTicketSheet
        open={ticketOpen}
        onClose={() => setTicketOpen(false)}
        eventId={event.id}
        userId={userId}
        eventTitle={event.title}
      />

      <AlertDialog open={confirmLeaveOpen} onOpenChange={setConfirmLeaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wirklich absagen?</AlertDialogTitle>
            <AlertDialogDescription>
              Du verlierst deinen Platz und den Zugang zum Veranstaltungs-Chat. Du kannst dem Event später wieder beitreten, falls noch Plätze frei sind.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bleiben</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmLeaveOpen(false);
                onLeave();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ja, absagen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EventParticipantStatus;
