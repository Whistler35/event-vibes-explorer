import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { Ticket as TicketIcon } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  eventId: string;
  userId: string;
  eventTitle: string;
}

const QuickTicketSheet = ({ open, onClose, eventId, userId, eventTitle }: Props) => {
  const [ticket, setTicket] = useState<{ qr_token: string; ticket_code: string; checked_in_at: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from('event_tickets')
      .select('qr_token, ticket_code, checked_in_at')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        setTicket(data);
        setLoading(false);
      });
  }, [open, eventId, userId]);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <TicketIcon className="w-5 h-5" />
            Dein Ticket
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-col items-center py-6 space-y-4">
          {loading ? (
            <div className="text-muted-foreground">Lade Ticket...</div>
          ) : ticket ? (
            <>
              <p className="text-center text-sm text-muted-foreground px-4">{eventTitle}</p>
              <div className="bg-white p-4 rounded-2xl border-2 border-primary">
                <QRCodeSVG value={ticket.qr_token} size={220} level="H" />
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Ticket-Code</p>
                <p className="font-mono font-bold text-lg tracking-wider">{ticket.ticket_code}</p>
              </div>
              {ticket.checked_in_at && (
                <div className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-bold">
                  ✓ Bereits eingecheckt
                </div>
              )}
              <p className="text-xs text-center text-muted-foreground px-6">
                Zeige diesen QR-Code beim Veranstalter zum Check-in
              </p>
            </>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              Kein Ticket gefunden
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default QuickTicketSheet;
