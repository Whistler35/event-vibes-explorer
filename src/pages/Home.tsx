import { useState } from "react";
import { Search } from "lucide-react";
import Layout from "@/components/Layout";
import EventCard from "@/components/EventCard";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

const Home = () => {
  const [selectedCity, setSelectedCity] = useState("");
  const navigate = useNavigate();
  
  const topEvents = [{
    id: 1,
    title: "NAMASTE FOR ALL",
    subtitle: "YOGA-KURS",
    image: "/lovable-uploads/f4be3766-dd26-4f5d-b31a-0fc8dc6465d1.png",
    date: "23.07.2025",
    time: "8 pm",
    location: "Boxhagener Straße 79, 10245 Berlin (Friedrichshain)",
    category: "Outdoor"
  }, {
    id: 2,
    title: "CLOSING PARTY",
    subtitle: "VIERNES 27 JUNIO",
    image: "/lovable-uploads/a0af2c47-46da-41a8-8282-d3ba5998ab1a.png",
    date: "27.06.2025",
    time: "10 pm",
    location: "Club Venue, Berlin",
    category: "Party"
  }, {
    id: 3,
    title: "SUMMER BEATS",
    subtitle: "ELECTRONIC MUSIC",
    image: "/lovable-uploads/cd408aae-af95-4d17-a1f0-20dae1b117d4.png",
    date: "25.07.2025",
    time: "9 pm",
    location: "Outdoor Stage, Berlin",
    category: "Music"
  }];

  const handleEventClick = (eventId: number) => {
    navigate(`/event/${eventId}`);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {/* Header with Logo */}
        <div className="p-4 pt-8">
          <div className="flex items-center space-x-2">
            <span className="text-evendle-orange text-2xl font-bold">+</span>
            <span className="text-white text-xl font-bold">evendle</span>
          </div>
        </div>

        {/* Hero Section */}
        <div className="px-4 space-y-6">
          {/* Hero Text */}
          <div className="text-center space-y-2">
            <h1 className="text-white text-5xl font-bold leading-tight">
              your city
            </h1>
            <h2 className="text-white text-5xl font-bold leading-tight">
              your events
            </h2>
          </div>

          {/* Hero Image */}
          <div className="flex justify-center">
            <div className="w-80 h-96 rounded-3xl overflow-hidden">
              <img 
                src="/lovable-uploads/e8a01b75-41cf-4188-95f0-b5c0bc64ebab.png" 
                alt="Friends at event"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* City Selection */}
          <div className="max-w-md mx-auto">
            <div className="relative">
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="bg-evendle-light-gray/30 border-none rounded-full h-14 text-white text-center text-lg">
                  <SelectValue placeholder="your city" className="text-white/70" />
                </SelectTrigger>
                <SelectContent className="bg-evendle-dark-card border-evendle-gray z-50">
                  <SelectItem value="berlin" className="text-white hover:bg-evendle-orange/20">Berlin</SelectItem>
                  <SelectItem value="vienna" className="text-white hover:bg-evendle-orange/20">Vienna</SelectItem>
                </SelectContent>
              </Select>
              <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 text-evendle-orange h-6 w-6 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Top Events Section */}
        <div className="px-4 mt-12 pb-8">
          <h3 className="text-white text-2xl font-bold mb-6">top events this week</h3>
          
          <Carousel className="w-full">
            <CarouselContent className="-ml-2 md:-ml-4">
              {topEvents.map((event) => (
                <CarouselItem key={event.id} className="pl-2 md:pl-4 basis-4/5 md:basis-1/2 lg:basis-1/3">
                  <EventCard
                    title={event.title}
                    image={event.image}
                    date={event.date}
                    time={event.time}
                    location={event.location}
                    category={event.category}
                    onClick={() => handleEventClick(event.id)}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
        </div>
      </div>
    </Layout>
  );
};
export default Home;