import React from 'react';
import { LatLngExpression } from 'leaflet';
import LeafletMap from './LeafletMap';

interface InteractiveMapProps {
  onCreateEvent?: (position: LatLngExpression) => void;
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({ onCreateEvent }) => {
  return (
    <LeafletMap
      center={[52.520008, 13.404954]} // Berlin
      zoom={13}
      height="500px"
      onCreateEvent={onCreateEvent}
      showControls={true}
    />
  );
};

export default InteractiveMap;