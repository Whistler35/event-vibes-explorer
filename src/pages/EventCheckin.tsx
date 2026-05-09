import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Scanner } from "@yudiel/react-qr-scanner";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ScanLine, CheckCircle2, XCircle, Users, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface ScanResult {
  status: "success" | "already" | "invalid" | "wrong_event";
  ticketCode?: string;
  participantName?: string;
  checkedInAt?: string;
}

const EventCheckin = () => {
  const { id: eventId } = useParams();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const [eventTitle, setEventTitle] = useState("");
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(true);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [stats, setStats] = useState({ total: 0, checkedIn: 0 });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user || !eventId) return;
    (async () => {
      const { data: ev } = await supabase.from("events").select("title, created_by").eq("id", eventId).maybeSingle();
      if (!ev) { setAllowed(false); return; }
      setEventTitle(ev.title);
      setAllowed(ev.created_by === user.id || isAdmin);
      refreshStats();
    })();
  }, [user, eventId, isAdmin]);

  const refreshStats = async () => {
    const { data } = await supabase.from("event_tickets").select("checked_in_at").eq("event_id", eventId!);
    if (data) setStats({ total: data.length, checkedIn: data.filter(t => t.checked_in_at).length });
  };

  const handleScan = async (token: string) => {
    if (processing) return;
    setProcessing(true);
    setScanning(false);
    try {
      const { data: ticket } = await supabase
        .from("event_tickets")
        .select("id, event_id, ticket_code, checked_in_at, user_id")
        .eq("qr_token", token)
        .maybeSingle();

      if (!ticket) {
        setLastResult({ status: "invalid" });
        toast.error(t("eventCheckin.toastInvalid"));
        return;
      }
      if (ticket.event_id !== eventId) {
        setLastResult({ status: "wrong_event" });
        toast.error(t("eventCheckin.toastWrongEvent"));
        return;
      }

      const { data: profile } = await supabase
        .from("profiles").select("name").eq("user_id", ticket.user_id).maybeSingle();

      if (ticket.checked_in_at) {
        setLastResult({
          status: "already",
          ticketCode: ticket.ticket_code,
          participantName: profile?.name,
          checkedInAt: ticket.checked_in_at,
        });
        toast.warning(t("eventCheckin.toastAlready", { name: profile?.name || ticket.ticket_code }));
        return;
      }

      const { error } = await supabase
        .from("event_tickets")
        .update({ checked_in_at: new Date().toISOString(), checked_in_by: user!.id })
        .eq("id", ticket.id);

      if (error) throw error;

      setLastResult({
        status: "success",
        ticketCode: ticket.ticket_code,
        participantName: profile?.name,
      });
      toast.success(t("eventCheckin.toastSuccess", { name: profile?.name || ticket.ticket_code }));
      refreshStats();
    } catch (e: any) {
      toast.error(e.message || t("eventCheckin.toastError"));
    } finally {
      setProcessing(false);
    }
  };

  if (allowed === false) {
    return (
      <Layout>
        <div className="p-6 text-center space-y-4">
          <p>{t("eventCheckin.noPermission")}</p>
          <Button onClick={() => navigate(-1)}>{t("eventCheckin.back")}</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 space-y-4 max-w-xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/event/${eventId}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <ScanLine className="w-5 h-5 text-primary" /> {t("eventCheckin.title")}
            </h1>
            <p className="text-sm text-muted-foreground truncate">{eventTitle}</p>
          </div>
          <Badge variant="outline" className="gap-1">
            <Users className="w-3 h-3" /> {stats.checkedIn}/{stats.total}
          </Badge>
        </div>

        {scanning ? (
          <Card className="overflow-hidden">
            <div className="aspect-square bg-black">
              <Scanner
                onScan={(codes) => codes[0]?.rawValue && handleScan(codes[0].rawValue)}
                onError={(e) => console.error(e)}
                constraints={{ facingMode: "environment" }}
                styles={{ container: { width: "100%", height: "100%" } }}
              />
            </div>
            <CardContent className="p-3 text-center text-sm text-muted-foreground">
              {t("eventCheckin.scanHint")}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 space-y-4 text-center">
              {lastResult?.status === "success" && (
                <>
                  <CheckCircle2 className="w-16 h-16 mx-auto text-primary" />
                  <div>
                    <h3 className="font-bold text-xl">{t("eventCheckin.checkedIn")}</h3>
                    <p className="text-muted-foreground">{lastResult.participantName}</p>
                    <Badge variant="outline" className="font-mono mt-2">{lastResult.ticketCode}</Badge>
                  </div>
                </>
              )}
              {lastResult?.status === "already" && (
                <>
                  <CheckCircle2 className="w-16 h-16 mx-auto text-amber-500" />
                  <div>
                    <h3 className="font-bold text-xl">Schon eingecheckt</h3>
                    <p className="text-muted-foreground">{lastResult.participantName}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {lastResult.checkedInAt && new Date(lastResult.checkedInAt).toLocaleString("de-DE")}
                    </p>
                  </div>
                </>
              )}
              {(lastResult?.status === "invalid" || lastResult?.status === "wrong_event") && (
                <>
                  <XCircle className="w-16 h-16 mx-auto text-destructive" />
                  <div>
                    <h3 className="font-bold text-xl">
                      {lastResult.status === "invalid" ? "Ungültiges Ticket" : "Falsches Event"}
                    </h3>
                  </div>
                </>
              )}
              <Button onClick={() => { setLastResult(null); setScanning(true); }} className="w-full gap-2">
                <RotateCcw className="w-4 h-4" /> Nächsten Code scannen
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default EventCheckin;
