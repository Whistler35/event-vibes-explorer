import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useNavigate } from 'react-router-dom';

interface MapEvent {
  id: number;
  title: string;
  image: string;
  date: string;
  time: string;
  description: string;
  coordinates: [number, number]; // [longitude, latitude]
}

interface InteractiveMapProps {
  onCreateEvent?: (coordinates: [number, number]) => void;
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({ onCreateEvent }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapboxToken, setMapboxToken] = useState('');
  const navigate = useNavigate();

  // Sample events with Berlin coordinates
  const events: MapEvent[] = [
    {
      id: 1,
      title: "NAMASTE FOR ALL - YOGA-KURS",
      image: "/lovable-uploads/f4be3766-dd26-4f5d-b31a-0fc8dc6465d1.png",
      date: "23.07.2025",
      time: "8 pm",
      description: "Party Closing : Last dance event",
      coordinates: [13.4629, 52.5080] // Berlin coordinates
    },
    {
      id: 2,
      title: "CLOSING - VIERNES 27 JUNIO",
      image: "/lovable-uploads/a0af2c47-46da-41a8-8282-d3ba5998ab1a.png",
      date: "23.07.2025", 
      time: "8 pm",
      description: "Party Closing : Last dance event",
      coordinates: [13.4729, 52.5180]
    },
    {
      id: 3,
      title: "SUMMER FESTIVAL - ELECTRONIC",
      image: "/lovable-uploads/cd408aae-af95-4d17-a1f0-20dae1b117d4.png",
      date: "23.07.2025",
      time: "8 pm", 
      description: "Party Closing : Last dance event",
      coordinates: [13.4329, 52.4980]
    }
  ];

  useEffect(() => {
    if (!mapContainer.current) return;

    // For development, you can use a demo token or ask user to input their token
    const demoToken = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';
    
    if (!mapboxToken) {
      setMapboxToken(demoToken);
      return;
    }

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [13.4050, 52.5200], // Berlin center
      zoom: 12,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add event markers
    events.forEach((event) => {
      // Create a custom marker element
      const markerElement = document.createElement('div');
      markerElement.className = 'custom-marker';
      markerElement.style.width = '80px';
      markerElement.style.height = '64px';
      markerElement.style.borderRadius = '12px';
      markerElement.style.overflow = 'hidden';
      markerElement.style.cursor = 'pointer';
      markerElement.style.border = '2px solid #FF5722';
      markerElement.style.backgroundColor = '#1a1a1a';
      markerElement.style.padding = '4px';

      // Create marker content
      markerElement.innerHTML = `
        <img 
          src="${event.image}" 
          alt="${event.title}"
          style="width: 100%; height: 40px; object-fit: cover; border-radius: 8px;"
        />
        <div style="padding: 4px 2px;">
          <div style="color: white; font-size: 10px; font-weight: bold;">${event.date} ${event.time}</div>
          <div style="color: #888; font-size: 9px; line-height: 1.1;">${event.description}</div>
        </div>
      `;

      // Add click handler for marker
      markerElement.addEventListener('click', () => {
        navigate(`/event/${event.id}`);
      });

      // Add marker to map
      new mapboxgl.Marker(markerElement)
        .setLngLat(event.coordinates)
        .addTo(map.current!);
    });

    // Add long press event for creating new events
    let pressTimer: NodeJS.Timeout;
    
    map.current.on('mousedown', (e) => {
      pressTimer = setTimeout(() => {
        if (onCreateEvent) {
          onCreateEvent([e.lngLat.lng, e.lngLat.lat]);
        }
      }, 1000); // 1 second press
    });

    map.current.on('mouseup', () => {
      if (pressTimer) clearTimeout(pressTimer);
    });

    map.current.on('mousemove', () => {
      if (pressTimer) clearTimeout(pressTimer);
    });

    // Cleanup
    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, navigate, onCreateEvent]);

  // Token input for development
  if (!mapboxToken) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background p-6">
        <div className="text-center space-y-4 max-w-md">
          <h3 className="text-white text-lg font-bold">Mapbox Token benötigt</h3>
          <p className="text-evendle-light-gray text-sm">
            Um die Karte zu verwenden, geben Sie Ihren Mapbox Public Token ein:
          </p>
          <input
            type="text"
            placeholder="pk.eyJ1IjoiZXhhbXBsZSIsImEiOiJjbGIwNDMwOTkwMDAzM..."
            className="w-full p-3 rounded-lg bg-evendle-search-bg text-white placeholder-evendle-gray focus:outline-none focus:ring-2 focus:ring-evendle-orange"
            onChange={(e) => setMapboxToken(e.target.value)}
          />
          <p className="text-evendle-gray text-xs">
            Holen Sie sich Ihren Token von{' '}
            <a 
              href="https://mapbox.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-evendle-orange underline"
            >
              mapbox.com
            </a>
          </p>
          <button
            onClick={() => setMapboxToken('pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw')}
            className="bg-evendle-orange hover:bg-evendle-orange-hover text-white px-4 py-2 rounded-lg text-sm"
          >
            Demo Token verwenden
          </button>
        </div>
      </div>
    );
  }

  return <div ref={mapContainer} className="w-full h-full rounded-lg" />;
};

export default InteractiveMap;