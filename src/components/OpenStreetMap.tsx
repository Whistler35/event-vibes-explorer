import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

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

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    map.current = L.map(mapContainer.current).setView(center, zoom);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map.current);

    // Add click handler for creating events
    if (onCreateEvent) {
      map.current.on('click', (e) => {
        const { lat, lng } = e.latlng;
        onCreateEvent([lat, lng]);
      });
    }

    // Fetch places from Overpass API (OpenStreetMap data)
    const fetchPlaces = async () => {
      try {
        const [lat, lng] = center;
        const bbox = `${lat - 0.01},${lng - 0.01},${lat + 0.01},${lng + 0.01}`;
        
        const query = `
          [out:json];
          (
            node["amenity"~"restaurant|cafe|bar|pub|fast_food"]["name"](${bbox});
            node["shop"~"convenience|supermarket|bakery"]["name"](${bbox});
          );
          out;
        `;

        const response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: query,
          headers: {
            'Content-Type': 'text/plain'
          }
        });

        const data = await response.json();
        
        const fetchedPlaces: Place[] = data.elements.map((element: any) => ({
          id: element.id.toString(),
          name: element.tags.name || 'Unbekannt',
          type: element.tags.amenity || element.tags.shop || 'place',
          position: [element.lat, element.lon]
        }));

        setPlaces(fetchedPlaces);
      } catch (error) {
        console.error('Error fetching places:', error);
        // Fallback places for Berlin
        setPlaces([
          { id: '1', name: 'Café Einstein', type: 'cafe', position: [52.5075, 13.3903] },
          { id: '2', name: 'Restaurant Maximilians', type: 'restaurant', position: [52.5142, 13.4067] },
          { id: '3', name: 'Prater Garten', type: 'bar', position: [52.5403, 13.4102] },
          { id: '4', name: 'Mustafa\'s Gemüse Kebap', type: 'fast_food', position: [52.4936, 13.3890] },
          { id: '5', name: 'Hackescher Hof', type: 'restaurant', position: [52.5225, 13.4015] },
        ]);
      }
    };

    fetchPlaces();

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [center, zoom, onCreateEvent]);

  // Add markers for places
  useEffect(() => {
    if (!map.current || places.length === 0) return;

    places.forEach((place) => {
      const icon = L.divIcon({
        html: `
          <div class="flex items-center justify-center w-8 h-8 bg-evendle-orange rounded-full border-2 border-white shadow-lg">
            <div class="w-2 h-2 bg-white rounded-full"></div>
          </div>
        `,
        className: 'custom-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 32]
      });

      const marker = L.marker(place.position, { icon })
        .addTo(map.current!)
        .bindPopup(`
          <div class="text-center">
            <h3 class="font-bold text-sm">${place.name}</h3>
            <p class="text-xs text-gray-600">${place.type}</p>
          </div>
        `);
    });
  }, [places]);

  return (
    <div className="relative w-full" style={{ height }}>
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
      
      {/* Legend */}
      <div className="absolute top-4 right-4 bg-gray-500/90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-[1000]">
        <h4 className="font-bold text-sm mb-2 text-white">Hold to create evendle</h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-evendle-orange rounded-full"></div>
            <span className="text-white">Restaurants & Cafés</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg z-[1000]">
        <p className="text-sm text-center">
          Tippe auf die Karte, um ein Event zu erstellen
        </p>
      </div>
    </div>
  );
};

export default OpenStreetMap;