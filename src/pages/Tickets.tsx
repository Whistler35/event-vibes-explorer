import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Calendar, MapPin, Ticket as TicketIcon, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Ticket {
  id: string;
  event_id: string;
  ticket_code: string;
  qr_token: string;
  checked_in_at: string | null;
  events: {
    id: string;
    title: string;
    event_date: string;
    location_name: string;
    image_url: string | null;
  } | null;
}

const Tickets = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchTickets();
  }, [user]);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from("event_tickets")
        .select("id, event_id, ticket_code, qr_token, checked_in_at, events(id, title, event_date, location_name, image_url)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTickets((data as any) || []);
    } catch (e: any) {
      toast.error("Tickets konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  };

  const upcoming = tickets.filter(t => t.events && new Date(t.events.event_date) >= new Date(new Date().setHours(0,0,0,0)));
  const past = tickets.filter(t => t.events && new Date(t.events.event_date) < new Date(new Date().setHours(0,0,0,0)));

  return (
    <Layout>
      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TicketIcon className="w-6 h-6 text-primary" />
              Meine Tickets
            </h1>
            <p className="text-sm text-muted-foreground">QR-Code beim Einlass vorzeigen</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-muted-foreground py-12">Lädt...</div>
        ) : tickets.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center space-y-3">
              <TicketIcon className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">Du hast noch keine Tickets.</p>
              <Button onClick={() => navigate("/")}>Events entdecken</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {upcoming.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-bold text-lg">Bevorstehend</h2>
                {upcoming.map(t => <TicketCard key={t.id} ticket={t} onOpen={() => setSelectedTicket(t)} />)}
              </section>
            )}
            {past.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-bold text-lg text-muted-foreground">Vergangen</h2>
                {past.map(t => <TicketCard key={t.id} ticket={t} onOpen={() => setSelectedTicket(t)} past />)}
              </section>
            )}
          </>
        )}

        <Dialog open={!!selectedTicket} onOpenChange={(o) => !o && setSelectedTicket(null)}>
          <DialogContent className="max-w-sm">
            <DialogTitle className="sr-only">Ticket QR-Code</DialogTitle>
            <DialogDescription className="sr-only">Vorzeigen beim Einlass</DialogDescription>
            {selectedTicket && (
              <div className="space-y-4 text-center">
                <div>
                  <h3 className="font-bold text-lg">{selectedTicket.events?.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedTicket.events && new Date(selectedTicket.events.event_date).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <div className="bg-white p-6 rounded-2xl flex items-center justify-center">
                  <QRCodeSVG value={selectedTicket.qr_token} size={240} level="H" />
                </div>
                <div className="space-y-1">
                  <Badge variant="outline" className="font-mono text-base tracking-widest">
                    {selectedTicket.ticket_code}
                  </Badge>
                  {selectedTicket.checked_in_at && (
                    <div className="flex items-center justify-center gap-1 text-sm text-primary font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      Eingecheckt am {new Date(selectedTicket.checked_in_at).toLocaleString("de-DE")}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Zeig diesen Code dem Veranstalter beim Eingang.
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

const TicketCard = ({ ticket, onOpen, past }: { ticket: Ticket; onOpen: () => void; past?: boolean }) => {
  if (!ticket.events) return null;
  const date = new Date(ticket.events.event_date);
  return (
    <Card className={`cursor-pointer hover:shadow-md transition ${past ? "opacity-60" : ""}`} onClick={onOpen}>
      <CardContent className="p-4 flex gap-3">
        <div className="bg-primary/10 rounded-xl p-2 flex items-center justify-center w-20 shrink-0">
          <QRCodeSVG value={ticket.qr_token} size={64} level="L" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold truncate">{ticket.events.title}</h3>
          <div className="text-sm text-muted-foreground space-y-0.5 mt-1">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {date.toLocaleDateString("de-DE")} · {date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
            </div>
            <div className="flex items-center gap-1 truncate">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{ticket.events.location_name}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="font-mono text-xs">{ticket.ticket_code}</Badge>
            {ticket.checked_in_at && (
              <Badge className="bg-primary text-primary-foreground text-xs gap-1">
                <CheckCircle2 className="w-3 h-3" /> Check-in
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Tickets;
