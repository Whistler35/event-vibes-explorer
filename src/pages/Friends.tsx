import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { useFriends } from "@/hooks/useFriends";
import { useFriendGroups } from "@/hooks/useFriendGroups";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FriendSearch from "@/components/FriendSearch";
import { UserPlus, Users, Plus, ChevronRight, Trash2, Check } from "lucide-react";
import { toast } from "sonner";

const avatarFor = (name: string, url: string | null) =>
  url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=C8F14F&color=1E3323&size=100`;

const Friends = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: friends = [] } = useFriends(user?.id);
  const { groups, createGroup, deleteGroup, setGroupMembers } = useFriendGroups(user?.id);

  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [managingGroupId, setManagingGroupId] = useState<string | null>(null);

  const managingGroup = groups.find((g) => g.id === managingGroupId);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      await createGroup(newGroupName);
      setNewGroupName("");
      setShowNewGroup(false);
    } catch (e: any) {
      toast.error(e.message || "Gruppe konnte nicht erstellt werden");
    }
  };

  const toggleMember = async (friendId: string) => {
    if (!managingGroup) return;
    const has = managingGroup.memberIds.includes(friendId);
    const next = has
      ? managingGroup.memberIds.filter((id) => id !== friendId)
      : [...managingGroup.memberIds, friendId];
    try {
      await setGroupMembers(managingGroup.id, next);
    } catch (e: any) {
      toast.error(e.message || "Fehler");
    }
  };

  if (!user) return null;

  return (
    <Layout>
      <div className="min-h-screen bg-[hsl(var(--blitz-forest))] text-white">
        <div className="max-w-md mx-auto p-5 space-y-7 pb-10">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black">Friends</h1>
            <button
              onClick={() => setShowAddFriend(true)}
              className="w-10 h-10 rounded-full bg-[hsl(var(--bolt))] flex items-center justify-center shadow-[0_8px_20px_-8px_hsl(var(--bolt)/0.6)]"
              aria-label="Freund hinzufügen"
            >
              <UserPlus className="w-5 h-5 text-[hsl(var(--blitz-forest))]" />
            </button>
          </div>

          {/* Groups */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-white/55">Gruppen</h2>
              <button
                onClick={() => setShowNewGroup(true)}
                className="text-[hsl(var(--bolt))] text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Neu
              </button>
            </div>
            {groups.length === 0 ? (
              <p className="text-white/50 text-sm">
                Noch keine Gruppen. Fass Freunde zusammen, um sie beim Blitz-Erstellen unter „Ausgewählte" schneller
                auszuwählen.
              </p>
            ) : (
              <div className="space-y-2">
                {groups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setManagingGroupId(g.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4 text-[hsl(var(--bolt))]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{g.name}</p>
                      <p className="text-white/50 text-xs">{g.memberIds.length} Mitglieder</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/40" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Friends list */}
          <div className="space-y-3">
            <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-white/55">
              Deine Freunde ({friends.length})
            </h2>
            {friends.length === 0 ? (
              <p className="text-white/50 text-sm">Noch keine Freunde. Tipp oben rechts, um welche zu finden.</p>
            ) : (
              <div className="space-y-1.5">
                {friends.map((f) => (
                  <button
                    key={f.user_id}
                    onClick={() => navigate(`/user/${f.user_id}`)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-white/5 transition text-left"
                  >
                    <img
                      src={avatarFor(f.name, f.avatar_url)}
                      alt={f.name}
                      loading="lazy"
                      className="w-11 h-11 rounded-full object-cover"
                    />
                    <span className="font-semibold text-sm">{f.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add friend sheet */}
      <Sheet open={showAddFriend} onOpenChange={setShowAddFriend}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Freunde finden</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <FriendSearch />
          </div>
        </SheetContent>
      </Sheet>

      {/* New group sheet */}
      <Sheet open={showNewGroup} onOpenChange={setShowNewGroup}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Neue Gruppe</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3 pb-4">
            <Input
              autoFocus
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="z.B. Beachvolleyball-Crew"
              maxLength={40}
            />
            <Button className="w-full" onClick={handleCreateGroup} disabled={!newGroupName.trim()}>
              Erstellen
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Manage group sheet */}
      <Sheet open={!!managingGroupId} onOpenChange={(o) => !o && setManagingGroupId(null)}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{managingGroup?.name}</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4 pb-4">
            <p className="text-muted-foreground text-xs">Wer soll in dieser Gruppe sein?</p>
            {friends.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">
                Du hast noch keine Freunde, die du hinzufügen könntest.
              </p>
            ) : (
              <div className="space-y-1">
                {friends.map((f) => {
                  const selected = managingGroup?.memberIds.includes(f.user_id) ?? false;
                  return (
                    <button
                      key={f.user_id}
                      onClick={() => toggleMember(f.user_id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-2xl transition text-left ${
                        selected ? "bg-[hsl(var(--bolt))]/15" : "hover:bg-muted"
                      }`}
                    >
                      <img
                        src={avatarFor(f.name, f.avatar_url)}
                        alt={f.name}
                        loading="lazy"
                        className="w-9 h-9 rounded-full object-cover"
                      />
                      <span className="flex-1 text-sm font-semibold">{f.name}</span>
                      {selected && (
                        <span className="w-5 h-5 rounded-full bg-[hsl(var(--bolt))] flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-[hsl(var(--blitz-forest))]" strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            <Button
              variant="outline"
              className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={async () => {
                if (!managingGroupId) return;
                if (!confirm("Gruppe wirklich löschen?")) return;
                await deleteGroup(managingGroupId);
                setManagingGroupId(null);
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Gruppe löschen
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </Layout>
  );
};

export default Friends;
