import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users } from "lucide-react";

interface TaggedPerson {
  user_id: string;
  name: string;
  avatar_url: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  people: TaggedPerson[];
}

const TaggedPeopleSheet = ({ open, onOpenChange, people }: Props) => {
  const navigate = useNavigate();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[70vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-1.5">
            <Users className="w-4 h-4" /> Markierte Personen
          </SheetTitle>
        </SheetHeader>
        <div className="py-3 space-y-1">
          {people.map((p) => (
            <button
              key={p.user_id}
              onClick={() => {
                onOpenChange(false);
                navigate(`/user/${p.user_id}`);
              }}
              className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-muted transition text-left"
            >
              <Avatar className="w-10 h-10">
                <AvatarImage src={p.avatar_url ?? undefined} />
                <AvatarFallback className="bg-[hsl(var(--blitz-forest))] text-white text-xs font-black">
                  {p.name?.[0] ?? "?"}
                </AvatarFallback>
              </Avatar>
              <p className="font-semibold text-sm">{p.name}</p>
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TaggedPeopleSheet;
