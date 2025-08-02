import { useState } from "react";
import { Search, Music, Dribbble, Smile, Globe, TreePine, Plane } from "lucide-react";
import Layout from "@/components/Layout";
import EventCard from "@/components/EventCard";
import { useNavigate } from "react-router-dom";

const Events = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("today");
  const [selectedCategory, setSelectedCategory] = useState("");
  const navigate = useNavigate();

  const categories = [
    { id: "music", label: "music", icon: Music },
    { id: "sports", label: "sports", icon: Dribbble },
    { id: "comedy", label: "comedy", icon: Smile },
    { id: "party", label: "party", icon: Globe },
    { id: "outdoor", label: "outdoor", icon: TreePine },
    { id: "travel", label: "travel", icon: Plane },
  ];

  const events = [
    {
      id: 1,
      title: "NAMASTE FOR ALL",
      subtitle: "YOGA-KURS",
      image: "/lovable-uploads/f4be3766-dd26-4f5d-b31a-0fc8dc6465d1.png",
      date: "23.07.2025",
      time: "8 pm",
      location: "Boxhagener Straße 79, 10245 Berlin (Friedrichshain)",
      category: "Outdoor",
      description: "Sunset Yoga in the Park – Berlin Edition"
    },
    {
      id: 2,
      title: "CLOSING",
      subtitle: "VIERNES 27 JUNIO",
      image: "/lovable-uploads/a0af2c47-46da-41a8-8282-d3ba5998ab1a.png",
      date: "23.07.2025",
      time: "8 pm",
      location: "Boxhagener Straße 79, 10245 Berlin (Friedrichshain)",
      category: "Outdoor",
      description: "Party Closing : Last dance event"
    },
    {
      id: 3,
      title: "SUMMER FESTIVAL",
      subtitle: "ELECTRONIC MUSIC",
      image: "/lovable-uploads/cd408aae-af95-4d17-a1f0-20dae1b117d4.png",
      date: "23.07.2025",
      time: "8 pm", 
      location: "Boxhagener Straße 79, 10245 Berlin (Friedrichshain)",
      category: "Outdoor",
      description: "Amazing electronic music festival"
    },
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

        {/* Search Bar */}
        <div className="relative">
          <div className="bg-evendle-search-bg rounded-full px-6 py-4 flex items-center space-x-3">
            <Search className="text-evendle-orange" size={20} />
            <input
              type="text"
              placeholder="Event search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-white placeholder-white text-lg focus:outline-none"
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((category) => {
            const Icon = category.icon;
            const isSelected = selectedCategory === category.id;
            
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(isSelected ? "" : category.id)}
                className={`flex-shrink-0 flex flex-col items-center space-y-2 p-3 rounded-2xl transition-colors ${
                  isSelected ? 'bg-evendle-orange' : 'bg-transparent border border-evendle-orange'
                }`}
              >
                <Icon 
                  size={24} 
                  className={isSelected ? 'text-white' : 'text-evendle-orange'} 
                />
                <span className={`text-sm ${isSelected ? 'text-white' : 'text-evendle-orange'}`}>
                  {category.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter Buttons */}
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <h3 className="text-white text-2xl font-bold">top events</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedFilter("today")}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedFilter === "today" 
                    ? 'bg-evendle-orange text-white' 
                    : 'bg-evendle-gray text-white'
                }`}
              >
                today
              </button>
              <button
                onClick={() => setSelectedFilter("date")}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedFilter === "date" 
                    ? 'bg-evendle-orange text-white' 
                    : 'bg-evendle-gray text-white'
                }`}
              >
                date
              </button>
            </div>
          </div>

          {/* Events List */}
          <div className="space-y-4">
            {events.map((event) => (
              <EventCard
                key={event.id}
                title={event.title}
                image={event.image}
                date={event.date}
                time={event.time}
                location={event.location}
                category={event.category}
                description={event.description}
                onClick={() => handleEventClick(event.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </Layout>
  );
};

export default Events;