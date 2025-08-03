import React from 'react';
import OpenStreetMap from './OpenStreetMap';

interface InteractiveMapProps {
  onCreateEvent?: (position: [number, number]) => void;
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({ onCreateEvent }) => {
  return (
    <OpenStreetMap
      center={[52.520008, 13.404954]} // Berlin
      zoom={13}
      height="100%"
      onCreateEvent={onCreateEvent}
    />
  );
};

export default InteractiveMap;