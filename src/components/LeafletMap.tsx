import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { LatLngExpression, Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in React-Leaflet
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadowUrl from 'leaflet/dist/images/marker-shadow.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';

const DefaultIcon = new Icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl: iconShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom orange marker for events
const EventIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
      <path d="M12.5 0C5.6 0 0 5.6 0 12.5C0 19.9 12.5 41 12.5 41S25 19.9 25 12.5C25 5.6 19.4 0 12.5 0Z" fill="#ff5722"/>
      <circle cx="12.5" cy="12.5" r="6" fill="white"/>
    </svg>
  `),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
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
        
        {onCreateEvent && <MapEventHandler onCreateEvent={handleCreateEvent} />}
        
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