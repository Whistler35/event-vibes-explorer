import React from 'react';
import GoogleMap from './GoogleMap';

interface InteractiveMapProps {
  onCreateEvent?: (position: [number, number]) => void;
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({ onCreateEvent }) => {
  // Convert callback format from [lat, lng] to {lat, lng} for Google Maps
  const handleCreateEvent = (position: { lat: number; lng: number }) => {
    if (onCreateEvent) {
      onCreateEvent([position.lat, position.lng]);
    }
  };

  return (
    <GoogleMap
      center={{ lat: 52.520008, lng: 13.404954 }} // Berlin
      zoom={13}
      height="100%"
      onCreateEvent={handleCreateEvent}
    />
  );
};

export default InteractiveMap;