import React from 'react';
import MapboxMap from './MapboxMap';

interface MapEvent {
  id: number | string;
  title: string;
  position: [number, number];
  image?: string;
}

interface InteractiveMapProps {
  onCreateEvent?: (position: [number, number]) => void;
  events?: MapEvent[];
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({ onCreateEvent, events = [] }) => {
  return (
    <MapboxMap
      center={[47.2692, 11.4041]} // Innsbruck
      zoom={13}
      height="100%"
      onCreateEvent={onCreateEvent}
      events={events}
      minZoomForCreate={14}
    />
  );
};

export default InteractiveMap;