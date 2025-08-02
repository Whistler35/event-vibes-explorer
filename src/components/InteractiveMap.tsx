import React from 'react';
import SimpleMap from './SimpleMap';

interface InteractiveMapProps {
  onCreateEvent?: (position: [number, number]) => void;
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({ onCreateEvent }) => {
  return (
    <SimpleMap
      center={[52.520008, 13.404954]} // Berlin
      zoom={13}
      height="500px"
      onCreateEvent={onCreateEvent}
      showControls={true}
    />
  );
};

export default InteractiveMap;