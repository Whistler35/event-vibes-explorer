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
    // Convert lat/lng to pixel positions - simplified but visible
    const centerLat = center[0];
    const centerLng = center[1];
    
    // Scale the differences to fit within the map (much smaller multiplier)
    const xOffset = (eventPos[1] - centerLng) * 2000; // Reduced from 10000
    const yOffset = (centerLat - eventPos[0]) * 2000; // Reduced from 10000
    
    // Clamp to stay within map bounds
    const x = Math.min(Math.max(50 + xOffset, 10), 90);
    const y = Math.min(Math.max(50 + yOffset, 10), 90);
    
    return { left: x + '%', top: y + '%' };
  };

  return (
    <div 
      style={{ height }} 
      className="w-full rounded-lg overflow-hidden border border-evendle-gray relative bg-gray-100 cursor-pointer"
      onClick={handleMapClick}
    >
      {/* Map Background - realistic city layout */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-100 to-blue-50">
        
        {/* River Spree */}
        <div className="absolute top-1/3 left-0 w-full h-8 bg-blue-300 transform rotate-12 opacity-60"></div>
        <div className="absolute top-1/2 left-1/4 w-3/4 h-6 bg-blue-300 transform -rotate-6 opacity-60"></div>
        
        {/* Parks (green areas) */}
        <div className="absolute top-1/4 left-1/4 w-20 h-16 bg-green-300 rounded-lg opacity-40"></div>
        <div className="absolute bottom-1/4 right-1/4 w-24 h-20 bg-green-300 rounded-lg opacity-40"></div>
        <div className="absolute top-3/4 left-1/6 w-16 h-12 bg-green-300 rounded-lg opacity-40"></div>
        
        {/* Main streets (thick) */}
        <div className="absolute w-full h-1 bg-gray-600 top-1/4"></div>
        <div className="absolute w-full h-1 bg-gray-600 top-1/2"></div>
        <div className="absolute w-full h-1 bg-gray-600 top-3/4"></div>
        <div className="absolute h-full w-1 bg-gray-600 left-1/4"></div>
        <div className="absolute h-full w-1 bg-gray-600 left-1/2"></div>
        <div className="absolute h-full w-1 bg-gray-600 left-3/4"></div>
        
        {/* Smaller streets */}
        <div className="absolute w-full h-px bg-gray-500 top-1/8"></div>
        <div className="absolute w-full h-px bg-gray-500 top-3/8"></div>
        <div className="absolute w-full h-px bg-gray-500 top-5/8"></div>
        <div className="absolute w-full h-px bg-gray-500 top-7/8"></div>
        <div className="absolute h-full w-px bg-gray-500 left-1/8"></div>
        <div className="absolute h-full w-px bg-gray-500 left-3/8"></div>
        <div className="absolute h-full w-px bg-gray-500 left-5/8"></div>
        <div className="absolute h-full w-px bg-gray-500 left-7/8"></div>
        
        {/* Neighborhoods/Buildings */}
        <div className="absolute top-10 left-10 w-12 h-8 bg-gray-200 opacity-60 text-xs text-gray-600 flex items-center justify-center font-bold">Mitte</div>
        <div className="absolute top-16 right-16 w-16 h-6 bg-gray-200 opacity-60 text-xs text-gray-600 flex items-center justify-center font-bold">Kreuzberg</div>
        <div className="absolute bottom-20 left-20 w-14 h-6 bg-gray-200 opacity-60 text-xs text-gray-600 flex items-center justify-center font-bold">Neukölln</div>
        
        {/* Berlin label */}
        <div className="absolute top-4 left-4 text-white font-bold text-lg bg-evendle-orange px-3 py-1 rounded shadow-lg">
          📍 Berlin
        </div>
        
        {/* Zoom controls */}
        {showControls && (
          <div className="absolute top-4 right-4 flex flex-col space-y-2">
            <button className="bg-evendle-orange text-white w-10 h-10 rounded-lg flex items-center justify-center font-bold hover:bg-evendle-orange-hover shadow-lg text-lg">
              +
            </button>
            <button className="bg-evendle-orange text-white w-10 h-10 rounded-lg flex items-center justify-center font-bold hover:bg-evendle-orange-hover shadow-lg text-lg">
              −
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
            {/* Event Marker - much more visible */}
            <div className="relative group">
              <div className="w-8 h-8 bg-evendle-orange rounded-full border-3 border-white shadow-xl cursor-pointer hover:scale-125 transition-all duration-200 flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-full"></div>
              </div>
              
              {/* Pulsing effect */}
              <div className="absolute inset-0 w-8 h-8 bg-evendle-orange rounded-full animate-ping opacity-75"></div>
              
              {/* Tooltip */}
              <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-evendle-dark-card text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap z-20 shadow-xl border border-evendle-gray">
                <div className="font-bold">{event.title}</div>
                <div className="text-evendle-light-gray">{event.category}</div>
                {/* Arrow */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-evendle-dark-card"></div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 text-evendle-dark-card text-sm bg-white/90 px-3 py-2 rounded-lg shadow-lg border">
        🗺️ Klicken Sie auf die Karte, um ein Event zu erstellen
      </div>
    </div>
  );
};

export default SimpleMap;