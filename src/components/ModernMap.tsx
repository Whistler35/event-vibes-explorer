import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Plus, MapPin } from 'lucide-react';

interface MapEvent {
  id: number;
  title: string;
  position: [number, number]; // [lat, lng]
  category: string;
}

interface ModernMapProps {
  center?: [number, number];
  zoom?: number;
  height?: string;
  events?: MapEvent[];
  onCreateEvent?: (position: [number, number]) => void;
}

const ModernMap: React.FC<ModernMapProps> = ({
  center = [52.520008, 13.404954], // Berlin default
  zoom = 13,
  height = "500px",
  events = [],
  onCreateEvent
}) => {
  const [mapCenter, setMapCenter] = useState(center);
  const [mapZoom, setMapZoom] = useState(zoom);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [longPressPosition, setLongPressPosition] = useState<{ x: number; y: number } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // Sample events for Berlin
  const defaultEvents: MapEvent[] = [
    {
      id: 1,
      title: "NAMASTE FOR ALL",
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

  const convertToPixelPosition = (lat: number, lng: number) => {
    const mapWidth = 400;
    const mapHeight = 400;
    
    // Convert lat/lng to pixel coordinates (simplified)
    const x = ((lng - (mapCenter[1] - 0.02)) / 0.04) * mapWidth;
    const y = (((mapCenter[0] + 0.02) - lat) / 0.04) * mapHeight;
    
    return { x: Math.max(0, Math.min(mapWidth, x)), y: Math.max(0, Math.min(mapHeight, y)) };
  };

  const convertToLatLng = (x: number, y: number): [number, number] => {
    const mapWidth = 400;
    const mapHeight = 400;
    
    const lng = mapCenter[1] - 0.02 + (x / mapWidth) * 0.04;
    const lat = mapCenter[0] + 0.02 - (y / mapHeight) * 0.04;
    
    return [lat, lng];
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = mapRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setLongPressPosition({ x, y });
    setIsLongPressing(false);

    const timer = setTimeout(() => {
      setIsLongPressing(true);
      const [lat, lng] = convertToLatLng(x, y);
      if (onCreateEvent) {
        onCreateEvent([lat, lng]);
      }
    }, 800); // 800ms long press

    setLongPressTimer(timer);
  };

  const handleMouseUp = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setIsLongPressing(false);
    setLongPressPosition(null);
  };

  const handleMouseLeave = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setIsLongPressing(false);
    setLongPressPosition(null);
  };

  const zoomIn = () => {
    setMapZoom(prev => Math.min(18, prev + 1));
  };

  const zoomOut = () => {
    setMapZoom(prev => Math.max(8, prev - 1));
  };

  return (
    <div style={{ height }} className="relative w-full overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
      {/* Map Container */}
      <div 
        ref={mapRef}
        className="absolute inset-0 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{
          background: `
            radial-gradient(circle at 30% 30%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 70% 70%, rgba(168, 85, 247, 0.1) 0%, transparent 50%),
            linear-gradient(135deg, #f0f9ff 0%, #e0e7ff 100%)
          `,
        }}
      >
        {/* Berlin Streets/Areas Background */}
        <svg 
          className="absolute inset-0 w-full h-full opacity-20"
          viewBox="0 0 400 400"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Spree River */}
          <path
            d="M0 200 Q100 180 200 200 T400 180"
            stroke="rgb(59, 130, 246)"
            strokeWidth="6"
            fill="none"
            opacity="0.6"
          />
          
          {/* Main Streets */}
          <g stroke="rgb(148, 163, 184)" strokeWidth="2" opacity="0.4">
            <line x1="0" y1="150" x2="400" y2="150" />
            <line x1="0" y1="250" x2="400" y2="250" />
            <line x1="150" y1="0" x2="150" y2="400" />
            <line x1="250" y1="0" x2="250" y2="400" />
          </g>
          
          {/* Parks */}
          <g fill="rgb(34, 197, 94)" opacity="0.3">
            <circle cx="100" cy="100" r="30" />
            <circle cx="300" cy="300" r="25" />
            <rect x="320" y="80" width="60" height="40" rx="5" />
          </g>
        </svg>

        {/* Event Markers */}
        {allEvents.map((event) => {
          const position = convertToPixelPosition(event.position[0], event.position[1]);
          return (
            <div
              key={event.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-10"
              style={{ left: position.x, top: position.y }}
            >
              {/* Pulsing Ring */}
              <div className="absolute inset-0 rounded-full bg-orange-500 opacity-30 animate-ping w-6 h-6 -translate-x-1/2 -translate-y-1/2"></div>
              
              {/* Main Marker */}
              <div className="relative w-6 h-6 bg-orange-500 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform">
                <MapPin className="w-3 h-3 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              
              {/* Tooltip */}
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                <div className="font-semibold">{event.title}</div>
                <div className="text-xs text-gray-300">{event.category}</div>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
              </div>
            </div>
          );
        })}

        {/* Long Press Indicator */}
        {longPressPosition && (
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
            style={{ left: longPressPosition.x, top: longPressPosition.y }}
          >
            <div className="relative">
              <div className="w-8 h-8 bg-orange-500 rounded-full border-2 border-white shadow-lg animate-pulse">
                <Plus className="w-4 h-4 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-orange-500 animate-ping"></div>
            </div>
          </div>
        )}
      </div>

      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-30">
        <Button
          size="sm"
          variant="secondary"
          className="w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-lg border-0"
          onClick={zoomIn}
        >
          <Plus className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-lg border-0"
          onClick={zoomOut}
        >
          <span className="text-lg font-bold">−</span>
        </Button>
      </div>

      {/* Instruction */}
      <div className="absolute bottom-4 left-4 right-4 z-30">
        <div className="bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm text-center">
          Halte gedrückt um ein Event zu erstellen
        </div>
      </div>
    </div>
  );
};

export default ModernMap;