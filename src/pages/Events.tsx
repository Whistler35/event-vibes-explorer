import { useState } from "react";
import { Search } from "lucide-react";
import Layout from "@/components/Layout";
import CategoryFilter from "@/components/CategoryFilter";
import ReelsFeed from "@/components/ReelsFeed";
import { useSearchEvents, type EventCategory } from "@/hooks/useSearchEvents";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Events = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("today");
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | ''>('');
  const navigate = useNavigate();

  const today = new Date().toISOString().split('T')[0];

  const { data: searchResult, isLoading } = useSearchEvents({
    category: selectedCategory || undefined,
    text: searchQuery || undefined,
    date_from: selectedFilter === 'today' ? today : undefined,
    date_to: selectedFilter === 'today' ? today + 'T23:59:59' : undefined,
    limit: 50,
  });

  // Fetch featured/top events
  const { data: featuredEvents } = useQuery({
    queryKey: ['featured-events'],
    queryFn: async () => {
      const { data } = await supabase
        .from('events')
        .select('id, title, image_url, category, event_date, location_name, source')
        .eq('is_featured', true)
        .eq('approval_status', 'approved')
        .order('featured_order', { ascending: true })
        .order('event_date', { ascending: true })
        .limit(10);
      return data || [];
    },
    staleTime: 60_000,
  });

  const events = searchResult?.data || [];

  const handleEventClick = (eventId: string) => {
    navigate(`/event/${eventId}`);
  };

  const categoryLabels: Record<string, string> = {
    music: 'Musik', sports: 'Sport', culture: 'Kultur', food: 'Food',
    nightlife: 'Nightlife', outdoor: 'Outdoor', community: 'Community',
    workshop: 'Workshop', other: 'Sonstiges',
  };

  return (
    <Layout>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img src={evendleLogo} alt="Evendle" className="w-8 h-8 rounded-md" />
            <span className="text-foreground text-xl font-bold">evendle</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <div className="bg-muted rounded-full px-6 py-4 flex items-center space-x-3">
            <input
              type="text"
              placeholder="Event suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-foreground placeholder-muted-foreground text-lg focus:outline-none"
            />
            <Search className="text-primary" size={24} />
          </div>
        </div>

        {/* Category Filters */}
        <CategoryFilter selected={selectedCategory} onChange={setSelectedCategory} />

        {/* Top Events Section */}
        {featuredEvents && featuredEvents.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-foreground text-2xl font-bold">⭐ top events</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
              {featuredEvents.map((event: any) => {
                const eventDate = new Date(event.event_date);
                const formattedDate = eventDate.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
                return (
                  <div
                    key={event.id}
                    className="min-w-[200px] max-w-[200px] bg-card rounded-2xl overflow-hidden border border-primary/20 cursor-pointer shrink-0"
                    onClick={() => handleEventClick(event.id)}
                  >
                    <div className="h-28 bg-muted">
                      {event.image_url ? (
                        <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">🔥</div>
                      )}
                    </div>
                    <div className="p-3 space-y-1">
                      <h4 className="text-foreground font-bold text-sm truncate">{event.title}</h4>
                      <p className="text-muted-foreground text-xs">{formattedDate}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Reels Feed */}
        <ReelsFeed />

        {/* Filter Buttons */}
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <h3 className="text-foreground text-2xl font-bold">alle events</h3>
            <div className="flex space-x-3">
              <Button
                onClick={() => setSelectedFilter("today")}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedFilter === "today"
                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 text-foreground'
                }`}
              >
                today
              </Button>
              <Button
                onClick={() => setSelectedFilter("all")}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedFilter === "all"
                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 text-foreground'
                }`}
              >
                alle
              </Button>
            </div>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="text-center py-8 text-muted-foreground">Events laden...</div>
          )}

          {/* Events List */}
          <div className="space-y-4">
            {events.map((event) => {
              const eventDate = new Date(event.event_date);
              const formattedDate = eventDate.toLocaleDateString('de-DE');
              const formattedTime = eventDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

              return (
                <div key={event.id} className="flex space-x-4 cursor-pointer" onClick={() => handleEventClick(event.id)}>
                  <div className="w-32 h-24 flex-shrink-0 rounded-2xl overflow-hidden bg-muted">
                    {event.image_url ? (
                      <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-2xl">
                        📅
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {event.category && (
                          <Badge variant="secondary" className="bg-primary/20 text-primary border-0 text-xs">
                            {categoryLabels[event.category] || event.category}
                          </Badge>
                        )}
                        {event.source === 'community' && (
                          <Badge variant="outline" className="border-primary/50 text-primary text-xs">
                            Community
                          </Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground text-sm">{formattedDate}</div>
                    </div>
                    <h3 className="text-foreground font-bold text-lg leading-tight">{event.title}</h3>
                    <p className="text-foreground text-sm">{formattedTime}</p>
                    <p className="text-muted-foreground text-sm line-clamp-1">{event.location_name}</p>
                  </div>
                </div>
              );
            })}

            {!isLoading && events.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Keine Events gefunden
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Events;
