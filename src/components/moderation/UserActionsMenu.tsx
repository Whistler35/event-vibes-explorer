import { useEffect, useState } from "react";
import { MoreVertical, Flag, Ban, ShieldOff } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { toast } from "sonner";
import ReportDialog from "./ReportDialog";
import { blockUser, unblockUser, hasBlocked, type ReportContext } from "@/lib/moderation";

interface UserActionsMenuProps {
  targetUserId: string;
  targetUserName?: string;
  context?: ReportContext;
  /** The specific post/message/comment being reported, if any. */
  reportedMessageId?: string;
  /** Optional: called after block/unblock so the parent can refresh. */
  onBlockChange?: (blocked: boolean) => void;
  /** Visual variant for the trigger button. */
  className?: string;
}

export default function UserActionsMenu({
  targetUserId,
  targetUserName,
  context = "profile",
  reportedMessageId,
  onBlockChange,
  className,
}: UserActionsMenuProps) {
  const [blocked, setBlocked] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    hasBlocked(targetUserId).then((b) => alive && setBlocked(b));
    return () => {
      alive = false;
    };
  }, [targetUserId]);

  const doBlock = async () => {
    setBusy(true);
    try {
      await blockUser(targetUserId);
      setBlocked(true);
      onBlockChange?.(true);
      toast.success(
        targetUserName ? `${targetUserName} blockiert` : "Nutzer blockiert"
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Blockieren fehlgeschlagen");
    } finally {
      setBusy(false);
      setConfirmBlockOpen(false);
    }
  };

  const doUnblock = async () => {
    setBusy(true);
    try {
      await unblockUser(targetUserId);
      setBlocked(false);
      onBlockChange?.(false);
      toast.success("Blockierung aufgehoben");
    } catch (e: any) {
      toast.error(e?.message ?? "Aufheben fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={
            className ??
            "w-10 h-10 rounded-full bg-white/80 flex items-center justify-center shadow-sm"
          }
          aria-label="Weitere Aktionen"
        >
          <MoreVertical className="w-5 h-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => setReportOpen(true)}>
            <Flag className="w-4 h-4 mr-2" />
            Melden
          </DropdownMenuItem>
          {blocked ? (
            <DropdownMenuItem onClick={doUnblock} disabled={busy}>
              <ShieldOff className="w-4 h-4 mr-2" />
              Blockierung aufheben
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => setConfirmBlockOpen(true)}
              disabled={busy}
              className="text-destructive focus:text-destructive"
            >
              <Ban className="w-4 h-4 mr-2" />
              Blockieren
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmBlockOpen} onOpenChange={setConfirmBlockOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {targetUserName ? `${targetUserName} blockieren?` : "Nutzer blockieren?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ihr könnt einander dann keine Nachrichten mehr schicken und werdet
              euch gegenseitig nicht mehr in der App angezeigt. Du kannst die
              Blockierung jederzeit wieder aufheben.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                doBlock();
              }}
              disabled={busy}
            >
              Blockieren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        reportedUserId={targetUserId}
        reportedUserName={targetUserName}
        context={context}
        reportedMessageId={reportedMessageId}
      />
    </>
  );
}
