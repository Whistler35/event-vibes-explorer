import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin } from 'lucide-react';

interface MapPositionPickerProps {
  initialPosition: [number, number]; // [lat, lng]
  onPositionChange: (position: [number, number]) => void;
  height?: string;
}

const MapPositionPicker: React.FC<MapPositionPickerProps> = ({
  initialPosition,
  onPositionChange,
  height = '200px',
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    const mapboxToken = 'pk.eyJ1IjoiZXZlbmRsZSIsImEiOiJjbWs0aHc2eWQwN2hqM2RyMjI4ZTY0N2F6In0.gMPP_wAbSR4Esz7WlB4Z4Q';
    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [initialPosition[1], initialPosition[0]], // [lng, lat]
      zoom: 15,
    });

    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    map.current.on('load', () => {
      setIsLoaded(true);

      // Create draggable marker
      const el = document.createElement('div');
      el.style.width = '40px';
      el.style.height = '40px';
      el.style.cursor = 'grab';
      el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="hsl(107, 19%, 25%)" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>`;

      const marker = new mapboxgl.Marker({ element: el, draggable: true, anchor: 'bottom' })
        .setLngLat([initialPosition[1], initialPosition[0]])
        .addTo(map.current!);

      marker.on('dragend', () => {
        const lngLat = marker.getLngLat();
        onPositionChange([lngLat.lat, lngLat.lng]);
      });

      markerRef.current = marker;
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  return (
    <div className="relative rounded-xl overflow-hidden border border-border" style={{ height }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      {!isLoaded && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      )}
      <div className="absolute bottom-2 left-2 z-10 px-2 py-1 bg-card/90 backdrop-blur-sm rounded-md border border-border">
        <p className="text-muted-foreground text-xs flex items-center gap-1">
          <MapPin className="h-3 w-3" /> Pin verschieben
        </p>
      </div>
    </div>
  );
};

export default MapPositionPicker;
