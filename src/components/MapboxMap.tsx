import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapEvent {
  id: number;
  title: string;
  position: [number, number]; // [lat, lng]
  category: string;
}

interface MapboxMapProps {
  center?: [number, number];
  zoom?: number;
  height?: string;
  events?: MapEvent[];
  onCreateEvent?: (position: [number, number]) => void;
  showControls?: boolean;
}

const MapboxMap: React.FC<MapboxMapProps> = ({
  center = [52.520008, 13.404954], // Berlin default
  zoom = 13,
  height = "500px",
  events = [],
  onCreateEvent,
  showControls = true
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sample events for Berlin
  const defaultEvents: MapEvent[] = [
    {
      id: 1,
      title: "NAMASTE FOR ALL - YOGA-KURS",
      position: [52.515, 13.405],
      category: "Outdoor"
    },
    {
      id: 2,
      title: "CLOSING PARTY",
      position: [52.525, 13.395],
      category: "Party"
    },
    {
      id: 3,
      title: "SUMMER BEATS",
      position: [52.510, 13.415],
      category: "Music"
    }
  ];

  const allEvents = events.length > 0 ? events : defaultEvents;

  useEffect(() => {
    const initMap = async () => {
      try {
        // Fetch Mapbox token from Supabase Edge Function
        const response = await fetch('/functions/v1/mapbox-token');
        const data = await response.json();
        
        if (!data.token) {
          throw new Error('Mapbox Token nicht gefunden in Supabase Secrets');
        }

        if (!mapContainer.current) return;

        mapboxgl.accessToken = data.token;
        
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [center[1], center[0]], // Mapbox uses [lng, lat]
          zoom: zoom,
          pitch: 0,
        });

        // Add navigation controls
        if (showControls) {
          map.current.addControl(
            new mapboxgl.NavigationControl({
              visualizePitch: true,
            }),
            'top-right'
          );
        }

        map.current.on('load', () => {
          setIsLoaded(true);

          // Add event markers
          allEvents.forEach((event) => {
            // Create custom marker element
            const markerElement = document.createElement('div');
            markerElement.className = 'custom-marker';
            markerElement.style.width = '20px';
            markerElement.style.height = '20px';
            markerElement.style.borderRadius = '50%';
            markerElement.style.backgroundColor = '#ff5722';
            markerElement.style.border = '3px solid white';
            markerElement.style.cursor = 'pointer';
            markerElement.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';

            // Add pulsing effect
            const pulseElement = document.createElement('div');
            pulseElement.style.position = 'absolute';
            pulseElement.style.top = '0';
            pulseElement.style.left = '0';
            pulseElement.style.width = '20px';
            pulseElement.style.height = '20px';
            pulseElement.style.borderRadius = '50%';
            pulseElement.style.backgroundColor = '#ff5722';
            pulseElement.style.opacity = '0.6';
            pulseElement.style.animation = 'pulse 2s infinite';
            markerElement.appendChild(pulseElement);

            // Create marker
            const marker = new mapboxgl.Marker(markerElement)
              .setLngLat([event.position[1], event.position[0]]) // [lng, lat]
              .addTo(map.current!);

            // Create popup
            const popup = new mapboxgl.Popup({
              offset: 25,
              closeButton: false,
              className: 'custom-popup'
            }).setHTML(`
              <div style="color: black; padding: 8px;">
                <h3 style="margin: 0; font-size: 14px; font-weight: bold;">${event.title}</h3>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">${event.category}</p>
              </div>
            `);

            // Show popup on click
            markerElement.addEventListener('click', () => {
              popup.setLngLat([event.position[1], event.position[0]]).addTo(map.current!);
            });
          });

          // Add click listener for creating events
          if (onCreateEvent) {
            map.current!.on('click', (e) => {
              const lat = e.lngLat.lat;
              const lng = e.lngLat.lng;
              onCreateEvent([lat, lng]);
            });
          }
        });

        map.current.on('error', (e) => {
          console.error('Mapbox error:', e);
          setError('Fehler beim Laden der Mapbox-Karte');
        });

      } catch (error) {
        console.error('Error loading Mapbox:', error);
        setError('Fehler beim Laden der Mapbox-Karte. Bitte überprüfen Sie den Token.');
      }
    };

    initMap();

    return () => {
      map.current?.remove();
    };
  }, [center, zoom, showControls, onCreateEvent]);

  if (error) {
    return (
      <div 
        style={{ height }} 
        className="w-full rounded-lg border border-evendle-gray bg-evendle-dark-card flex items-center justify-center"
      >
        <div className="text-center p-8">
          <h3 className="text-white text-lg font-bold mb-2">Mapbox Fehler</h3>
          <p className="text-evendle-light-gray text-sm mb-4">{error}</p>
          <p className="text-evendle-gray text-xs">
            Bitte stellen Sie sicher, dass Sie einen gültigen Mapbox Public Token in den Supabase Secrets hinterlegt haben.
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div 
        style={{ height }} 
        className="w-full rounded-lg border border-evendle-gray bg-evendle-dark-card flex items-center justify-center"
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-evendle-orange mx-auto mb-2"></div>
          <p className="text-white">Mapbox wird geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      style={{ height }} 
      className="w-full rounded-lg overflow-hidden border border-evendle-gray"
    >
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes pulse {
            0% {
              transform: scale(1);
              opacity: 0.6;
            }
            70% {
              transform: scale(2);
              opacity: 0;
            }
            100% {
              transform: scale(2);
              opacity: 0;
            }
          }
        `
      }} />
    </div>
  );
};

export default MapboxMap;