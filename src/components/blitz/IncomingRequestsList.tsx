import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, X, Zap } from "lucide-react";
import {
  IncomingBlitzRequest,
  useIncomingBlitzRequests,
  acceptBlitzRequest,
  rejectBlitzRequest,
} from "@/hooks/useBlitzMatching";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Props {
  blitzRequestId: string;
}

const IncomingRequestsList = ({ blitzRequestId }: Props) => {
  const { items, reload } = useIncomingBlitzRequests(blitzRequestId);
  const navigate = useNavigate();

  if (items.length === 0) return null;

  const handleAccept = async (item: IncomingBlitzRequest) => {
    try {
      const match = await acceptBlitzRequest(item);
      toast("⚡ MATCH!", { description: `Opening chat with ${item.swiper_name ?? "match"}…` });
      reload();
      navigate(`/blitz/match/${match.id}`);
    } catch (e: any) {
      toast.error(e.message || "Error");
    }
  };

  const handleReject = async (item: IncomingBlitzRequest) => {
    try {
      await rejectBlitzRequest(item.swipe_id);
      reload();
    } catch (e: any) {
      toast.error(e.message || "Error");
    }
  };

  return (
    <div className="rounded-2xl bg-white border-2 border-[hsl(var(--blitz-pink))] p-4 space-y-3 shadow-[0_0_30px_hsl(var(--blitz-pink)/0.25)]">
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-[hsl(var(--blitz-pink))] fill-[hsl(var(--blitz-pink))]" />
        <p className="font-black uppercase text-sm tracking-wider">
          {items.length} {items.length === 1 ? "Request" : "Requests"}
        </p>
      </div>
      <div className="space-y-2">
        {items.map((it) => (
          <div
            key={it.swipe_id}
            className="flex items-center gap-3 p-3 rounded-xl bg-muted/40"
          >
            <Avatar className="w-12 h-12">
              <AvatarImage src={it.swiper_avatar ?? undefined} />
              <AvatarFallback className="bg-[hsl(var(--blitz-forest))] text-white font-bold">
                {it.swiper_name?.[0] ?? "?"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-bold leading-tight truncate">{it.swiper_name ?? "Anonymous"}</p>
              {it.swiper_bio && (
                <p className="text-xs text-muted-foreground line-clamp-1">{it.swiper_bio}</p>
              )}
            </div>
            <button
              onClick={() => handleReject(it)}
              className="w-9 h-9 rounded-full bg-white border border-muted flex items-center justify-center"
              aria-label="Reject"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
            <button
              onClick={() => handleAccept(it)}
              className="w-9 h-9 rounded-full bg-[hsl(var(--blitz-pink))] flex items-center justify-center shadow-[0_0_15px_hsl(var(--blitz-pink)/0.5)]"
              aria-label="Accept"
            >
              <Check className="w-4 h-4 text-white" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default IncomingRequestsList;
