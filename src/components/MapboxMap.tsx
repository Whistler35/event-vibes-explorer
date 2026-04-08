import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Plus, X, MapPin } from 'lucide-react';

interface MapEvent {
  id: number | string;
  title: string;
  position: [number, number]; // [lat, lng]
  category?: string;
  image?: string;
  description?: string;
  event_date?: string;
  location_name?: string;
  max_participants?: number;
  current_participants?: number;
  is_featured?: boolean;
}

export interface MapboxMapHandle {
  flyTo: (lat: number, lng: number, zoom?: number) => void;
}

interface MapboxMapProps {
  center?: [number, number];
  zoom?: number;
  height?: string;
  events?: MapEvent[];
  onCreateEvent?: (position: [number, number]) => void;
  onEventClick?: (event: MapEvent) => void;
  showControls?: boolean;
  minZoomForCreate?: number;
  isAdmin?: boolean;
}

const MapboxMap = forwardRef<MapboxMapHandle, MapboxMapProps>(({
  center = [47.2692, 11.4041],
  zoom = 13,
  height = "500px",
  events = [],
  onCreateEvent,
  onEventClick,
  showControls = true,
  minZoomForCreate = 14,
  isAdmin = false,
}, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const onCreateEventRef = useRef(onCreateEvent);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Drag-to-place state
  const [isPlaceMode, setIsPlaceMode] = useState(false);
  const [markerPosition, setMarkerPosition] = useState<{ x: number; y: number } | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  // Keep callback ref updated
  onCreateEventRef.current = onCreateEvent;

  const allEvents = events;

  // Expose flyTo via ref
  useImperativeHandle(ref, () => ({
    flyTo: (lat: number, lng: number, zoomLevel?: number) => {
      if (map.current) {
        map.current.flyTo({ center: [lng, lat], zoom: zoomLevel || 13, duration: 2000 });
      }
    },
  }));

  // Handle entering place mode
  const enterPlaceMode = useCallback(() => {
    setIsPlaceMode(true);
    if (map.current && mapContainer.current) {
      const rect = mapContainer.current.getBoundingClientRect();
      setMarkerPosition({ x: rect.width / 2, y: rect.height / 2 });
    }
  }, []);

  const cancelPlaceMode = useCallback(() => {
    setIsPlaceMode(false);
    setMarkerPosition(null);
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, []);

  const confirmPlacement = useCallback(() => {
    if (!map.current || !markerPosition || !mapContainer.current) return;
    const point = map.current.unproject([markerPosition.x, markerPosition.y]);
    if (onCreateEventRef.current) {
      onCreateEventRef.current([point.lat, point.lng]);
    }
    cancelPlaceMode();
  }, [markerPosition, cancelPlaceMode]);

  const handleMarkerDrag = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isPlaceMode || !mapContainer.current) return;
    e.preventDefault();
    const rect = mapContainer.current.getBoundingClientRect();
    const getPosition = (event: MouseEvent | TouchEvent) => {
      if ('touches' in event) {
        return { x: event.touches[0].clientX - rect.left, y: event.touches[0].clientY - rect.top };
      }
      return { x: (event as MouseEvent).clientX - rect.left, y: (event as MouseEvent).clientY - rect.top };
    };
    const handleMove = (event: MouseEvent | TouchEvent) => {
      const pos = getPosition(event);
      pos.x = Math.max(0, Math.min(rect.width, pos.x));
      pos.y = Math.max(0, Math.min(rect.height, pos.y));
      setMarkerPosition(pos);
    };
    const handleEnd = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
  }, [isPlaceMode]);

  useEffect(() => {
    if (map.current) return;
    if (!mapContainer.current) return;
    try {
      const mapboxToken = 'pk.eyJ1IjoiZXZlbmRsZSIsImEiOiJjbWs0aHc2eWQwN2hqM2RyMjI4ZTY0N2F6In0.gMPP_wAbSR4Esz7WlB4Z4Q';
      mapboxgl.accessToken = mapboxToken;
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [center[1], center[0]],
        zoom: zoom,
        pitch: 0,
      });
      if (showControls) {
        map.current.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');
      }
      map.current.on('load', () => setIsLoaded(true));
      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
        setError('Fehler beim Laden der Mapbox-Karte');
      });
    } catch (error) {
      console.error('Error loading Mapbox:', error);
      setError('Fehler beim Laden der Mapbox-Karte.');
    }
    return () => {
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markersRef2 = useRef<Map<string | number, mapboxgl.Marker>>(new Map());

  useEffect(() => {
    if (!map.current || !isLoaded) return;
    allEvents.forEach((event) => {
      if (markersRef2.current.has(event.id)) return;
      const markerContainer2 = document.createElement('div');
      markerContainer2.className = 'event-marker-container';
      markerContainer2.style.display = 'flex';
      markerContainer2.style.flexDirection = 'column';
      markerContainer2.style.alignItems = 'center';
      markerContainer2.style.cursor = 'pointer';
      const imageWrapper = document.createElement('div');
      imageWrapper.style.position = 'relative';
      imageWrapper.style.width = '50px';
      imageWrapper.style.height = '50px';
      const imageElement = document.createElement('div');
      imageElement.style.width = '50px';
      imageElement.style.height = '50px';
      imageElement.style.borderRadius = '50%';
      imageElement.style.border = '3px solid #3B4D34';
      imageElement.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
      imageElement.style.overflow = 'hidden';
      imageElement.style.backgroundColor = '#1a1a2e';
      if (event.image) {
        const img = document.createElement('img');
        img.src = event.image;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        imageElement.appendChild(img);
      } else {
        imageElement.style.display = 'flex';
        imageElement.style.alignItems = 'center';
        imageElement.style.justifyContent = 'center';
        imageElement.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3B4D34" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>';
      }
      imageWrapper.appendChild(imageElement);
      const titleLabel = document.createElement('div');
      titleLabel.textContent = event.title;
      titleLabel.style.marginTop = '4px';
      titleLabel.style.padding = '2px 8px';
      titleLabel.style.backgroundColor = 'rgba(26, 26, 46, 0.9)';
      titleLabel.style.color = 'white';
      titleLabel.style.fontSize = '11px';
      titleLabel.style.fontWeight = 'bold';
      titleLabel.style.borderRadius = '10px';
      titleLabel.style.whiteSpace = 'nowrap';
      titleLabel.style.maxWidth = '100px';
      titleLabel.style.overflow = 'hidden';
      titleLabel.style.textOverflow = 'ellipsis';
      titleLabel.style.textAlign = 'center';
      markerContainer2.appendChild(imageWrapper);
      markerContainer2.appendChild(titleLabel);
      const marker = new mapboxgl.Marker({ element: markerContainer2, anchor: 'bottom' })
        .setLngLat([event.position[1], event.position[0]])
        .addTo(map.current!);
      markersRef2.current.set(event.id, marker);
      markerContainer2.addEventListener('click', () => {
        if (onEventClick) onEventClick(event);
      });
    });
    markersRef2.current.forEach((marker, id) => {
      if (!allEvents.find(e => e.id === id)) {
        marker.remove();
        markersRef2.current.delete(id);
      }
    });
  }, [allEvents, isLoaded]);

  if (error) {
    return (
      <div style={{ height }} className="w-full rounded-lg border border-border bg-card flex items-center justify-center">
        <div className="text-center p-8">
          <h3 className="text-foreground text-lg font-bold mb-2">Mapbox Fehler</h3>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full rounded-lg overflow-hidden border border-border relative">
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      {!isLoaded && !error && (
        <div className="absolute inset-0 bg-card flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-foreground">Karte wird geladen...</p>
          </div>
        </div>
      )}
      {!isPlaceMode && isLoaded && (
        <button
          onClick={() => enterPlaceMode()}
          className="absolute bottom-6 right-6 z-20 w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors"
          aria-label="Event erstellen"
        >
          <Plus className="w-8 h-8 text-primary-foreground" />
        </button>
      )}
      {isPlaceMode && markerPosition && (
        <>
          <div
            className="absolute z-30 cursor-grab active:cursor-grabbing touch-none"
            style={{ left: markerPosition.x - 24, top: markerPosition.y - 48 }}
            onMouseDown={handleMarkerDrag}
            onTouchStart={handleMarkerDrag}
          >
            <MapPin className="w-12 h-12 text-primary drop-shadow-lg" fill="hsl(var(--primary))" />
          </div>
          <div className="absolute z-20 pointer-events-none" style={{ left: markerPosition.x - 16, top: markerPosition.y - 16 }}>
            <svg width="32" height="32" viewBox="0 0 32 32">
              <line x1="16" y1="0" x2="16" y2="32" stroke="white" strokeWidth="2" opacity="0.8" />
              <line x1="0" y1="16" x2="32" y2="16" stroke="white" strokeWidth="2" opacity="0.8" />
              <circle cx="16" cy="16" r="4" fill="none" stroke="white" strokeWidth="2" opacity="0.8" />
            </svg>
          </div>
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30 flex gap-4">
            <button onClick={cancelPlaceMode} className="px-6 py-3 bg-card border border-border rounded-full flex items-center gap-2 text-foreground hover:bg-muted transition-colors">
              <X className="w-5 h-5" /><span>Abbrechen</span>
            </button>
            <button onClick={confirmPlacement} className="px-6 py-3 bg-primary rounded-full flex items-center gap-2 text-primary-foreground hover:bg-primary/90 transition-colors">
              <MapPin className="w-5 h-5" /><span>Hier platzieren</span>
            </button>
          </div>
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 px-4 py-2 bg-card/90 border border-border rounded-full">
            <p className="text-foreground text-sm">Ziehe den Pin an die gewünschte Stelle</p>
          </div>
        </>
      )}
    </div>
  );
});

MapboxMap.displayName = 'MapboxMap';

export default MapboxMap;
