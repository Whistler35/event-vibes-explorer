import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface MapEvent {
  id: number;
  title: string;
  position: { lat: number; lng: number };
  category: string;
}

interface GoogleMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  height?: string;
  events?: MapEvent[];
  onCreateEvent?: (position: { lat: number; lng: number }) => void;
  showControls?: boolean;
}

const GoogleMapComponent: React.FC<GoogleMapProps> = ({ 
  center = { lat: 52.520008, lng: 13.404954 }, // Berlin default
  zoom = 13,
  height = "500px",
  events = [],
  onCreateEvent,
  showControls = true
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sample events for Berlin
  const defaultEvents: MapEvent[] = [
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

  const allEvents = events.length > 0 ? events : defaultEvents;

  useEffect(() => {
    const initMap = async () => {
      try {
        console.log('Trying to fetch Google Maps API key...');
        // Fetch API key from Supabase Edge Function
        const response = await fetch('https://wrqckgrnshklyaiilprz.supabase.co/functions/v1/google-maps-key');
        console.log('Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if (!data.apiKey) {
          throw new Error('Google Maps API Key nicht gefunden in Supabase Secrets');
        }
        
        const loader = new Loader({
          apiKey: data.apiKey,
          version: 'weekly',
          libraries: ['places']
        });

        const google = await loader.load();
        
        if (mapRef.current) {
          const mapInstance = new google.maps.Map(mapRef.current, {
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
            ],
            disableDefaultUI: !showControls,
            zoomControl: showControls,
            mapTypeControl: false,
            scaleControl: true,
            streetViewControl: false,
            rotateControl: false,
            fullscreenControl: showControls
          });

          setMap(mapInstance);
          setIsLoaded(true);

          // Add event markers
          allEvents.forEach((event) => {
            const marker = new google.maps.Marker({
              position: event.position,
              map: mapInstance,
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
              infoWindow.open(mapInstance, marker);
            });
          });

          // Add click listener for creating events
          if (onCreateEvent) {
            mapInstance.addListener('click', (e: google.maps.MapMouseEvent) => {
              if (e.latLng) {
                const lat = e.latLng.lat();
                const lng = e.latLng.lng();
                onCreateEvent({ lat, lng });
              }
            });
          }
        }
      } catch (error) {
        console.error('Error loading Google Maps:', error);
        setError('Fehler beim Laden der Google Maps. Bitte überprüfen Sie den API-Key.');
      }
    };

    initMap();
  }, [center, zoom, showControls, onCreateEvent]);

  if (error) {
    return (
      <div 
        style={{ height }} 
        className="w-full rounded-lg border border-evendle-gray bg-evendle-dark-card flex items-center justify-center"
      >
        <div className="text-center p-8">
          <h3 className="text-white text-lg font-bold mb-2">Google Maps Fehler</h3>
          <p className="text-evendle-light-gray text-sm mb-4">{error}</p>
          <p className="text-evendle-gray text-xs">
            Bitte stellen Sie sicher, dass Sie einen gültigen Google Maps API-Key in den Supabase Secrets hinterlegt haben.
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

export default GoogleMapComponent;