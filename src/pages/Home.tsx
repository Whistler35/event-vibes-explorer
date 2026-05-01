import { useState, useRef, useEffect } from "react";
import evendleLogo from "@/assets/evendle-logo.jpeg";
import { Search, MapPin, X, SlidersHorizontal, CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

import NotificationBell from "@/components/NotificationBell";
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
  const [showAllNearby, setShowAllNearby] = useState(false);
  const [nearbyCategories, setNearbyCategories] = useState<string[]>([]);
  const [nearbyDateRange, setNearbyDateRange] = useState<DateRange | undefined>(undefined);
  const [showNearbyFilters, setShowNearbyFilters] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(() => {
    const stored = localStorage.getItem('selectedCity');
    if (stored) { try { return JSON.parse(stored).name?.split(',')[0] || ''; } catch {} }
    return '';
  });
  const [searchLocation, setSearchLocation] = useState<GeocodedLocation | null>(() => {
    const stored = localStorage.getItem('selectedCity');
    if (stored) { try { return JSON.parse(stored); } catch {} }
    return null;
  });
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
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?types=place,locality&limit=5&language=en&access_token=${MAPBOX_TOKEN}`
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
    localStorage.setItem('selectedCity', JSON.stringify(loc));
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchLocation(null);
    setSuggestions([]);
    setShowSuggestions(false);
    localStorage.removeItem('selectedCity');
  };

  const categoryLabels: Record<string, string> = {
    music: 'Music', sports: 'Sports', culture: 'Culture', food: 'Food',
    nightlife: 'Nightlife', outdoor: 'Outdoor', community: 'Community',
    workshop: 'Workshop', other: 'Other',
  };

  const handleEventClick = (eventId: string) => {
    navigate(`/event/${eventId}`);
  };

  return (
    <Layout>
      <div className="bg-background">
        {/* Header with Logo */}
        <div className="p-4 pt-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img src={evendleLogo} alt="Evendle" className="w-9 h-9 object-contain" />
              <span className="text-foreground text-xl font-bold">EVENDLE</span>
            </div>
            <NotificationBell />
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
                placeholder="Enter a city or place..."
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
                  const formattedDate = eventDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
                  const formattedTime = eventDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
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
            <p className="text-muted-foreground text-sm">No top events right now.</p>
          )}
        </div>

        {/* Nearby Events (when location selected) */}
        {searchLocation && nearbyEvents && nearbyEvents.length > 0 && (() => {
          const filteredNearby = nearbyEvents.filter((event: any) => {
            if (nearbyCategories.length > 0 && !nearbyCategories.includes(event.category)) return false;
            if (nearbyDateRange?.from) {
              const eventDay = new Date(event.event_date);
              eventDay.setHours(0, 0, 0, 0);
              const from = new Date(nearbyDateRange.from);
              from.setHours(0, 0, 0, 0);
              const to = nearbyDateRange.to ? new Date(nearbyDateRange.to) : from;
              to.setHours(23, 59, 59, 999);
              if (eventDay < from || eventDay > to) return false;
            }
            return true;
          });
          const displayedEvents = showAllNearby ? filteredNearby : filteredNearby.slice(0, 5);
          const hasActiveFilters = nearbyCategories.length > 0 || !!nearbyDateRange?.from;

          const formatDateLabel = () => {
            if (!nearbyDateRange?.from) return 'Date';
            const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' });
            if (!nearbyDateRange.to || nearbyDateRange.from.getTime() === nearbyDateRange.to.getTime()) {
              return fmt(nearbyDateRange.from);
            }
            return `${fmt(nearbyDateRange.from)} – ${fmt(nearbyDateRange.to)}`;
          };

          return (
            <div className="px-4 pb-8">
              <h3 className="text-foreground text-2xl font-bold mb-2">
                📍 Events near {searchQuery}
              </h3>

              {/* Filter toggle */}
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setShowNearbyFilters(!showNearbyFilters)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    hasActiveFilters
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                  }`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Filter{hasActiveFilters ? ' active' : ''}
                </button>
                {hasActiveFilters && (
                  <button
                    onClick={() => { setNearbyCategories([]); setNearbyDateRange(undefined); setShowAllNearby(false); }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Filter controls */}
              {showNearbyFilters && (
                <div className="space-y-3 mb-4">
                  {/* Category chips - multi-select */}
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(categoryLabels).map(([key, label]) => {
                      const isActive = nearbyCategories.includes(key);
                      return (
                        <button
                          key={key}
                          onClick={() => {
                            setNearbyCategories(prev =>
                              isActive ? prev.filter(c => c !== key) : [...prev, key]
                            );
                            setShowAllNearby(false);
                          }}
                          className={cn(
                            'px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors',
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Date picker */}
                  <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "px-3 py-2 text-sm rounded-full bg-card border-border",
                          !nearbyDateRange?.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                        {formatDateLabel()}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        weekStartsOn={1}
                        selected={nearbyDateRange}
                        onSelect={(range) => { setNearbyDateRange(range); setShowAllNearby(false); }}
                        numberOfMonths={1}
                        className={cn("p-3 pointer-events-auto")}
                      />
                      <div className="flex gap-2 p-3 pt-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex-1"
                          onClick={() => { setNearbyDateRange(undefined); setDatePickerOpen(false); setShowAllNearby(false); }}
                        >
                          Clear
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => setDatePickerOpen(false)}
                        >
                          Apply
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {filteredNearby.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 gap-4">
                    {displayedEvents.map((event: any) => {
                      const dist = haversineDistance(searchLocation.lat, searchLocation.lng, event.latitude, event.longitude);
                      const eventDate = new Date(event.event_date);
                      const formattedDate = eventDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
                      const formattedTime = eventDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
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
                  {filteredNearby.length > 5 && (
                    <button
                      onClick={() => setShowAllNearby(!showAllNearby)}
                      className="mt-4 w-full py-2.5 text-sm font-medium text-primary border border-border rounded-full hover:bg-muted/50 transition-colors"
                    >
                      {showAllNearby ? 'Show less' : `Show all ${filteredNearby.length} events`}
                    </button>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground text-sm">No events match these filters.</p>
              )}
            </div>
          );
        })()}

        {searchLocation && nearbyEvents && nearbyEvents.length === 0 && (
          <div className="px-4 pb-8 text-center">
            <p className="text-muted-foreground">No events found near {searchQuery}.</p>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default Home;
