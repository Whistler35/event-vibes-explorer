import React from 'react';
import GoogleMapComponent from './GoogleMap';

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
    <GoogleMapComponent
      center={{ lat: 52.520008, lng: 13.404954 }} // Berlin
      zoom={13}
      height="500px"
      onCreateEvent={handleCreateEvent}
      showControls={true}
    />
  );
};

export default InteractiveMap;