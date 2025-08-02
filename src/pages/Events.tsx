import { useState } from "react";
import { Search, Music, Dribbble, Smile, Globe, TreePine, Plane, Calendar } from "lucide-react";
import Layout from "@/components/Layout";
import EventCard from "@/components/EventCard";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Events = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("today");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
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
            <input
              type="text"
              placeholder="Event search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-white placeholder-white text-lg focus:outline-none"
            />
            <Search className="text-evendle-orange" size={24} />
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((category) => {
            const Icon = category.icon;
            const isSelected = selectedCategory === category.id;
            
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(isSelected ? "" : category.id)}
                className={`flex-shrink-0 w-20 h-20 flex flex-col items-center justify-center space-y-1 rounded-full transition-colors ${
                  isSelected ? 'bg-evendle-orange' : 'bg-evendle-orange'
                }`}
              >
                <Icon 
                  size={24} 
                  className="text-background" 
                />
                <span className="text-xs text-background font-medium">
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
            <div className="flex space-x-3">
              <Button
                onClick={() => setSelectedFilter("today")}
                variant={selectedFilter === "today" ? "default" : "secondary"}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedFilter === "today" 
                    ? 'bg-evendle-orange hover:bg-evendle-orange-hover text-white' 
                    : 'bg-evendle-search-bg hover:bg-evendle-search-bg/80 text-white'
                }`}
              >
                today
              </Button>
              <Button
                onClick={() => {
                  setSelectedFilter("date");
                  setShowDatePicker(!showDatePicker);
                }}
                variant={selectedFilter === "date" ? "default" : "secondary"}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedFilter === "date" 
                    ? 'bg-evendle-orange hover:bg-evendle-orange-hover text-white' 
                    : 'bg-evendle-search-bg hover:bg-evendle-search-bg/80 text-white'
                }`}
              >
                date
              </Button>
            </div>
          </div>

          {/* Events List */}
          <div className="space-y-4">
            {events
              .filter(event => 
                searchQuery === "" || 
                event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                event.description.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .filter(event => 
                selectedCategory === "" || 
                event.category.toLowerCase() === selectedCategory
              )
              .map((event) => (
                <div key={event.id} className="flex space-x-4 cursor-pointer" onClick={() => handleEventClick(event.id)}>
                  <div className="w-32 h-24 flex-shrink-0 rounded-2xl overflow-hidden">
                    <img 
                      src={event.image} 
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-evendle-orange text-sm font-medium">{event.category}</span>
                      <div className="text-evendle-gray text-sm">{event.date}</div>
                    </div>
                    <h3 className="text-white font-bold text-lg leading-tight">{event.title}</h3>
                    <p className="text-white text-sm">{event.time}</p>
                    <p className="text-evendle-light-gray text-sm line-clamp-2">{event.location}</p>
                    <p className="text-evendle-light-gray text-sm">{event.description}</p>
                  </div>
                </div>
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