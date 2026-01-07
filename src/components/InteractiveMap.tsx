import React from 'react';
import MapboxMap from './MapboxMap';

interface InteractiveMapProps {
  onCreateEvent?: (position: [number, number]) => void;
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({ onCreateEvent }) => {
  return (
    <MapboxMap
      center={[47.2692, 11.4041]} // Innsbruck
      zoom={13}
      height="100%"
      onCreateEvent={onCreateEvent}
      minZoomForCreate={14}
    />
  );
};

export default InteractiveMap;