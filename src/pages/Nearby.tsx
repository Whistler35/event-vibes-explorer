import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";

const Nearby = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="relative h-screen">
        {/* Header */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="text-evendle-orange text-2xl font-bold">+</div>
            <span className="text-white text-xl font-bold">evendle</span>
          </div>
        </div>

        {/* Map */}
        <div className="absolute inset-0 bg-gradient-to-br from-evendle-orange/10 to-evendle-dark-card">
          <img 
            src="/lovable-uploads/69da9fd1-98bf-4322-8993-cc5e88b359a7.png" 
            alt="Map with events"
            className="w-full h-full object-cover"
          />
          
          {/* Event Markers */}
          <div className="absolute top-32 right-8">
            <div 
              className="bg-card rounded-xl p-2 cursor-pointer shadow-card"
              onClick={() => navigate('/event/2')}
            >
              <img 
                src="/lovable-uploads/a0af2c47-46da-41a8-8282-d3ba5998ab1a.png" 
                alt="Closing party"
                className="w-20 h-16 rounded-lg object-cover"
              />
              <div className="mt-1">
                <p className="text-white text-xs font-bold">23.07.2025 8 pm</p>
                <p className="text-evendle-gray text-xs">Party Closing : Last dance event</p>
              </div>
            </div>
          </div>

          <div className="absolute bottom-80 right-12">
            <div 
              className="bg-card rounded-xl p-2 cursor-pointer shadow-card"
              onClick={() => navigate('/event/3')}
            >
              <img 
                src="/lovable-uploads/cd408aae-af95-4d17-a1f0-20dae1b117d4.png" 
                alt="Electronic festival"
                className="w-20 h-16 rounded-lg object-cover"
              />
              <div className="mt-1">
                <p className="text-white text-xs font-bold">23.07.2025 8 pm</p>
                <p className="text-evendle-gray text-xs">Party Closing : Last dance event</p>
              </div>
            </div>
          </div>

          <div className="absolute bottom-40 left-8">
            <div 
              className="bg-card rounded-xl p-2 cursor-pointer shadow-card"
              onClick={() => navigate('/event/1')}
            >
              <img 
                src="/lovable-uploads/f4be3766-dd26-4f5d-b31a-0fc8dc6465d1.png" 
                alt="Yoga event"
                className="w-20 h-16 rounded-lg object-cover"
              />
              <div className="mt-1">
                <p className="text-white text-xs font-bold">23.07.2025 8 pm</p>
                <p className="text-evendle-gray text-xs">Party Closing : Last dance event</p>
              </div>
            </div>
          </div>
        </div>

        {/* Create Evendle Button */}
        <div className="absolute bottom-32 left-4 right-4 z-10">
          <Button 
            className="w-full bg-evendle-orange hover:bg-evendle-orange-hover text-white py-4 rounded-2xl font-medium text-lg"
            onClick={() => {/* Handle create event */}}
          >
            create evendle
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default Nearby;