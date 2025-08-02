import React, { useState } from 'react';

interface MapEvent {
  id: number;
  title: string;
  position: [number, number]; // [lat, lng]
  category: string;
}

interface SimpleMapProps {
  center?: [number, number];
  zoom?: number;
  height?: string;
  events?: MapEvent[];
  onCreateEvent?: (position: [number, number]) => void;
  showControls?: boolean;
}

const SimpleMap: React.FC<SimpleMapProps> = ({ 
  center = [52.520008, 13.404954], // Berlin default
  zoom = 13,
  height = "400px",
  events = [],
  onCreateEvent,
  showControls = true
}) => {
  const [mapEvents, setMapEvents] = useState<MapEvent[]>(events);

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

  const allEvents = mapEvents.length > 0 ? mapEvents : defaultEvents;

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onCreateEvent) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Simple coordinate conversion (this is a mock - in real implementation you'd convert screen to lat/lng)
      const lat = center[0] + (y - rect.height / 2) * 0.001;
      const lng = center[1] + (x - rect.width / 2) * 0.001;
      
      onCreateEvent([lat, lng]);
    }
  };

  const getMarkerPosition = (eventPos: [number, number]) => {
    // Convert lat/lng to pixel positions (mock implementation)
    const centerLat = center[0];
    const centerLng = center[1];
    
    const x = 50 + ((eventPos[1] - centerLng) * 10000) + '%';
    const y = 50 + ((centerLat - eventPos[0]) * 10000) + '%';
    
    return { left: x, top: y };
  };

  return (
    <div 
      style={{ height }} 
      className="w-full rounded-lg overflow-hidden border border-evendle-gray relative bg-gradient-to-br from-evendle-dark-card to-evendle-gray cursor-pointer"
      onClick={handleMapClick}
    >
      {/* Map Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900">
        {/* Grid pattern to simulate map */}
        <div className="absolute inset-0 opacity-20">
          <div className="h-full w-full" style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }}></div>
        </div>
        
        {/* Berlin label */}
        <div className="absolute top-4 left-4 text-white font-bold text-lg bg-black/50 px-3 py-1 rounded">
          Berlin
        </div>
        
        {/* Zoom controls */}
        {showControls && (
          <div className="absolute top-4 right-4 flex flex-col space-y-2">
            <button className="bg-white/20 text-white w-8 h-8 rounded flex items-center justify-center font-bold hover:bg-white/30">
              +
            </button>
            <button className="bg-white/20 text-white w-8 h-8 rounded flex items-center justify-center font-bold hover:bg-white/30">
              -
            </button>
          </div>
        )}
      </div>

      {/* Event Markers */}
      {allEvents.map((event) => {
        const position = getMarkerPosition(event.position);
        return (
          <div
            key={event.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
            style={position}
          >
            {/* Event Marker */}
            <div className="relative group">
              <div className="w-6 h-6 bg-evendle-orange rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform">
                <div className="w-full h-full rounded-full bg-evendle-orange animate-pulse"></div>
              </div>
              
              {/* Tooltip */}
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-20">
                <div className="font-bold">{event.title}</div>
                <div className="text-gray-300">{event.category}</div>
                {/* Arrow */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/80"></div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 text-white/70 text-sm bg-black/50 px-3 py-2 rounded">
        🗺️ Klicken Sie auf die Karte, um ein Event zu erstellen
      </div>
    </div>
  );
};

export default SimpleMap;