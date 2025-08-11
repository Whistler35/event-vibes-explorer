import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Filter, Calendar } from "lucide-react";
import Layout from "@/components/Layout";
import EventCard from "@/components/EventCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CityEvents = () => {
  const { city } = useParams();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedDate, setSelectedDate] = useState("all");

  // Mock events data - in real app this would come from API
  const allEvents = [
    {
      id: "8e2ebc17-c1b6-4a3d-8aae-2f49edcdcb0b",
      title: "NAMASTE FOR ALL",
      subtitle: "YOGA-KURS",
      image: "/lovable-uploads/f4be3766-dd26-4f5d-b31a-0fc8dc6465d1.png",
      date: "23.07.2025",
      time: "8 pm",
      location: "Boxhagener Straße 79, 10245 Berlin (Friedrichshain)",
      category: "Outdoor",
      city: "berlin"
    },
    {
      id: "5d16e0d4-2b00-4fda-961a-5385cf4ab5f7",
      title: "CLOSING PARTY",
      subtitle: "VIERNES 27 JUNIO",
      image: "/lovable-uploads/a0af2c47-46da-41a8-8282-d3ba5998ab1a.png",
      date: "27.06.2025",
      time: "10 pm",
      location: "Club Venue, Berlin",
      category: "Party",
      city: "berlin"
    },
    {
      id: "7e1eb947-0d14-4051-9a91-e668161dc830",
      title: "SUMMER BEATS",
      subtitle: "ELECTRONIC MUSIC",
      image: "/lovable-uploads/cd408aae-af95-4d17-a1f0-20dae1b117d4.png",
      date: "25.07.2025",
      time: "9 pm",
      location: "Outdoor Stage, Berlin",
      category: "Music",
      city: "berlin"
    },
    {
      id: "bd090423-1235-4612-aebb-6eb98ac9e93b",
      title: "VIENNA CLASSICAL NIGHT",
      subtitle: "KONZERT",
      image: "/lovable-uploads/b5f1b986-aaa0-4148-933c-cabcd3bb5e00.png",
      date: "28.07.2025",
      time: "7 pm",
      location: "Wiener Staatsoper, Vienna",
      category: "Music",
      city: "vienna"
    },
    {
      id: "ecd82074-8a1e-4809-9a60-0d735b38ebb9",
      title: "KUNST & KULTUR",
      subtitle: "GALLERY OPENING",
      image: "/lovable-uploads/c5cfa817-d10d-4311-808f-e2d1cb7de838.png",
      date: "30.07.2025",
      time: "6 pm",
      location: "Modern Art Gallery, Vienna",
      category: "Art",
      city: "vienna"
    }
  ];

  // Filter events by city and selected filters
  const filteredEvents = allEvents.filter(event => {
    const cityMatch = event.city === city?.toLowerCase();
    const categoryMatch = selectedCategory === "all" || event.category.toLowerCase() === selectedCategory.toLowerCase();
    const dateMatch = selectedDate === "all" || event.date === selectedDate;
    return cityMatch && categoryMatch && dateMatch;
  });

  const categories = ["all", "Outdoor", "Party", "Music", "Art"];
  const dates = ["all", ...Array.from(new Set(allEvents.map(event => event.date)))];

  const handleEventClick = (eventId: string) => {
    navigate(`/event/${eventId}`);
  };

  const cityName = city?.charAt(0).toUpperCase() + city?.slice(1);

  return (
    <Layout>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/')}
            className="text-white hover:bg-evendle-dark-card"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-white text-2xl font-bold">Events in {cityName}</h1>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          <h2 className="text-white text-lg font-semibold flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filter Events
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category Filter */}
            <div>
              <label className="text-evendle-gray text-sm mb-2 block">Category</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="bg-evendle-dark-card border-evendle-gray text-white">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-evendle-dark-card border-evendle-gray z-50">
                  {categories.map((category) => (
                    <SelectItem 
                      key={category} 
                      value={category}
                      className="text-white hover:bg-evendle-orange/20"
                    >
                      {category === "all" ? "All Categories" : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Filter */}
            <div>
              <label className="text-evendle-gray text-sm mb-2 block flex items-center">
                <Calendar className="mr-1 h-4 w-4" />
                Date
              </label>
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger className="bg-evendle-dark-card border-evendle-gray text-white">
                  <SelectValue placeholder="Select date" />
                </SelectTrigger>
                <SelectContent className="bg-evendle-dark-card border-evendle-gray z-50">
                  {dates.map((date) => (
                    <SelectItem 
                      key={date} 
                      value={date}
                      className="text-white hover:bg-evendle-orange/20"
                    >
                      {date === "all" ? "All Dates" : date}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Events List */}
        <div className="space-y-4">
          <h2 className="text-white text-lg font-semibold">
            {filteredEvents.length} Events Found
          </h2>
          
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-evendle-gray text-lg">No events found matching your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEvents.map((event) => (
                <EventCard
                  key={event.id}
                  title={event.title}
                  image={event.image}
                  date={event.date}
                  time={event.time}
                  location={event.location}
                  category={event.category}
                  description={event.subtitle}
                  onClick={() => handleEventClick(event.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CityEvents;