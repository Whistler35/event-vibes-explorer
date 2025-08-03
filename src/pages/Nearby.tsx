import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import InteractiveMap from "@/components/InteractiveMap";

const Nearby = () => {
  const navigate = useNavigate();

  const handleCreateEvent = (coordinates?: [number, number]) => {
    // TODO: Open create event dialog with coordinates
    if (coordinates) {
      console.log('Create event at coordinates:', coordinates);
      alert(`Event erstellen bei: ${coordinates[1].toFixed(4)}, ${coordinates[0].toFixed(4)}`);
    } else {
      // Default location for button click
      alert('Event erstellen - wählen Sie einen Ort auf der Karte');
    }
  };

  return (
    <Layout>
      <div className="relative h-[calc(100vh-80px)]">
        {/* Header */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="text-evendle-orange text-2xl font-bold">+</div>
            <span className="text-white text-xl font-bold">evendle</span>
          </div>
        </div>

        {/* Interactive Map */}
        <div className="absolute inset-0">
          <InteractiveMap onCreateEvent={handleCreateEvent} />
        </div>

        {/* Create Evendle Button */}
        <div className="absolute bottom-32 left-4 right-4 z-10">
          <Button 
            className="w-full bg-evendle-orange hover:bg-evendle-orange-hover text-white py-4 rounded-2xl font-medium text-lg"
            onClick={() => handleCreateEvent()}
          >
            create evendle
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default Nearby;