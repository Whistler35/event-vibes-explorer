import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import CreateEventDialog from './CreateEventDialog';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface UserEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  position: [number, number];
  image?: string;
  participants: string[]; // User IDs who joined
  maxParticipants?: number;
}

interface Place {
  id: string;
  name: string;
  type: string;
  position: [number, number];
}

interface OpenStreetMapProps {
  center?: [number, number];
  zoom?: number;
  height?: string;
  onCreateEvent?: (position: [number, number]) => void;
}

const OpenStreetMap: React.FC<OpenStreetMapProps> = ({
  center = [52.520008, 13.404954], // Berlin
  zoom = 13,
  height = "100vh",
  onCreateEvent
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [userEvents, setUserEvents] = useState<UserEvent[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  // Make joinEvent function globally available for popup buttons
  useEffect(() => {
    (window as any).joinEvent = (eventId: string) => {
      setUserEvents(prev => prev.map(event => {
        if (event.id === eventId) {
          const currentUserId = 'user-' + Date.now(); // Simulate current user ID
          if (!event.participants.includes(currentUserId)) {
            return {
              ...event,
              participants: [...event.participants, currentUserId]
            };
          }
        }
        return event;
      }));
      
      // Close any open popups and reopen to show updated participant count
      if (map.current) {
        map.current.closePopup();
      }
    };

    return () => {
      delete (window as any).joinEvent;
    };
  }, []);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    map.current = L.map(mapContainer.current).setView(center, zoom);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map.current);

    // Add long press handlers for creating events - using proper Leaflet events
    let pressTimer: NodeJS.Timeout | null = null;
    let isLongPress = false;

    // Debug: Test if events are being registered
    console.log('Setting up map event listeners...');

    map.current.on('mousedown', (e: any) => {
      console.log('Mouse down detected');
      isLongPress = false;
      pressTimer = setTimeout(() => {
        console.log('Long press triggered!');
        isLongPress = true;
        const { lat, lng } = e.latlng;
        setSelectedPosition([lat, lng]);
        setDialogOpen(true);
      }, 1000);
    });

    map.current.on('mouseup', () => {
      console.log('Mouse up detected');
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    });

    map.current.on('mousemove', () => {
      if (pressTimer) {
        console.log('Mouse moved - canceling long press');
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    });

    // Also handle touch events for mobile
    map.current.on('touchstart', (e: any) => {
      console.log('Touch start detected');
      isLongPress = false;
      pressTimer = setTimeout(() => {
        console.log('Long press triggered via touch!');
        isLongPress = true;
        const { lat, lng } = e.latlng;
        setSelectedPosition([lat, lng]);
        setDialogOpen(true);
      }, 1000);
    });

    map.current.on('touchend touchcancel', () => {
      console.log('Touch ended');
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
    });

    // Removed automatic place fetching - user requested to remove orange points
    // fetchPlaces();

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [center, zoom, onCreateEvent]);

  // Removed markers for places - user requested to remove orange points
  // useEffect(() => {
  //   if (!map.current || places.length === 0) return;
  //   ...
  // }, [places]);

  // Add markers for user events
  useEffect(() => {
    if (!map.current || userEvents.length === 0) return;

    userEvents.forEach((event) => {
      const icon = L.divIcon({
        html: `
          <div class="flex items-center justify-center w-12 h-12 bg-blue-500 rounded-full border-2 border-white shadow-lg">
            ${event.image ? 
              `<img src="${event.image}" class="w-10 h-10 rounded-full object-cover" />` :
              `<div class="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
              </div>`
            }
          </div>
        `,
        className: 'custom-event-marker',
        iconSize: [48, 48],
        iconAnchor: [24, 48]
      });

      const marker = L.marker(event.position, { icon })
        .addTo(map.current!)
        .bindPopup(`
          <div class="text-center min-w-[220px] p-2">
            ${event.image ? `<img src="${event.image}" class="w-full h-20 object-cover rounded mb-2" />` : ''}
            <h3 class="font-bold text-sm mb-1">${event.title}</h3>
            <p class="text-xs text-gray-600 mb-2">${event.description}</p>
            <p class="text-xs text-blue-600 mb-2">${event.date} um ${event.time}</p>
            <p class="text-xs text-gray-500 mb-2">${event.participants.length}/${event.maxParticipants || 'unbegrenzt'} Teilnehmer</p>
            <button 
              onclick="joinEvent('${event.id}')" 
              class="bg-evendle-orange text-white px-3 py-1 rounded text-xs hover:bg-orange-600 transition-colors"
            >
              Ich bin dabei! 🙋‍♂️
            </button>
          </div>
        `);
    });
  }, [userEvents]);

  const handleCreateEvent = (eventData: {
    position: [number, number];
    title: string;
    description: string;
    date: string;
    time: string;
    image?: string;
  }) => {
    const newEvent: UserEvent = {
      id: Date.now().toString(),
      participants: [], // Initialize empty participants
      maxParticipants: 10, // Default max participants
      ...eventData
    };
    
    setUserEvents(prev => [...prev, newEvent]);
    
    if (onCreateEvent) {
      onCreateEvent(eventData.position);
    }
  };

  return (
    <div className="relative w-full" style={{ height }}>
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
      
      {/* Legend - updated without orange points */}
      <div className="absolute top-4 right-4 bg-gray-500/90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-[1000]">
        <h4 className="font-bold text-sm mb-2 text-white">Hold to create evendle</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-white">User Events</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-[1000]">
        <p className="text-sm text-center">
          Halte 1 Sekunde gedrückt, um ein Evendle zu erstellen
        </p>
      </div>

      {/* Create Event Dialog */}
      <CreateEventDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        position={selectedPosition}
        onCreateEvent={handleCreateEvent}
      />
    </div>
  );
};

export default OpenStreetMap;