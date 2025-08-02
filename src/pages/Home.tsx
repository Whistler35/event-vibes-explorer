import { useState } from "react";
import { Search, ChevronRight } from "lucide-react";
import Layout from "@/components/Layout";
import EventCard from "@/components/EventCard";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const [selectedCity, setSelectedCity] = useState("your city");
  const navigate = useNavigate();

  const cities = ["Vienna", "Berlin"];
  
  const topEvents = [
    {
      id: 1,
      title: "NAMASTE FOR ALL",
      subtitle: "YOGA-KURS",
      image: "/lovable-uploads/f4be3766-dd26-4f5d-b31a-0fc8dc6465d1.png",
      date: "23.07.2025",
      time: "8 pm",
      location: "Boxhagener Straße 79, 10245 Berlin (Friedrichshain)",
      category: "Outdoor"
    },
    {
      id: 2,
      title: "CLOSING PARTY",
      subtitle: "VIERNES 27 JUNIO",
      image: "/lovable-uploads/a0af2c47-46da-41a8-8282-d3ba5998ab1a.png",
      date: "27.06.2025",
      time: "10 pm",
      location: "Club Venue, Berlin",
      category: "Party"
    },
    {
      id: 3,
      title: "SUMMER BEATS",
      subtitle: "ELECTRONIC MUSIC",
      image: "/lovable-uploads/cd408aae-af95-4d17-a1f0-20dae1b117d4.png",
      date: "25.07.2025", 
      time: "9 pm",
      location: "Outdoor Stage, Berlin",
      category: "Music"
    }
  ];

  const handleEventClick = (eventId: number) => {
    navigate(`/event/${eventId}`);
  };

  return (
    <Layout>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="text-evendle-orange text-2xl font-bold">+</div>
            <span className="text-white text-xl font-bold">evendle</span>
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center space-y-6">
          {/* City Search moved to top */}
          <div className="relative">
            <div className="bg-evendle-search-bg rounded-full px-6 py-4 flex items-center justify-between">
              <span className="text-white text-lg">{selectedCity}</span>
              <Search className="text-evendle-orange" size={24} />
            </div>
            
            {/* City Selection Dropdown */}
            <div className="absolute top-full left-0 right-0 mt-2 bg-card rounded-2xl shadow-card z-10">
              {cities.map((city) => (
                <button
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  className="w-full text-left px-6 py-3 text-white hover:bg-evendle-orange/10 first:rounded-t-2xl last:rounded-b-2xl transition-colors"
                >
                  {city}
                </button>
              ))}
            </div>
          </div>

          <h2 className="text-white text-4xl font-bold">your events</h2>

          {/* Hero Image */}
          <div className="relative mx-auto max-w-sm">
            <img 
              src="/lovable-uploads/f4be3766-dd26-4f5d-b31a-0fc8dc6465d1.png" 
              alt="Friends at event"
              className="w-full rounded-2xl"
            />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Home;