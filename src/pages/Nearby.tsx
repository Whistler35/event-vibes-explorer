import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import InteractiveMap from "@/components/InteractiveMap";
import CreateEventDialog from "@/components/CreateEventDialog";
import CategoryFilter from "@/components/CategoryFilter";
import { useSearchEvents, type EventCategory, type SearchEvent } from "@/hooks/useSearchEvents";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Nearby = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | ''>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const { isAdmin } = useIsAdmin();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: searchResult, isLoading, refetch } = useSearchEvents({
    category: selectedCategory || undefined,
    date_from: selectedDate ? selectedDate.toISOString().split('T')[0] : undefined,
    date_to: selectedDate ? selectedDate.toISOString().split('T')[0] : undefined,
    limit: 100,
  });

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

  const mapEvents = (searchResult?.data || [])
    .filter((e: SearchEvent) => e.latitude != null && e.longitude != null)
    .map((e: SearchEvent) => ({
      id: e.id,
      title: e.title,
      position: [e.latitude!, e.longitude!] as [number, number],
      image: e.image_url || undefined,
      category: e.category || undefined,
    }));

  return (
    <Layout>
      <div className="relative h-[calc(100vh-80px)]">
        <div className="absolute top-4 left-4 z-10">
          <span className="text-foreground text-2xl font-bold drop-shadow-lg">evendle</span>
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
          <InteractiveMap onCreateEvent={handleCreateEvent} events={mapEvents} isAdmin={true} />
        </div>

        <CreateEventDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          position={selectedPosition}
          isAdmin={isAdmin}
          onEventCreated={() => refetch()}
        />
      </div>
    </Layout>
  );
};

export default Nearby;
