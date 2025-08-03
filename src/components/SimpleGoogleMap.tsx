import React, { useEffect, useRef, useState } from 'react';

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

  useEffect(() => {
    const loadGoogleMaps = () => {
      // Prüfen ob Google Maps bereits geladen ist
      if (window.google && window.google.maps) {
        initializeMap();
        return;
      }

      // Google Maps Script laden
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyCVgYgfLVAOZcbdyEm2Hac2zuBr_c1zgjc&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log('Google Maps script loaded');
        initializeMap();
      };
      
      script.onerror = () => {
        console.error('Failed to load Google Maps script');
        setError('Fehler beim Laden der Google Maps');
      };

      document.head.appendChild(script);
    };

    const initializeMap = () => {
      if (!mapRef.current) {
        console.error('Map container not found');
        return;
      }

      try {
        console.log('Initializing map...');
        
        const map = new google.maps.Map(mapRef.current, {
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

        setIsLoaded(true);
        console.log('Map initialized successfully');
        
      } catch (error) {
        console.error('Error initializing map:', error);
        setError('Fehler beim Initialisieren der Karte');
      }
    };

    loadGoogleMaps();
  }, [center, zoom, onCreateEvent]);

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