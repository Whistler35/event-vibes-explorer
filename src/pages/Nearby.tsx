import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import InteractiveMap, { type MapEvent } from "@/components/InteractiveMap";
import CreateEventDialog from "@/components/CreateEventDialog";
import CategoryFilter from "@/components/CategoryFilter";
import EventDetailSheet from "@/components/EventDetailSheet";
import { useSearchEvents, type EventCategory, type SearchEvent } from "@/hooks/useSearchEvents";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Globe, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Nearby = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | ''>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedEvent, setSelectedEvent] = useState<MapEvent | null>(null);
  const [isPrivateMode, setIsPrivateMode] = useState(false);
  const { isAdmin } = useIsAdmin();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Public events from search edge function
  const { data: searchResult, isLoading: isLoadingPublic, refetch: refetchPublic } = useSearchEvents({
    category: selectedCategory || undefined,
    date_from: selectedDate ? selectedDate.toISOString().split('T')[0] : undefined,
    date_to: selectedDate ? selectedDate.toISOString().split('T')[0] : undefined,
    limit: 100,
  }, !isPrivateMode);

  // Private events (user's own + friends' unlisted events)
  const { data: privateEvents, isLoading: isLoadingPrivate, refetch: refetchPrivate } = useQuery({
    queryKey: ['private-events', user?.id, selectedCategory, selectedDate],
    queryFn: async () => {
      if (!user) return [];

      // Get accepted friend IDs
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted');

      const friendIds = (friendships || []).map((f: any) =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );

      const allUserIds = [user.id, ...friendIds];

      let query = supabase
        .from('events')
        .select('*')
        .in('created_by', allUserIds)
        .eq('visibility', 'unlisted')
        .order('event_date', { ascending: true });

      if (selectedCategory) {
        query = query.eq('category', selectedCategory);
      }
      if (selectedDate) {
        const dateStr = selectedDate.toISOString().split('T')[0];
        query = query.gte('event_date', dateStr).lte('event_date', dateStr + 'T23:59:59');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: isPrivateMode && !!user,
    staleTime: 30_000,
  });

  const isLoading = isPrivateMode ? isLoadingPrivate : isLoadingPublic;

  const handleCreateEvent = (coordinates: [number, number]) => {
    if (!user) {
      toast.info('Bitte melde dich an, um Events zu erstellen.', {
        action: { label: 'Anmelden', onClick: () => navigate('/auth') },
      });
      return;
    }
    setSelectedPosition(coordinates);
    setDialogOpen(true);
  };

  const publicMapEvents: MapEvent[] = (searchResult?.data || [])
    .filter((e: SearchEvent) => e.latitude != null && e.longitude != null)
    .map((e: SearchEvent) => ({
      id: e.id,
      title: e.title,
      position: [e.latitude!, e.longitude!] as [number, number],
      image: e.image_url || undefined,
      category: e.category || undefined,
      description: e.description || undefined,
      event_date: e.event_date,
      location_name: e.location_name,
      max_participants: e.max_participants || undefined,
      current_participants: e.current_participants || undefined,
    }));

  const privateMapEvents: MapEvent[] = (privateEvents || [])
    .filter((e) => e.latitude != null && e.longitude != null)
    .map((e) => ({
      id: e.id,
      title: e.title,
      position: [e.latitude!, e.longitude!] as [number, number],
      image: e.image_url || undefined,
      category: e.category || undefined,
      description: e.description || undefined,
      event_date: e.event_date,
      location_name: e.location_name,
      max_participants: e.max_participants || undefined,
      current_participants: e.current_participants || undefined,
    }));

  const mapEvents = isPrivateMode ? privateMapEvents : publicMapEvents;

  const handleRefetch = () => {
    if (isPrivateMode) {
      refetchPrivate();
    } else {
      refetchPublic();
    }
  };

  return (
    <Layout>
      <div className="relative h-[calc(100vh-80px)]">
        <div className="absolute top-4 left-4 z-10">
          <span className="text-foreground text-2xl font-bold drop-shadow-lg">evendle</span>
        </div>

        {/* Public/Private Toggle */}
        <div className="absolute top-4 right-4 z-10">
          <div className="flex items-center gap-2 bg-card/90 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg border border-border">
            <Globe className={`h-4 w-4 transition-colors ${!isPrivateMode ? 'text-primary' : 'text-muted-foreground'}`} />
            <Switch
              checked={isPrivateMode}
              onCheckedChange={(checked) => {
                if (checked && !user) {
                  toast.info('Bitte melde dich an, um private Events zu sehen.', {
                    action: { label: 'Anmelden', onClick: () => navigate('/auth') },
                  });
                  return;
                }
                setIsPrivateMode(checked);
              }}
            />
            <Lock className={`h-4 w-4 transition-colors ${isPrivateMode ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
        </div>

        <div className="absolute top-14 left-0 right-0 z-10 px-4">
          <CategoryFilter selected={selectedCategory} onChange={setSelectedCategory} selectedDate={selectedDate} onDateChange={setSelectedDate} />
        </div>

        {isLoading && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-10 bg-card/90 rounded-full px-3 py-1 text-xs text-foreground">
            Events laden...
          </div>
        )}

        <div className="absolute top-0 bottom-0 left-0 right-0">
          <InteractiveMap
            onCreateEvent={handleCreateEvent}
            onEventClick={(event) => setSelectedEvent(event)}
            events={mapEvents}
            isAdmin={true}
          />
        </div>

        <CreateEventDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          position={selectedPosition}
          isAdmin={isAdmin}
          onEventCreated={() => handleRefetch()}
          defaultPrivate={isPrivateMode}
        />

        <EventDetailSheet
          event={selectedEvent}
          open={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      </div>
    </Layout>
  );
};

export default Nearby;
