import { useState } from "react";
import { Search, ChevronRight } from "lucide-react";
import Layout from "@/components/Layout";
import EventCard from "@/components/EventCard";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
const Home = () => {
  const [searchQuery, setSearchQuery] = useState("");
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
  return <Layout>
      <div className="p-4 space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input type="text" placeholder="Your City" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10 bg-card border-input rounded-2xl h-12" />
        </div>

        {/* Hero Section */}
        
      </div>
    </Layout>;
};
export default Home;