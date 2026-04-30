import React, { forwardRef } from 'react';
import MapboxMap, { type MapboxMapHandle } from './MapboxMap';

export interface MapEvent {
  id: number | string;
  title: string;
  position: [number, number];
  image?: string;
  category?: string;
  description?: string;
  event_date?: string;
  location_name?: string;
  max_participants?: number;
  current_participants?: number;
  is_featured?: boolean;
}

interface InteractiveMapProps {
  onCreateEvent?: (position: [number, number]) => void;
  onEventClick?: (event: MapEvent) => void;
  events?: MapEvent[];
  isAdmin?: boolean;
  center?: [number, number];
  selectedEventId?: number | string | null;
}

const InteractiveMap = forwardRef<MapboxMapHandle, InteractiveMapProps>(
  ({ onCreateEvent, onEventClick, events = [], isAdmin = false, center = [47.2692, 11.4041], selectedEventId = null }, ref) => {
    return (
      <MapboxMap
        ref={ref}
        center={center}
        zoom={13}
        height="100%"
        onCreateEvent={onCreateEvent}
        onEventClick={onEventClick}
        events={events}
        minZoomForCreate={14}
        isAdmin={isAdmin}
        selectedEventId={selectedEventId}
      />
    );
  }
);

InteractiveMap.displayName = 'InteractiveMap';

export default InteractiveMap;
