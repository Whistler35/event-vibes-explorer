import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, ArrowLeft, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale/de";

interface PendingEvent {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  event_date: string;
  location_name: string;
  image_url: string | null;
  created_at: string;
  created_by: string | null;
  approval_status: string;
}

const AdminEvents = () => {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const [events, setEvents] = useState<PendingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, adminLoading, navigate]);

  const fetchPendingEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("id, title, description, category, event_date, location_name, image_url, created_at, created_by, approval_status")
      .eq("approval_status", "pending")
      .order("created_at", { ascending: false });

    if (!error && data) setEvents(data);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchPendingEvents();
  }, [isAdmin]);

  const handleApprove = async (eventId: string) => {
    const { error } = await supabase
      .from("events")
      .update({ approval_status: "approved" } as any)
      .eq("id", eventId);

    if (error) {
      toast.error("Fehler beim Freigeben");
    } else {
      toast.success("Event freigegeben! ✅");
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    }
  };

  const handleReject = async (eventId: string) => {
    const { error } = await supabase
      .from("events")
      .update({ approval_status: "rejected" } as any)
      .eq("id", eventId);

    if (error) {
      toast.error("Fehler beim Ablehnen");
    } else {
      toast.success("Event abgelehnt");
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    }
  };

  if (adminLoading || !isAdmin) return null;

  return (
    <Layout>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5 text-white" />
          </Button>
          <div>
            <h1 className="text-white text-xl font-bold">Event-Freigaben</h1>
            <p className="text-muted-foreground text-sm">
              {events.length} Event{events.length !== 1 ? "s" : ""} warten auf Freigabe
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground py-12">Laden...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <p className="text-white font-semibold">Alles erledigt!</p>
            <p className="text-muted-foreground text-sm">Keine offenen Events zur Prüfung.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-card rounded-2xl overflow-hidden border border-border"
              >
                {event.image_url && (
                  <img
                    src={event.image_url}
                    alt={event.title}
                    className="w-full h-36 object-cover"
                  />
                )}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-white font-bold text-lg">{event.title}</h3>
                    <Badge variant="outline" className="text-yellow-400 border-yellow-400/30 shrink-0">
                      <Clock className="w-3 h-3 mr-1" /> Pending
                    </Badge>
                  </div>

                  {event.description && (
                    <p className="text-muted-foreground text-sm line-clamp-2">
                      {event.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {format(new Date(event.event_date), "dd. MMM yyyy, HH:mm", { locale: de })}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {event.location_name}
                    </span>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <Button
                      onClick={() => handleReject(event.id)}
                      variant="outline"
                      className="flex-1 border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <XCircle className="w-4 h-4 mr-1" /> Ablehnen
                    </Button>
                    <Button
                      onClick={() => handleApprove(event.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" /> Freigeben
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminEvents;
