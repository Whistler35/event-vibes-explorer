import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Plus, X, MapPin } from 'lucide-react';

interface MapEvent {
  id: number | string;
  title: string;
  position: [number, number]; // [lat, lng]
  category?: string;
  image?: string;
}

interface MapboxMapProps {
  center?: [number, number];
  zoom?: number;
  height?: string;
  events?: MapEvent[];
  onCreateEvent?: (position: [number, number]) => void;
  showControls?: boolean;
  minZoomForCreate?: number;
}

const MapboxMap: React.FC<MapboxMapProps> = ({
  center = [47.2692, 11.4041], // Innsbruck default
  zoom = 13,
  height = "500px",
  events = [],
  onCreateEvent,
  showControls = true,
  minZoomForCreate = 14
}) => {
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

  // Handle entering place mode
  const enterPlaceMode = useCallback(() => {
    setIsPlaceMode(true);
    // Place marker in center of map
    if (map.current && mapContainer.current) {
      const rect = mapContainer.current.getBoundingClientRect();
      setMarkerPosition({ x: rect.width / 2, y: rect.height / 2 });
    }
  }, []);

  // Handle canceling place mode
  const cancelPlaceMode = useCallback(() => {
    setIsPlaceMode(false);
    setMarkerPosition(null);
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, []);

  // Handle confirming the placement
  const confirmPlacement = useCallback(() => {
    if (!map.current || !markerPosition || !mapContainer.current) return;
    
    // Convert screen position to map coordinates
    const rect = mapContainer.current.getBoundingClientRect();
    const point = map.current.unproject([markerPosition.x, markerPosition.y]);
    
    console.log('[MapboxMap] Confirm placement at:', point.lat, point.lng);
    
    if (onCreateEventRef.current) {
      onCreateEventRef.current([point.lat, point.lng]);
    }
    
    cancelPlaceMode();
  }, [markerPosition, cancelPlaceMode]);

  // Handle dragging the marker
  const handleMarkerDrag = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isPlaceMode || !mapContainer.current) return;
    
    e.preventDefault();
    
    const rect = mapContainer.current.getBoundingClientRect();
    
    const getPosition = (event: MouseEvent | TouchEvent) => {
      if ('touches' in event) {
        return {
          x: event.touches[0].clientX - rect.left,
          y: event.touches[0].clientY - rect.top
        };
      }
      return {
        x: (event as MouseEvent).clientX - rect.left,
        y: (event as MouseEvent).clientY - rect.top
      };
    };

    const handleMove = (event: MouseEvent | TouchEvent) => {
      const pos = getPosition(event);
      // Clamp within bounds
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
    // Prevent re-initialization
    if (map.current) return;
    if (!mapContainer.current) return;

    try {
      const mapboxToken = 'pk.eyJ1IjoiZXZlbmRsZSIsImEiOiJjbWs0aHc2eWQwN2hqM2RyMjI4ZTY0N2F6In0.gMPP_wAbSR4Esz7WlB4Z4Q';
      mapboxgl.accessToken = mapboxToken;
      
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
      });
      
      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
        setError('Fehler beim Laden der Mapbox-Karte');
      });

    } catch (error) {
      console.error('Error loading Mapbox:', error);
      setError('Fehler beim Laden der Mapbox-Karte. Bitte überprüfen Sie den Token.');
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ref to track existing markers
  const markersRef = useRef<Map<string | number, mapboxgl.Marker>>(new Map());

  // Effect to add/update event markers
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    // Add new markers
    allEvents.forEach((event) => {
      // Skip if marker already exists
      if (markersRef.current.has(event.id)) return;

      // Create marker container
      const markerContainer = document.createElement('div');
      markerContainer.className = 'event-marker-container';
      markerContainer.style.display = 'flex';
      markerContainer.style.flexDirection = 'column';
      markerContainer.style.alignItems = 'center';
      markerContainer.style.cursor = 'pointer';

      // Create image wrapper with pulse effect
      const imageWrapper = document.createElement('div');
      imageWrapper.style.position = 'relative';
      imageWrapper.style.width = '50px';
      imageWrapper.style.height = '50px';

      // Create round image or placeholder
      const imageElement = document.createElement('div');
      imageElement.style.width = '50px';
      imageElement.style.height = '50px';
      imageElement.style.borderRadius = '50%';
      imageElement.style.border = '3px solid #ff5722';
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
        imageElement.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff5722" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>';
      }

      imageWrapper.appendChild(imageElement);

      // Create title label
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

      markerContainer.appendChild(imageWrapper);
      markerContainer.appendChild(titleLabel);

      // Create and add marker
      const marker = new mapboxgl.Marker({
        element: markerContainer,
        anchor: 'bottom'
      })
        .setLngLat([event.position[1], event.position[0]])
        .addTo(map.current!);

      // Store marker reference
      markersRef.current.set(event.id, marker);

      // Add popup on click
      const popup = new mapboxgl.Popup({
        offset: 60,
        closeButton: true,
        className: 'custom-popup'
      }).setHTML(`
        <div style="color: black; padding: 8px; max-width: 200px;">
          ${event.image ? `<img src="${event.image}" style="width: 100%; height: 80px; object-fit: cover; border-radius: 8px; margin-bottom: 8px;" />` : ''}
          <h3 style="margin: 0; font-size: 14px; font-weight: bold;">${event.title}</h3>
          ${event.category ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">${event.category}</p>` : ''}
        </div>
      `);

      markerContainer.addEventListener('click', () => {
        popup.setLngLat([event.position[1], event.position[0]]).addTo(map.current!);
      });
    });

    // Cleanup removed events
    markersRef.current.forEach((marker, id) => {
      if (!allEvents.find(e => e.id === id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });
  }, [allEvents, isLoaded]);

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


  return (
    <div 
      style={{ height }} 
      className="w-full rounded-lg overflow-hidden border border-evendle-gray relative"
    >
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      {!isLoaded && !error && (
        <div className="absolute inset-0 bg-evendle-dark-card flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-evendle-orange mx-auto mb-2"></div>
            <p className="text-white">Mapbox wird geladen...</p>
          </div>
        </div>
      )}

      {/* Event count badge */}
      {allEvents.length > 0 && (
        <div className="absolute top-4 right-4 z-20 rounded-full border border-border bg-card/80 px-3 py-1 text-xs text-foreground">
          {allEvents.length} Events
        </div>
      )}
      
      {/* Add Event Button */}
      {!isPlaceMode && isLoaded && (
        <button
          onClick={enterPlaceMode}
          className="absolute bottom-6 right-6 z-20 w-14 h-14 bg-evendle-orange rounded-full flex items-center justify-center shadow-lg hover:bg-orange-600 transition-colors"
          aria-label="Event erstellen"
        >
          <Plus className="w-8 h-8 text-white" />
        </button>
      )}

      {/* Place Mode UI */}
      {isPlaceMode && markerPosition && (
        <>
          {/* Draggable Marker */}
          <div
            className="absolute z-30 cursor-grab active:cursor-grabbing touch-none"
            style={{
              left: markerPosition.x - 24,
              top: markerPosition.y - 48,
            }}
            onMouseDown={handleMarkerDrag}
            onTouchStart={handleMarkerDrag}
          >
            <MapPin className="w-12 h-12 text-evendle-orange drop-shadow-lg" fill="#ff5722" />
          </div>

          {/* Crosshair at marker position */}
          <div
            className="absolute z-20 pointer-events-none"
            style={{
              left: markerPosition.x - 16,
              top: markerPosition.y - 16,
            }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32">
              <line x1="16" y1="0" x2="16" y2="32" stroke="white" strokeWidth="2" opacity="0.8" />
              <line x1="0" y1="16" x2="32" y2="16" stroke="white" strokeWidth="2" opacity="0.8" />
              <circle cx="16" cy="16" r="4" fill="none" stroke="white" strokeWidth="2" opacity="0.8" />
            </svg>
          </div>

          {/* Place Mode Controls */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30 flex gap-4">
            <button
              onClick={cancelPlaceMode}
              className="px-6 py-3 bg-evendle-dark-card border border-evendle-gray rounded-full flex items-center gap-2 text-white hover:bg-evendle-gray transition-colors"
            >
              <X className="w-5 h-5" />
              <span>Abbrechen</span>
            </button>
            <button
              onClick={confirmPlacement}
              className="px-6 py-3 bg-evendle-orange rounded-full flex items-center gap-2 text-white hover:bg-orange-600 transition-colors"
            >
              <MapPin className="w-5 h-5" />
              <span>Hier platzieren</span>
            </button>
          </div>

          {/* Instruction Banner */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 px-4 py-2 bg-evendle-dark-card/90 border border-evendle-gray rounded-full">
            <p className="text-white text-sm">Ziehe den Pin an die gewünschte Stelle</p>
          </div>
        </>
      )}
      
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
