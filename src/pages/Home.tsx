import { useState, useRef, useEffect } from "react";
import { Search, MapPin, X } from "lucide-react";
import ReelsFeed from "@/components/ReelsFeed";
import Layout from "@/components/Layout";
import EventCard from "@/components/EventCard";
import { useNavigate } from "react-router-dom";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

const MAPBOX_TOKEN = 'pk.eyJ1IjoiZXZlbmRsZSIsImEiOiJjbWs0aHc2eWQwN2hqM2RyMjI4ZTY0N2F6In0.gMPP_wAbSR4Esz7WlB4Z4Q';

interface GeocodedLocation {
  name: string;
  lat: number;
  lng: number;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const Home = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLocation, setSearchLocation] = useState<GeocodedLocation | null>(null);
  const [suggestions, setSuggestions] = useState<GeocodedLocation[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

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

  // Fetch nearby events when a location is selected
  const { data: nearbyEvents } = useQuery({
    queryKey: ['nearby-events-home', searchLocation?.lat, searchLocation?.lng],
    queryFn: async () => {
      if (!searchLocation) return [];
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/search-events`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': anonKey },
          body: JSON.stringify({ limit: 50 }),
        }
      );
      if (!res.ok) return [];
      const result = await res.json();
      const events = (result.data || []).filter((e: any) => e.latitude != null && e.longitude != null);
      // Sort by distance
      return events.sort((a: any, b: any) => {
        const distA = haversineDistance(searchLocation.lat, searchLocation.lng, a.latitude, a.longitude);
        const distB = haversineDistance(searchLocation.lat, searchLocation.lng, b.latitude, b.longitude);
        return distA - distB;
      });
    },
    enabled: !!searchLocation,
    staleTime: 30_000,
  });

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?types=place,locality&limit=5&language=de&access_token=${MAPBOX_TOKEN}`
        );
        const data = await res.json();
        const results: GeocodedLocation[] = (data.features || []).map((f: any) => ({
          name: f.place_name,
          lat: f.center[1],
          lng: f.center[0],
        }));
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 300);
  };

  const selectLocation = (loc: GeocodedLocation) => {
    setSearchQuery(loc.name.split(',')[0]);
    setSearchLocation(loc);
    setShowSuggestions(false);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchLocation(null);
    setSuggestions([]);
    setShowSuggestions(false);
  };

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

          {/* City Search Input */}
          <div className="max-w-md mx-auto relative">
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Stadt oder Ort eingeben..."
                className="pl-11 pr-16 h-14 rounded-full bg-muted/50 border-border text-foreground text-lg"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {searchQuery && (
                  <button onClick={clearSearch} className="p-1 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
                <Search className="text-primary h-5 w-5" />
              </div>
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && (
              <div className="absolute top-full mt-2 left-0 right-0 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => selectLocation(s)}
                    className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-muted/50 flex items-center gap-3 transition-colors"
                  >
                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
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
              <CarouselPrevious className="hidden md:flex left-2" />
              <CarouselNext className="hidden md:flex right-2" />
            </Carousel>
          ) : (
            <p className="text-muted-foreground text-sm">Keine Top Events aktuell.</p>
          )}
        </div>

        {/* Nearby Events (when location selected) */}
        {searchLocation && nearbyEvents && nearbyEvents.length > 0 && (
          <div className="px-4 pb-8">
            <h3 className="text-foreground text-2xl font-bold mb-2">
              📍 Events nahe {searchQuery}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              Sortiert nach Entfernung
            </p>
            <div className="grid grid-cols-1 gap-4">
              {nearbyEvents.slice(0, 20).map((event: any) => {
                const dist = haversineDistance(searchLocation.lat, searchLocation.lng, event.latitude, event.longitude);
                const eventDate = new Date(event.event_date);
                const formattedDate = eventDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const formattedTime = eventDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                return (
                  <EventCard
                    key={event.id}
                    title={event.title}
                    image={event.image_url || ""}
                    date={formattedDate}
                    time={formattedTime}
                    location={`${event.location_name} · ${dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`}`}
                    category={categoryLabels[event.category || ''] || event.category || ''}
                    onClick={() => handleEventClick(event.id)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {searchLocation && nearbyEvents && nearbyEvents.length === 0 && (
          <div className="px-4 pb-8 text-center">
            <p className="text-muted-foreground">Keine Events in der Nähe von {searchQuery} gefunden.</p>
          </div>
        )}

        {/* Reels Feed */}
        <div className="px-4 pb-8">
          <ReelsFeed />
        </div>
      </div>
    </Layout>
  );
};

export default Home;
