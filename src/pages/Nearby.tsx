import { useState, useCallback } from "react";
import Layout from "@/components/Layout";
import InteractiveMap from "@/components/InteractiveMap";
import CreateEventDialog from "@/components/CreateEventDialog";
import CategoryFilter from "@/components/CategoryFilter";
import { useSearchEvents, type EventCategory, type SearchEvent } from "@/hooks/useSearchEvents";
import { toast } from "sonner";

const Nearby = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | ''>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const { data: searchResult, isLoading } = useSearchEvents({
    category: selectedCategory || undefined,
    date_from: selectedDate ? selectedDate.toISOString().split('T')[0] : undefined,
    date_to: selectedDate ? selectedDate.toISOString().split('T')[0] : undefined,
    limit: 100,
  });

  const handleCreateEvent = (coordinates: [number, number]) => {
    setSelectedPosition(coordinates);
    setDialogOpen(true);
  };

  const handleEventCreate = (event: {
    position: [number, number];
    title: string;
    description: string;
    date: string;
    time: string;
    image?: string;
  }) => {
    toast.success('Event erstellt!', { description: event.title });
  };

  // Convert search results to map events format
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
        {/* Header */}
        <div className="absolute top-4 left-4 z-10">
          <span className="text-foreground text-2xl font-bold drop-shadow-lg">evendle</span>
        </div>

        {/* Category Filter */}
        <div className="absolute top-14 left-0 right-0 z-10 px-4">
          <CategoryFilter selected={selectedCategory} onChange={setSelectedCategory} selectedDate={selectedDate} onDateChange={setSelectedDate} />
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-10 bg-card/90 rounded-full px-3 py-1 text-xs text-foreground">
            Events laden...
          </div>
        )}

        {/* Interactive Map */}
        <div className="absolute top-0 bottom-0 left-0 right-0">
          <InteractiveMap onCreateEvent={handleCreateEvent} events={mapEvents} />
        </div>

        {/* Create Event Dialog */}
        <CreateEventDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          position={selectedPosition}
          onCreateEvent={handleEventCreate}
        />
      </div>
    </Layout>
  );
};

export default Nearby;
