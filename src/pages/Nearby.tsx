import { useState, useRef, useEffect } from "react";
import evendleLogo from "@/assets/evendle-logo.jpeg";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import InteractiveMap, { type MapEvent } from "@/components/InteractiveMap";
import CreateEventDialog from "@/components/CreateEventDialog";
import CategoryFilter from "@/components/CategoryFilter";
import EventDetailSheet from "@/components/EventDetailSheet";
import { useSearchEvents, type EventCategory, type SearchEvent } from "@/hooks/useSearchEvents";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Globe, Lock, Search, MapPin, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { MapboxMapHandle } from "@/components/MapboxMap";

const MAPBOX_TOKEN = 'pk.eyJ1IjoiZXZlbmRsZSIsImEiOiJjbWs0aHc2eWQwN2hqM2RyMjI4ZTY0N2F6In0.gMPP_wAbSR4Esz7WlB4Z4Q';

interface GeoResult {
  name: string;
  lat: number;
  lng: number;
}

const Nearby = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | ''>('');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedEvent, setSelectedEvent] = useState<MapEvent | null>(null);
  const [isPrivateMode, setIsPrivateMode] = useState(false);

  // City search state
  const [cityQuery, setCityQuery] = useState("");
  const [citySuggestions, setCitySuggestions] = useState<GeoResult[]>([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const mapRef = useRef<MapboxMapHandle>(null);

  const { isAdmin } = useIsAdmin();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Read stored city for initial map center & search bar state
  const storedCity = (() => {
    try {
      const s = localStorage.getItem('selectedCity');
      return s ? JSON.parse(s) as GeoResult : null;
    } catch { return null; }
  })();

  const initialCenter: [number, number] = storedCity
    ? [storedCity.lat, storedCity.lng]
    : [47.2692, 11.4041];

  // Initialise search bar with stored city name
  useEffect(() => {
    if (storedCity) {
      setCityQuery(storedCity.name?.split(',')[0] || '');
      setShowSearchBar(true);
    }
  }, []);

  const { data: searchResult, isLoading: isLoadingPublic, refetch: refetchPublic } = useSearchEvents({
    category: selectedCategory || undefined,
    date_from: selectedDate ? selectedDate.toISOString().split('T')[0] : undefined,
    date_to: selectedDate ? selectedDate.toISOString().split('T')[0] : undefined,
    limit: 100,
  }, !isPrivateMode);

  const { data: privateEvents, isLoading: isLoadingPrivate, refetch: refetchPrivate } = useQuery({
    queryKey: ['private-events', user?.id, selectedCategory, selectedDate],
    queryFn: async () => {
      if (!user) return [];
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'accepted');
      const friendIds = (friendships || []).map((f: any) =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );
      const allUserIds = [user.id, ...friendIds];
      let query = supabase
        .from('events')
        .select('*')
        .in('created_by', allUserIds)
        .eq('visibility', 'unlisted')
        .order('event_date', { ascending: true });
      if (selectedCategory) query = query.eq('category', selectedCategory);
      if (selectedDate) {
        const dateStr = selectedDate.toISOString().split('T')[0];
        query = query.gte('event_date', dateStr).lte('event_date', dateStr + 'T23:59:59');
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: isPrivateMode && !!user,
    staleTime: 30_000,
  });

  const isLoading = isPrivateMode ? isLoadingPrivate : isLoadingPublic;

  const handleCityInput = (value: string) => {
    setCityQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) {
      setCitySuggestions([]);
      setShowCitySuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?types=place,locality&limit=5&language=de&access_token=${MAPBOX_TOKEN}`
        );
        const data = await res.json();
        const results: GeoResult[] = (data.features || []).map((f: any) => ({
          name: f.place_name,
          lat: f.center[1],
          lng: f.center[0],
        }));
        setCitySuggestions(results);
        setShowCitySuggestions(results.length > 0);
      } catch {
        setCitySuggestions([]);
      }
    }, 300);
  };

  const selectCity = (loc: GeoResult) => {
    setCityQuery(loc.name.split(',')[0]);
    setShowCitySuggestions(false);
    mapRef.current?.flyTo(loc.lat, loc.lng, 13);
    localStorage.setItem('selectedCity', JSON.stringify(loc));
  };

  const clearCitySearch = () => {
    setCityQuery("");
    setCitySuggestions([]);
    setShowCitySuggestions(false);
    setShowSearchBar(false);
    localStorage.removeItem('selectedCity');
  };

  const handleCreateEvent = (coordinates: [number, number]) => {
    if (!user) {
      toast.info('Bitte melde dich an, um Events zu erstellen.', {
        action: { label: 'Anmelden', onClick: () => navigate('/auth') },
      });
      return;
    }
    setSelectedPosition(coordinates);
    setDialogOpen(true);
  };

  const publicMapEvents: MapEvent[] = (searchResult?.data || [])
    .filter((e: SearchEvent) => e.latitude != null && e.longitude != null)
    .map((e: SearchEvent) => ({
      id: e.id, title: e.title,
      position: [e.latitude!, e.longitude!] as [number, number],
      image: e.image_url || undefined, category: e.category || undefined,
      description: e.description || undefined, event_date: e.event_date,
      location_name: e.location_name, max_participants: e.max_participants || undefined,
      current_participants: e.current_participants || undefined,
    }));

  const privateMapEvents: MapEvent[] = (privateEvents || [])
    .filter((e) => e.latitude != null && e.longitude != null)
    .map((e) => ({
      id: e.id, title: e.title,
      position: [e.latitude!, e.longitude!] as [number, number],
      image: e.image_url || undefined, category: e.category || undefined,
      description: e.description || undefined, event_date: e.event_date,
      location_name: e.location_name, max_participants: e.max_participants || undefined,
      current_participants: e.current_participants || undefined,
    }));

  const mapEvents = isPrivateMode ? privateMapEvents : publicMapEvents;

  const handleRefetch = () => {
    if (isPrivateMode) refetchPrivate(); else refetchPublic();
  };

  return (
    <Layout>
      <div className="relative h-[calc(100vh-80px)]">
        <div className="absolute top-4 left-4 z-10 flex items-center space-x-2">
          <img src={evendleLogo} alt="Evendle" className="w-9 h-9 object-contain" />
          <span className="text-foreground text-xl font-bold drop-shadow-lg">EVENDLE</span>
        </div>

        {/* Public/Private Toggle */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          {/* Search toggle button */}
          <button
            onClick={() => setShowSearchBar(!showSearchBar)}
            className="w-10 h-10 bg-card/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg border border-border"
          >
            <Search className="h-4 w-4 text-foreground" />
          </button>

          <div className="flex items-center gap-2 bg-card/90 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg border border-border">
            <Globe className={`h-4 w-4 transition-colors ${!isPrivateMode ? 'text-primary' : 'text-muted-foreground'}`} />
            <Switch
              checked={isPrivateMode}
              onCheckedChange={(checked) => {
                if (checked && !user) {
                  toast.info('Bitte melde dich an, um private Events zu sehen.', {
                    action: { label: 'Anmelden', onClick: () => navigate('/auth') },
                  });
                  return;
                }
                setIsPrivateMode(checked);
              }}
            />
            <Lock className={`h-4 w-4 transition-colors ${isPrivateMode ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
        </div>

        {/* City Search Bar */}
        {showSearchBar && (
          <div className="absolute top-16 left-4 right-4 z-20">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={cityQuery}
                onChange={(e) => handleCityInput(e.target.value)}
                onFocus={() => citySuggestions.length > 0 && setShowCitySuggestions(true)}
                placeholder="Stadt suchen..."
                className="pl-9 pr-9 h-10 rounded-full bg-card/95 backdrop-blur-sm border-border text-foreground shadow-lg"
                autoFocus
              />
              {cityQuery && (
                <button onClick={clearCitySearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {showCitySuggestions && (
              <div className="mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                {citySuggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => selectCity(s)}
                    className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-muted/50 flex items-center gap-3 transition-colors"
                  >
                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className={`absolute ${showSearchBar ? 'top-28' : 'top-14'} left-0 right-0 z-10 px-4 transition-all`}>
          <CategoryFilter selected={selectedCategory} onChange={setSelectedCategory} selectedDate={selectedDate} onDateChange={setSelectedDate} />
        </div>

        {isLoading && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-10 bg-card/90 rounded-full px-3 py-1 text-xs text-foreground">
            Events laden...
          </div>
        )}

        <div className="absolute top-0 bottom-0 left-0 right-0">
          <InteractiveMap
            ref={mapRef}
            onCreateEvent={handleCreateEvent}
            onEventClick={(event) => setSelectedEvent(event)}
            events={mapEvents}
            isAdmin={true}
            center={initialCenter}
          />
        </div>

        <CreateEventDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          position={selectedPosition}
          isAdmin={isAdmin}
          onEventCreated={() => handleRefetch()}
          defaultPrivate={isPrivateMode}
        />

        <EventDetailSheet
          event={selectedEvent}
          open={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      </div>
    </Layout>
  );
};

export default Nearby;
