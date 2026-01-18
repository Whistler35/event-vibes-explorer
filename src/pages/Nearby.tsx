import { useState } from "react";
import Layout from "@/components/Layout";
import InteractiveMap from "@/components/InteractiveMap";
import CreateEventDialog from "@/components/CreateEventDialog";
import { toast } from "sonner";

interface CreatedEvent {
  id: string;
  position: [number, number];
  title: string;
  description: string;
  date: string;
  time: string;
  image?: string;
}

const Nearby = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(null);
  const [createdEvents, setCreatedEvents] = useState<CreatedEvent[]>([]);

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
    // Create new event with unique ID
    const newEvent: CreatedEvent = {
      ...event,
      id: `event-${Date.now()}`
    };
    
    setCreatedEvents(prev => [...prev, newEvent]);
    
    console.log('Event created:', newEvent);
    toast.success('Event erstellt!', {
      description: event.title
    });
  };

  // Convert to map events format
  const mapEvents = createdEvents.map(e => ({
    id: e.id,
    title: e.title,
    position: e.position,
    image: e.image
  }));

  return (
    <Layout>
      <div className="relative h-[calc(100vh-80px)]">
        {/* Header */}
        <div className="absolute top-4 left-4 z-10">
          <span className="text-white text-2xl font-bold drop-shadow-lg">evendle</span>
        </div>

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