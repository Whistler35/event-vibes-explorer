import React, { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import Supercluster from 'supercluster';
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
  selectedEventId?: number | string | null;
}

const MapboxMap = forwardRef<MapboxMapHandle, MapboxMapProps>(({
  center = [47.2692, 11.4041],
  zoom = 13,
  height = "500px",
  events = [],
  onCreateEvent,
  onEventClick,
  showControls = false,
  minZoomForCreate = 14,
  isAdmin = false,
  selectedEventId = null,
}, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const geolocateRef = useRef<mapboxgl.GeolocateControl | null>(null);
  const onCreateEventRef = useRef(onCreateEvent);
  const onEventClickRef = useRef(onEventClick);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Drag-to-place state
  const [isPlaceMode, setIsPlaceMode] = useState(false);
  const [markerPosition, setMarkerPosition] = useState<{ x: number; y: number } | null>(null);

  // Cluster + markers
  const clusterIndexRef = useRef<Supercluster | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());

  onCreateEventRef.current = onCreateEvent;
  onEventClickRef.current = onEventClick;

  // Expose flyTo
  useImperativeHandle(ref, () => ({
    flyTo: (lat: number, lng: number, zoomLevel?: number) => {
      map.current?.flyTo({ center: [lng, lat], zoom: zoomLevel || 14, duration: 1200, essential: true });
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
  }, []);

  const confirmPlacement = useCallback(() => {
    if (!map.current || !markerPosition) return;
    const point = map.current.unproject([markerPosition.x, markerPosition.y]);
    onCreateEventRef.current?.([point.lat, point.lng]);
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

  // ---- Init map ----
  useEffect(() => {
    if (map.current || !mapContainer.current) return;
    try {
      mapboxgl.accessToken = 'pk.eyJ1IjoiZXZlbmRsZSIsImEiOiJjbWs0aHc2eWQwN2hqM2RyMjI4ZTY0N2F6In0.gMPP_wAbSR4Esz7WlB4Z4Q';
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [center[1], center[0]],
        zoom,
        pitch: 0,
        attributionControl: false,
      });
      if (showControls) {
        map.current.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');
      }
      map.current.on('load', () => setIsLoaded(true));
      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
        setError('Fehler beim Laden der Karte');
      });
    } catch (e) {
      console.error(e);
      setError('Fehler beim Laden der Karte.');
    }
    return () => {
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Render markers/clusters ----
  const render = useCallback(() => {
    if (!map.current || !isLoaded || !clusterIndexRef.current) return;
    const bounds = map.current.getBounds();
    const z = Math.round(map.current.getZoom());
    const bbox: [number, number, number, number] = [
      bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth(),
    ];
    const clusters = clusterIndexRef.current.getClusters(bbox, z);

    const seen = new Set<string>();

    clusters.forEach((c: any) => {
      const [lng, lat] = c.geometry.coordinates;
      const isCluster = !!c.properties.cluster;
      const key = isCluster ? `c-${c.properties.cluster_id}` : `e-${c.properties.event.id}`;
      seen.add(key);

      let marker = markersRef.current.get(key);
      if (marker) {
        marker.setLngLat([lng, lat]);
        // update selected highlight for event markers
        if (!isCluster) {
          const el = marker.getElement();
          const isSel = String(c.properties.event.id) === String(selectedEventId);
          el.dataset.selected = isSel ? '1' : '0';
          // trigger restyle
          const ring = el.querySelector('[data-ring]') as HTMLElement | null;
          if (ring) {
            ring.style.boxShadow = isSel
              ? '0 0 0 4px hsl(var(--primary) / 0.9), 0 8px 24px hsl(var(--primary) / 0.4)'
              : c.properties.event.is_featured
                ? '0 4px 12px rgba(0,0,0,0.25)'
                : '0 2px 6px rgba(0,0,0,0.25)';
          }
        }
        return;
      }

      const el = document.createElement('div');
      el.style.cursor = 'pointer';

      if (isCluster) {
        const count = c.properties.point_count;
        el.innerHTML = `
          <div style="
            width:${count > 50 ? 56 : count > 10 ? 48 : 40}px;
            height:${count > 50 ? 56 : count > 10 ? 48 : 40}px;
            border-radius:9999px;
            background:hsl(var(--card));
            color:hsl(var(--primary));
            display:flex;align-items:center;justify-content:center;
            font-weight:700;font-size:14px;
            border:2px solid hsl(var(--primary));
            box-shadow:0 4px 14px rgba(0,0,0,0.18);
          ">${count}</div>`;
        el.addEventListener('click', () => {
          const expansion = clusterIndexRef.current!.getClusterExpansionZoom(c.properties.cluster_id);
          map.current!.easeTo({ center: [lng, lat], zoom: Math.min(expansion + 0.5, 18), duration: 600 });
        });
      } else {
        const ev: MapEvent = c.properties.event;
        const featured = !!ev.is_featured;
        const isSel = String(ev.id) === String(selectedEventId);
        if (featured) {
          // Large image marker
          const img = ev.image
            ? `<img src="${ev.image}" style="width:100%;height:100%;object-fit:cover;" alt="" />`
            : `<div style="width:100%;height:100%;background:hsl(var(--muted));"></div>`;
          el.innerHTML = `
            <div data-ring style="
              width:54px;height:54px;border-radius:9999px;overflow:hidden;
              border:3px solid hsl(var(--card));
              background:hsl(var(--card));
              box-shadow:${isSel
                ? '0 0 0 4px hsl(var(--primary) / 0.9), 0 8px 24px hsl(var(--primary) / 0.4)'
                : '0 4px 12px rgba(0,0,0,0.25)'};
              transition:box-shadow .2s ease, transform .2s ease;
            ">${img}</div>`;
        } else {
          // Small minimal dot
          el.innerHTML = `
            <div data-ring style="
              width:14px;height:14px;border-radius:9999px;
              background:hsl(var(--primary));
              border:2px solid hsl(var(--card));
              box-shadow:${isSel
                ? '0 0 0 4px hsl(var(--primary) / 0.9), 0 4px 10px hsl(var(--primary) / 0.4)'
                : '0 2px 6px rgba(0,0,0,0.25)'};
              transition:box-shadow .2s ease, transform .2s ease;
            "></div>`;
        }
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onEventClickRef.current?.(ev);
        });
      }

      marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lng, lat])
        .addTo(map.current!);
      markersRef.current.set(key, marker);
    });

    // Remove stale markers
    markersRef.current.forEach((m, k) => {
      if (!seen.has(k)) {
        m.remove();
        markersRef.current.delete(k);
      }
    });
  }, [isLoaded, selectedEventId]);

  // Build cluster index when events change
  useEffect(() => {
    if (!isLoaded) return;
    const index = new Supercluster({ radius: 60, maxZoom: 16 });
    const points = events
      .filter(e => Number.isFinite(e.position?.[0]) && Number.isFinite(e.position?.[1]))
      .map(e => ({
        type: 'Feature' as const,
        properties: { event: e },
        geometry: { type: 'Point' as const, coordinates: [e.position[1], e.position[0]] },
      }));
    index.load(points as any);
    clusterIndexRef.current = index;
    render();
  }, [events, isLoaded, render]);

  // Re-render on map move
  useEffect(() => {
    if (!map.current || !isLoaded) return;
    const m = map.current;
    const handler = () => render();
    m.on('moveend', handler);
    m.on('zoomend', handler);
    return () => {
      m.off('moveend', handler);
      m.off('zoomend', handler);
    };
  }, [isLoaded, render]);

  // Re-render on selection change
  useEffect(() => { render(); }, [selectedEventId, render]);

  if (error) {
    return (
      <div style={{ height }} className="w-full rounded-lg border border-border bg-card flex items-center justify-center">
        <div className="text-center p-8">
          <h3 className="text-foreground text-lg font-bold mb-2">Karten-Fehler</h3>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full overflow-hidden relative">
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
          onClick={enterPlaceMode}
          className="fixed bottom-[calc(13rem+env(safe-area-inset-bottom))] right-5 md:absolute z-[55] w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-all"
          aria-label="Event erstellen"
        >
          <Plus className="w-6 h-6 text-primary-foreground" />
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
          <div className="fixed bottom-[calc(6.75rem+env(safe-area-inset-bottom))] md:absolute md:bottom-6 left-1/2 transform -translate-x-1/2 z-[60] md:z-30 flex gap-3 px-4 max-w-full">
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
