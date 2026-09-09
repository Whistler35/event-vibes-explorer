import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  REPORT_REASONS,
  submitReport,
  type ReportReason,
  type ReportContext,
} from "@/lib/moderation";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportedUserId: string;
  reportedUserName?: string;
  context?: ReportContext;
  reportedMessageId?: string;
  /** Called after a successful report (e.g. to also block the user). */
  onReported?: () => void;
}

export default function ReportDialog({
  open,
  onOpenChange,
  reportedUserId,
  reportedUserName,
  context = "profile",
  reportedMessageId,
  onReported,
}: ReportDialogProps) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setReason(null);
    setDetails("");
    setSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!reason) {
      toast.error("Bitte einen Grund auswählen");
      return;
    }
    setSubmitting(true);
    try {
      await submitReport({
        reportedUserId,
        reason,
        details,
        context,
        reportedMessageId,
      });
      toast.success("Danke – deine Meldung ist bei uns eingegangen.");
      onOpenChange(false);
      reset();
      onReported?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Meldung konnte nicht gesendet werden");
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {reportedUserName ? `${reportedUserName} melden` : "Melden"}
          </DialogTitle>
          <DialogDescription>
            Deine Meldung wird vertraulich behandelt und von uns geprüft. Verstöße
            entfernen wir und sperren die verantwortlichen Konten.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {REPORT_REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setReason(r.value)}
              className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition ${
                reason === r.value
                  ? "border-foreground bg-foreground/5 font-semibold"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <Textarea
          placeholder="Optional: Beschreibe kurz, was passiert ist"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
          maxLength={1000}
        />

        <DialogFooter className="mt-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !reason}>
            {submitting ? "Wird gesendet…" : "Meldung senden"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
