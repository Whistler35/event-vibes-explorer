import { Search } from "lucide-react";
import ReelsFeed from "@/components/ReelsFeed";
import Layout from "@/components/Layout";
import EventCard from "@/components/EventCard";
import { useNavigate } from "react-router-dom";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Home = () => {
  const navigate = useNavigate();

  const { data: featuredEvents } = useQuery({
    queryKey: ['featured-events-home'],
    queryFn: async () => {
      const { data } = await supabase
        .from('events')
        .select('id, title, image_url, category, event_date, location_name')
        .eq('is_featured', true)
        .eq('approval_status', 'approved')
        .order('featured_order', { ascending: true })
        .order('event_date', { ascending: true })
        .limit(10);
      return data || [];
    },
    staleTime: 60_000,
  });

  const categoryLabels: Record<string, string> = {
    music: 'Musik', sports: 'Sport', culture: 'Kultur', food: 'Food',
    nightlife: 'Nightlife', outdoor: 'Outdoor', community: 'Community',
    workshop: 'Workshop', other: 'Sonstiges',
  };

  const handleEventClick = (eventId: string) => {
    navigate(`/event/${eventId}`);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        {/* Header with Logo */}
        <div className="p-4 pt-8">
          <div className="flex items-center space-x-2">
            <span className="text-primary text-2xl font-bold">+</span>
            <span className="text-foreground text-xl font-bold">evendle</span>
          </div>
        </div>

        {/* Hero Section */}
        <div className="px-4 space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-foreground text-5xl font-bold leading-tight">your city</h1>
            <h2 className="text-foreground text-5xl font-bold leading-tight">your events</h2>
          </div>

          <div className="flex justify-center">
            <div className="w-80 h-96 rounded-3xl overflow-hidden">
              <img
                src="/lovable-uploads/e8a01b75-41cf-4188-95f0-b5c0bc64ebab.png"
                alt="Friends at event"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="max-w-md mx-auto">
            <button
              onClick={() => navigate('/city/innsbruck')}
              className="w-full bg-muted/30 border-none rounded-full h-14 text-foreground text-center text-lg flex items-center justify-center gap-2 hover:bg-muted/40 transition-colors"
            >
              <span>Innsbruck</span>
              <Search className="text-primary h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Top Events Section */}
        <div className="px-4 mt-12 pb-8">
          <h3 className="text-foreground text-2xl font-bold mb-6"> top events this week</h3>

          {featuredEvents && featuredEvents.length > 0 ? (
            <Carousel className="w-full">
              <CarouselContent className="-ml-2 md:-ml-4">
                {featuredEvents.map((event) => {
                  const eventDate = new Date(event.event_date);
                  const formattedDate = eventDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
                  const formattedTime = eventDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <CarouselItem key={event.id} className="pl-2 md:pl-4 basis-4/5 md:basis-1/2 lg:basis-1/3">
                      <EventCard
                        title={event.title}
                        image={event.image_url || ""}
                        date={formattedDate}
                        time={formattedTime}
                        location={event.location_name}
                        category={categoryLabels[event.category || ''] || event.category || ''}
                        onClick={() => handleEventClick(event.id)}
                      />
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
              <CarouselPrevious className="hidden md:flex" />
              <CarouselNext className="hidden md:flex" />
            </Carousel>
          ) : (
            <p className="text-muted-foreground text-sm">Keine Top Events aktuell.</p>
          )}
        </div>

        {/* Reels Feed */}
        <div className="px-4 pb-8">
          <ReelsFeed />
        </div>
      </div>
    </Layout>
  );
};

export default Home;
