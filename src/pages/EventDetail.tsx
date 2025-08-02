import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Users } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Mock event data - in real app would fetch based on id
  const event = {
    id: 1,
    title: "NAMASTE FOR ALL",
    subtitle: "YOGA-KURS",
    image: "/lovable-uploads/f4be3766-dd26-4f5d-b31a-0fc8dc6465d1.png",
    date: "23.07.2025",
    time: "8 pm",
    location: "Boxhagener Straße 79, 10245 Berlin (Friedrichshain)",
    category: "Outdoor",
    description: "Take a deep breath and join us for a relaxing outdoor yoga session under the open sky! Whether you're a total beginner or a seasoned yogi, everyone is welcome. We'll meet at Volkspark Friedrichshain, near the big fountain, and flow together as the sun sets over Berlin.",
    mapImage: "/lovable-uploads/69da9fd1-98bf-4322-8993-cc5e88b359a7.png"
  };

  return (
    <Layout showBottomNav={true}>
      <div className="relative">
        {/* Header with Back Button */}
        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full bg-black/20 backdrop-blur-sm"
          >
            <ArrowLeft className="text-evendle-orange" size={24} />
            <span className="text-white ml-2">evendle</span>
          </button>
        </div>

        {/* Event Image */}
        <div className="aspect-video bg-gradient-to-br from-evendle-orange/20 to-evendle-dark-card overflow-hidden">
          <img 
            src={event.image} 
            alt={event.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Event Info */}
        <div className="p-4 space-y-6">
          {/* Event Details */}
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <span className="text-evendle-orange text-sm font-medium">{event.category}</span>
              <div className="flex items-center space-x-2">
                <span className="text-evendle-gray text-sm">{event.date}</span>
                <div className="w-16 h-12 bg-card rounded-lg overflow-hidden">
                  <img 
                    src={event.mapImage} 
                    alt="Map location"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
            
            <h1 className="text-white text-3xl font-bold">{event.title}</h1>
            <p className="text-evendle-gray text-lg">{event.time}</p>
            <p className="text-evendle-light-gray">{event.location}</p>
          </div>

          {/* Description */}
          <div className="space-y-4">
            <h2 className="text-white text-xl font-bold">Sunset Yoga in the Park – Berlin Edition</h2>
            <p className="text-evendle-light-gray leading-relaxed">
              {event.description}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4 pt-4">
            <Button 
              className="flex-1 bg-evendle-orange hover:bg-evendle-orange-hover text-white py-4 rounded-2xl font-medium"
              onClick={() => {/* Add calendar functionality */}}
            >
              <Calendar className="mr-2" size={20} />
              Add to calendar
            </Button>
            <Button 
              className="flex-1 bg-evendle-orange hover:bg-evendle-orange-hover text-white py-4 rounded-2xl font-medium"
              onClick={() => navigate(`/event/${id}/hangouts`)}
            >
              <Users className="mr-2" size={20} />
              look for hang outs
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default EventDetail;