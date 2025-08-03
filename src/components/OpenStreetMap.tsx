import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import CreateEventDialog from './CreateEventDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface DatabaseEvent {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  latitude: number;
  longitude: number;
  image_url?: string;
  location_name: string;
  max_participants?: number;
  current_participants: number;
  created_by: string;
  created_at: string;
}

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
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const { toast } = useToast();

  // Load events from database
  const loadEvents = async () => {
    try {
      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading events:', error);
        toast({
          title: "Fehler",
          description: "Events konnten nicht geladen werden",
          variant: "destructive",
        });
        return;
      }

      // Convert database events to UserEvent format
      const userEventsFromDb: UserEvent[] = events?.map((event: DatabaseEvent) => ({
        id: event.id,
        title: event.title,
        description: event.description || '',
        date: new Date(event.event_date).toLocaleDateString('de-DE'),
        time: new Date(event.event_date).toLocaleTimeString('de-DE', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        position: [event.latitude, event.longitude] as [number, number],
        image: event.image_url,
        participants: [], // TODO: Implement participants system
        maxParticipants: event.max_participants
      })) || [];

      setUserEvents(userEventsFromDb);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  // Upload image to Supabase storage
  const uploadEventImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `events/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return null;
      }

      const { data } = supabase.storage
        .from('event-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  // Save event to database
  const saveEventToDatabase = async (eventData: {
    position: [number, number];
    title: string;
    description: string;
    date: string;
    time: string;
    image?: string;
  }) => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        toast({
          title: "Anmeldung erforderlich",
          description: "Du musst angemeldet sein, um Events zu erstellen",
          variant: "destructive",
        });
        return;
      }

      // Handle image upload if present
      let imageUrl = eventData.image;
      if (eventData.image && eventData.image.startsWith('data:')) {
        // Convert base64 to blob and upload
        const response = await fetch(eventData.image);
        const blob = await response.blob();
        const file = new File([blob], 'event-image.jpg', { type: 'image/jpeg' });
        imageUrl = await uploadEventImage(file);
      }

      // Combine date and time
      const eventDateTime = new Date(`${eventData.date}T${eventData.time}`);

      // Get location name from reverse geocoding
      let locationName = 'Unbekannter Ort';
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${eventData.position[0]}&lon=${eventData.position[1]}`
        );
        const locationData = await response.json();
        locationName = locationData.display_name?.split(',')[0] || locationName;
      } catch (error) {
        console.log('Could not get location name:', error);
      }

      const { data: newEvent, error } = await supabase
        .from('events')
        .insert({
          title: eventData.title,
          description: eventData.description,
          event_date: eventDateTime.toISOString(),
          latitude: eventData.position[0],
          longitude: eventData.position[1],
          image_url: imageUrl,
          location_name: locationName,
          max_participants: 10,
          current_participants: 0,
          created_by: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving event:', error);
        toast({
          title: "Fehler",
          description: "Event konnte nicht gespeichert werden",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Event erstellt!",
        description: "Dein Event wurde erfolgreich gespeichert",
      });

      // Reload events from database
      loadEvents();

    } catch (error) {
      console.error('Error saving event:', error);
      toast({
        title: "Fehler",
        description: "Event konnte nicht gespeichert werden",
        variant: "destructive",
      });
    }
  };

  // Load events on component mount
  useEffect(() => {
    loadEvents();
  }, []);

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

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userPos: [number, number] = [position.coords.latitude, position.coords.longitude];
          setUserLocation(userPos);
          console.log('User location found:', userPos);
        },
        (error) => {
          console.log('Geolocation error:', error.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    }
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
        console.log('Setting position to:', [lat, lng]);
        setSelectedPosition([lat, lng]);
        console.log('Setting dialog open to true');
        setDialogOpen(true);
        console.log('Dialog state should now be:', true);
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

  // Add event markers - always round image markers
  useEffect(() => {
    if (!map.current || userEvents.length === 0) return;

    const markers: L.Marker[] = [];

    userEvents.forEach((event) => {
      // Immer nur runde Bild-Marker
      const iconHtml = `
        <div class="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform">
          ${event.image ? 
            `<img src="${event.image}" class="w-full h-full object-cover" style="object-fit: cover; width: 100%; height: 100%;" />` :
            `<div class="w-full h-full bg-gradient-to-br from-evendle-orange/60 to-evendle-orange flex items-center justify-center">
              <div class="text-white text-lg">📅</div>
            </div>`
          }
        </div>
      `;

      const icon = L.divIcon({
        html: iconHtml,
        className: 'custom-event-marker',
        iconSize: [48, 48],
        iconAnchor: [24, 48]
      });

      const marker = L.marker(event.position, { icon })
        .addTo(map.current!)
        .bindPopup(`
          <div class="min-w-[250px] p-1">
            ${event.image ? `<img src="${event.image}" class="w-full h-24 object-cover rounded-lg mb-3" />` : ''}
            <h3 class="text-lg font-bold mb-2">${event.title}</h3>
            <div class="space-y-2">
              <p class="text-evendle-orange font-medium">${event.date} um ${event.time}</p>
              <p class="text-gray-700 text-sm leading-relaxed">${event.description}</p>
              <div class="flex items-center justify-between pt-2">
                <span class="text-gray-500 text-sm">${event.participants.length} dabei</span>
                <button 
                  onclick="joinEvent('${event.id}')" 
                  class="bg-evendle-orange text-white px-4 py-2 rounded-lg hover:bg-evendle-orange-hover transition-colors font-medium"
                >
                  Ich bin dabei! 🙋‍♂️
                </button>
              </div>
            </div>
          </div>
        `, {
          maxWidth: 280,
          className: 'event-popup'
        });

      markers.push(marker);
    });

    // Cleanup
    return () => {
      markers.forEach(marker => marker.remove());
    };
  }, [userEvents]);

  // Add user location marker
  useEffect(() => {
    if (!map.current || !userLocation) return;

    const userLocationIcon = L.divIcon({
      html: `
        <div class="w-5 h-5 bg-blue-500 rounded-full border-2 border-white shadow-lg relative">
          <div class="absolute inset-0 bg-blue-500/30 rounded-full animate-pulse scale-150"></div>
        </div>
      `,
      className: 'user-location-marker',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    const userMarker = L.marker(userLocation, { icon: userLocationIcon })
      .addTo(map.current)
      .bindPopup(`
        <div class="text-center">
          <h3 class="font-bold text-sm text-blue-600">📍 Mein Standort</h3>
          <p class="text-xs text-gray-600">Du bist hier</p>
        </div>
      `);

    return () => {
      userMarker.remove();
    };
  }, [userLocation]);

  // Search for places using Nominatim API
  const searchPlaces = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=de&addressdetails=1`
      );
      const results = await response.json();
      setSearchResults(results);
      setShowResults(true);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
  };

  // Handle search input change with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery) {
        searchPlaces(searchQuery);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Handle place selection
  const handlePlaceSelect = (place: any) => {
    const lat = parseFloat(place.lat);
    const lon = parseFloat(place.lon);
    
    if (map.current) {
      map.current.setView([lat, lon], 15);
    }
    
    setSearchQuery(place.display_name.split(',')[0]);
    setShowResults(false);
  };

  const handleCreateEvent = async (eventData: {
    position: [number, number];
    title: string;
    description: string;
    date: string;
    time: string;
    image?: string;
  }) => {
    // Save to database instead of local state
    await saveEventToDatabase(eventData);
    
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
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-white">Mein Standort</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg z-[1000]">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Suche nach Orten, Straßen, Sehenswürdigkeiten..."
            className="w-full p-3 pr-10 text-sm text-black border-none rounded-lg bg-transparent focus:outline-none focus:ring-2 focus:ring-evendle-orange/50 placeholder-gray-500"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        
        {/* Search Results */}
        {showResults && searchResults.length > 0 && (
          <div className="mt-2 max-h-40 overflow-y-auto bg-white rounded-lg border border-gray-200 shadow-lg">
            {searchResults.map((place, index) => (
              <div
                key={index}
                onClick={() => handlePlaceSelect(place)}
                className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <div className="font-medium text-sm text-gray-900">{place.display_name.split(',')[0]}</div>
                <div className="text-xs text-gray-500 mt-1">{place.display_name}</div>
              </div>
            ))}
          </div>
        )}
        
        {/* Hint text */}
        <div className="text-xs text-gray-500 text-center mt-2">
          Halte 1s gedrückt für Event • Suche nach Orten
        </div>
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