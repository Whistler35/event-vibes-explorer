import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { LatLngExpression, Icon, divIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom orange marker using divIcon to avoid import issues
const EventIcon = divIcon({
  className: 'custom-marker',
  html: `<div style="
    background-color: #ff5722;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 3px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

interface MapEvent {
  id: number;
  title: string;
  position: LatLngExpression;
  category: string;
}

interface LeafletMapProps {
  center?: LatLngExpression;
  zoom?: number;
  height?: string;
  events?: MapEvent[];
  onCreateEvent?: (position: LatLngExpression) => void;
  showControls?: boolean;
}

// Component to handle map clicks
const MapEventHandler: React.FC<{ onCreateEvent?: (position: LatLngExpression) => void }> = ({ onCreateEvent }) => {
  useMapEvents({
    click: (e) => {
      if (onCreateEvent) {
        onCreateEvent([e.latlng.lat, e.latlng.lng]);
      }
    },
  });
  return null;
};

const LeafletMap: React.FC<LeafletMapProps> = ({ 
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

  const handleCreateEvent = (position: LatLngExpression) => {
    if (onCreateEvent) {
      onCreateEvent(position);
    } else {
      // Add a new event marker
      const newEvent: MapEvent = {
        id: Date.now(),
        title: "Neues Event",
        position,
        category: "Custom"
      };
      setMapEvents([...mapEvents, newEvent]);
    }
  };

  return (
    <div style={{ height }} className="w-full rounded-lg overflow-hidden border border-evendle-gray">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={showControls}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {onCreateEvent ? <MapEventHandler onCreateEvent={handleCreateEvent} /> : null}
        
        {allEvents.map((event) => (
          <Marker
            key={event.id}
            position={event.position}
            icon={EventIcon}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-sm">{event.title}</h3>
                <p className="text-xs text-gray-600">{event.category}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default LeafletMap;