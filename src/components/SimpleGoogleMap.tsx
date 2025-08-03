import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface SimpleGoogleMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
  onCreateEvent?: (position: { lat: number; lng: number }) => void;
}

const SimpleGoogleMap: React.FC<SimpleGoogleMapProps> = ({ 
  center = { lat: 52.520008, lng: 13.404954 }, 
  zoom = 13,
  height = "500px",
  onCreateEvent
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [containerReady, setContainerReady] = useState(false);

  // Prüfe ob Container bereit ist
  useLayoutEffect(() => {
    if (mapRef.current) {
      console.log('Container is ready!');
      setContainerReady(true);
    }
  }, []);

  useEffect(() => {
    if (!containerReady) {
      console.log('Container not ready yet...');
      return;
    }

    const initMap = async () => {
      try {
        console.log('Starting Google Maps initialization...');
        
        const loader = new Loader({
          apiKey: 'AIzaSyCVgYgfLVAOZcbdyEm2Hac2zuBr_c1zgjc',
          version: 'weekly',
          libraries: ['places']
        });

        console.log('Loading Google Maps API...');
        await loader.load();
        console.log('Google Maps API loaded successfully');
        
        console.log('Creating map instance...');
        const map = new google.maps.Map(mapRef.current!, {
          center: center,
          zoom: zoom,
          styles: [
            {
              featureType: "all",
              elementType: "geometry.fill",
              stylers: [{ color: "#f5f5f5" }]
            },
            {
              featureType: "water",
              elementType: "geometry",
              stylers: [{ color: "#c9c9c9" }]
            }
          ]
        });

        console.log('Map instance created successfully');

        // Event Marker hinzufügen
        const events = [
          {
            id: 1,
            title: "NAMASTE FOR ALL - YOGA-KURS",
            position: { lat: 52.515, lng: 13.405 },
            category: "Outdoor"
          },
          {
            id: 2,
            title: "CLOSING PARTY",
            position: { lat: 52.525, lng: 13.395 },
            category: "Party"
          },
          {
            id: 3,
            title: "SUMMER BEATS",
            position: { lat: 52.510, lng: 13.415 },
            category: "Music"
          }
        ];

        events.forEach((event) => {
          const marker = new google.maps.Marker({
            position: event.position,
            map: map,
            title: event.title,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#ff5722',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2
            }
          });

          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="color: black; padding: 8px;">
                <h3 style="margin: 0; font-size: 14px; font-weight: bold;">${event.title}</h3>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">${event.category}</p>
              </div>
            `
          });

          marker.addListener('click', () => {
            infoWindow.open(map, marker);
          });
        });

        // Click Event für neue Events
        if (onCreateEvent) {
          map.addListener('click', (e: google.maps.MapMouseEvent) => {
            if (e.latLng) {
              const lat = e.latLng.lat();
              const lng = e.latLng.lng();
              console.log('Map clicked at:', lat, lng);
              onCreateEvent({ lat, lng });
            }
          });
        }

        console.log('Setting isLoaded to true');
        setIsLoaded(true);
        
      } catch (error) {
        console.error('Error loading Google Maps:', error);
        setError('Fehler beim Laden der Google Maps: ' + (error as Error).message);
      }
    };

    initMap();
  }, [containerReady, center, zoom, onCreateEvent]);

  if (error) {
    return (
      <div 
        style={{ height }} 
        className="w-full rounded-lg border border-evendle-gray bg-evendle-dark-card flex items-center justify-center"
      >
        <div className="text-center p-8">
          <h3 className="text-white text-lg font-bold mb-2">Google Maps Fehler</h3>
          <p className="text-evendle-light-gray text-sm">{error}</p>
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
          <p className="text-white">Google Maps wird geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      style={{ height }} 
      className="w-full rounded-lg overflow-hidden border border-evendle-gray"
    >
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default SimpleGoogleMap;