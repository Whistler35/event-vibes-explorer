import React from 'react';
import ModernMap from './ModernMap';

interface InteractiveMapProps {
  onCreateEvent?: (position: [number, number]) => void;
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({ onCreateEvent }) => {
  return (
    <ModernMap
      center={[52.520008, 13.404954]} // Berlin
      zoom={13}
      height="100vh"
      onCreateEvent={onCreateEvent}
    />
  );
};

export default InteractiveMap;