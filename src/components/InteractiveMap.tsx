import React from 'react';
import SimpleGoogleMap from './SimpleGoogleMap';

interface InteractiveMapProps {
  onCreateEvent?: (position: [number, number]) => void;
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({ onCreateEvent }) => {
  const handleCreateEvent = (position: { lat: number; lng: number }) => {
    if (onCreateEvent) {
      onCreateEvent([position.lat, position.lng]);
    }
  };

  return (
    <SimpleGoogleMap
      center={{ lat: 52.520008, lng: 13.404954 }} // Berlin
      zoom={13}
      height="100vh"
      onCreateEvent={handleCreateEvent}
    />
  );
};

export default InteractiveMap;