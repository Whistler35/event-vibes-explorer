import React, { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { toast } from 'sonner';

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
  
  // Long press state
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const pressStartPos = useRef<{ x: number; y: number } | null>(null);
  const [longPressProgress, setLongPressProgress] = useState(0);
  const [longPressPosition, setLongPressPosition] = useState<{ x: number; y: number } | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const pendingCreateRef = useRef<[number, number] | null>(null);

  // Keep callback ref updated
  onCreateEventRef.current = onCreateEvent;

  // No default events - will be loaded from database
  const defaultEvents: MapEvent[] = [];

  const allEvents = events.length > 0 ? events : defaultEvents;

  const clearLongPress = useCallback((triggerCreate = false) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }

    // If the long-press completed successfully, trigger creation on release
    if (triggerCreate && pendingCreateRef.current && onCreateEventRef.current) {
      const coords = pendingCreateRef.current;
      console.log('[MapboxMap] Trigger create on release:', coords);
      // Small delay to ensure touch/mouse events are fully processed
      setTimeout(() => {
        onCreateEventRef.current?.(coords);
      }, 100);
    }
    pendingCreateRef.current = null;

    setLongPressProgress(0);
    setLongPressPosition(null);
    pressStartPos.current = null;
  }, []);

  const handleLongPressStart = useCallback((e: mapboxgl.MapMouseEvent | mapboxgl.MapTouchEvent) => {
    if (!map.current) return;
    
    // Store lngLat immediately as the event object may not be valid later
    const lngLat = { lat: e.lngLat.lat, lng: e.lngLat.lng };
    
    const point = 'touches' in e.originalEvent 
      ? { x: (e.originalEvent as TouchEvent).touches[0].clientX, y: (e.originalEvent as TouchEvent).touches[0].clientY }
      : { x: (e.originalEvent as MouseEvent).clientX, y: (e.originalEvent as MouseEvent).clientY };
    
    pressStartPos.current = point;
    setLongPressPosition(point);
    
    // Start progress animation
    const startTime = Date.now();
    const duration = 3000; // 3 seconds
    
    progressInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);
      setLongPressProgress(progress);
    }, 50);
    
    longPressTimer.current = setTimeout(() => {
      if (!map.current) return;
      
      const currentZoom = map.current.getZoom();
      
      if (currentZoom < minZoomForCreate) {
        toast.error('Bitte zoome weiter rein, um ein Event zu erstellen', {
          description: `Aktueller Zoom: ${currentZoom.toFixed(1)} - Benötigt: ${minZoomForCreate}`,
          duration: 4000
        });
        clearLongPress(false);
        return;
      }

      // IMPORTANT: Don't open the dialog while the user is still pressing.
      // On mobile, the following touchend/mouseup can immediately close the dialog.
      // So we store the coordinates now and trigger creation on release.
      pendingCreateRef.current = [lngLat.lat, lngLat.lng];
      console.log('[MapboxMap] Long-press complete, will create on release:', pendingCreateRef.current);
      setLongPressProgress(100);
    }, 3000);
  }, [minZoomForCreate, clearLongPress]);

  const handleMove = useCallback((e: mapboxgl.MapMouseEvent | mapboxgl.MapTouchEvent) => {
    if (!pressStartPos.current) return;
    
    const point = 'touches' in e.originalEvent 
      ? { x: (e.originalEvent as TouchEvent).touches[0].clientX, y: (e.originalEvent as TouchEvent).touches[0].clientY }
      : { x: (e.originalEvent as MouseEvent).clientX, y: (e.originalEvent as MouseEvent).clientY };
    
    const dx = Math.abs(point.x - pressStartPos.current.x);
    const dy = Math.abs(point.y - pressStartPos.current.y);
    
    // If moved more than 10 pixels, cancel long press
    if (dx > 10 || dy > 10) {
      clearLongPress();
    }
  }, [clearLongPress]);

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

        // Add event markers
        allEvents.forEach((event) => {
          const markerElement = document.createElement('div');
          markerElement.className = 'custom-marker';
          markerElement.style.width = '20px';
          markerElement.style.height = '20px';
          markerElement.style.borderRadius = '50%';
          markerElement.style.backgroundColor = '#ff5722';
          markerElement.style.border = '3px solid white';
          markerElement.style.cursor = 'pointer';
          markerElement.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';

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

          new mapboxgl.Marker(markerElement)
            .setLngLat([event.position[1], event.position[0]])
            .addTo(map.current!);

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

          markerElement.addEventListener('click', () => {
            popup.setLngLat([event.position[1], event.position[0]]).addTo(map.current!);
          });
        });

      });
      
      // Long press handlers for mouse
      map.current.on('mousedown', handleLongPressStart);
      map.current.on('mousemove', handleMove);
      map.current.on('mouseup', () => clearLongPress(true));
      
      // Long press handlers for touch
      map.current.on('touchstart', handleLongPressStart);
      map.current.on('touchmove', handleMove);
      map.current.on('touchend', () => clearLongPress(true));

      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
        setError('Fehler beim Laden der Mapbox-Karte');
      });

    } catch (error) {
      console.error('Error loading Mapbox:', error);
      setError('Fehler beim Laden der Mapbox-Karte. Bitte überprüfen Sie den Token.');
    }

    return () => {
      clearLongPress();
      map.current?.remove();
      map.current = null;
    };
  }, [center, zoom, showControls, allEvents, handleLongPressStart, handleMove, clearLongPress]);

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
      
      {/* Long Press Progress Indicator */}
      {longPressPosition && longPressProgress > 0 && (
        <div 
          className="fixed z-50 pointer-events-none"
          style={{
            left: longPressPosition.x - 30,
            top: longPressPosition.y - 30,
          }}
        >
          <svg width="60" height="60" viewBox="0 0 60 60">
            <circle
              cx="30"
              cy="30"
              r="26"
              fill="none"
              stroke="rgba(0,0,0,0.3)"
              strokeWidth="4"
            />
            <circle
              cx="30"
              cy="30"
              r="26"
              fill="none"
              stroke="#ff5722"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${(longPressProgress / 100) * 163.36} 163.36`}
              transform="rotate(-90 30 30)"
            />
            <circle
              cx="30"
              cy="30"
              r="8"
              fill="#ff5722"
            />
          </svg>
        </div>
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
