import { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { DateRange } from "react-day-picker";
import evendleLogo from "@/assets/evendle-logo.jpeg";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import InteractiveMap, { type MapEvent } from "@/components/InteractiveMap";
import CreateEventDialog from "@/components/CreateEventDialog";
import EventDetailSheet from "@/components/EventDetailSheet";
import EventCarousel from "@/components/EventCarousel";
import CollapsibleCarousel from "@/components/CollapsibleCarousel";
import CategoryFilter from "@/components/CategoryFilter";
import { useSearchEvents, type EventCategory, type SearchEvent } from "@/hooks/useSearchEvents";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Globe, Lock, Search, MapPin, X, Moon, Tag, Navigation, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { MapboxMapHandle } from "@/components/MapboxMap";

const MAPBOX_TOKEN = 'pk.eyJ1IjoiZXZlbmRsZSIsImEiOiJjbWs0aHc2eWQwN2hqM2RyMjI4ZTY0N2F6In0.gMPP_wAbSR4Esz7WlB4Z4Q';
const MAP_EVENT_RADIUS_KM = 30;
const LOCATION_OVERVIEW_ZOOM = 11;

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const radius = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface GeoResult { name: string; lat: number; lng: number; }

type QuickFilter = 'tonight' | 'free' | 'nearby' | 'popular';

const FILTERS_STORAGE_KEY = 'nearbyFilters';

type StoredFilters = {
  selectedCategories?: EventCategory[];
  selectedDateRange?: { from?: string; to?: string };
  activeQuickFilters?: QuickFilter[];
  isPrivateMode?: boolean;
};

const loadStoredFilters = (): StoredFilters => {
  try {
    const raw = localStorage.getItem(FILTERS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredFilters) : {};
  } catch { return {}; }
};

const Nearby = () => {
  const { t } = useTranslation();
  const stored = loadStoredFilters();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<[number, number] | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<EventCategory[]>(stored.selectedCategories || []);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(
    stored.selectedDateRange?.from
      ? { from: new Date(stored.selectedDateRange.from), to: stored.selectedDateRange.to ? new Date(stored.selectedDateRange.to) : undefined }
      : undefined
  );
  const [activeQuickFilters, setActiveQuickFilters] = useState<Set<QuickFilter>>(new Set(stored.activeQuickFilters || []));
  const [selectedEvent, setSelectedEvent] = useState<MapEvent | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | number | null>(null);
  const [isPrivateMode, setIsPrivateMode] = useState(stored.isPrivateMode || false);
  const [viewportBounds, setViewportBounds] = useState<{ west: number; south: number; east: number; north: number } | null>(null);
  // While the carousel drives the map, we ignore viewport-bound updates so the
  // visible card list doesn't reshuffle mid-flight.
  const carouselDrivingRef = useRef(false);
  const carouselViewportIgnoreUntilRef = useRef(0);
  const carouselDrivingTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [carouselExpandTrigger, setCarouselExpandTrigger] = useState(0);
  // Frozen snapshot of the carousel list during an active swipe session.
  // Prevents the card order from reshuffling while the user flips through cards.
  const [frozenCarousel, setFrozenCarousel] = useState<MapEvent[] | null>(null);
  const carouselEventsRef = useRef<MapEvent[]>([]);

  // Search bar (events + places)
  const [searchOpen, setSearchOpen] = useState(false);
  const [cityQuery, setCityQuery] = useState("");
  const [citySuggestions, setCitySuggestions] = useState<GeoResult[]>([]);
  const [eventSuggestions, setEventSuggestions] = useState<SearchEvent[]>([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const searchAbortRef = useRef<AbortController | null>(null);
  const cityOverviewTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const mapRef = useRef<MapboxMapHandle>(null);

  const { isAdmin } = useIsAdmin();
  const { user } = useAuth();
  const navigate = useNavigate();

  const storedCity = (() => {
    try { const s = localStorage.getItem('selectedCity'); return s ? JSON.parse(s) as GeoResult : null; }
    catch { return null; }
  })();

  const initialCenter: [number, number] = storedCity
    ? [storedCity.lat, storedCity.lng]
    : [47.2692, 11.4041];
  const [mapFocusCenter, setMapFocusCenter] = useState<[number, number]>(initialCenter);

  useEffect(() => {
    if (storedCity) setCityQuery(storedCity.name?.split(',')[0] || '');
  }, []);

  useEffect(() => () => {
    if (cityOverviewTimerRef.current) clearTimeout(cityOverviewTimerRef.current);
  }, []);

  // Persist filters across navigation (e.g. opening an event detail and coming back)
  useEffect(() => {
    try {
      const payload: StoredFilters = {
        selectedCategories,
        selectedDateRange: selectedDateRange?.from
          ? {
              from: selectedDateRange.from.toISOString(),
              to: selectedDateRange.to ? selectedDateRange.to.toISOString() : undefined,
            }
          : undefined,
        activeQuickFilters: Array.from(activeQuickFilters),
        isPrivateMode,
      };
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(payload));
    } catch { /* ignore quota errors */ }
  }, [selectedCategories, selectedDateRange, activeQuickFilters, isPrivateMode]);

  // Build date filter — default to the next 14 days unless a quick filter or
  // explicit date range overrides it.
  const dateFilter = useMemo(() => {
    if (activeQuickFilters.has('tonight')) {
      const today = new Date().toISOString().split('T')[0];
      return { from: today, to: today };
    }
    if (selectedDateRange?.from) {
      const from = selectedDateRange.from.toISOString().split('T')[0];
      const to = (selectedDateRange.to || selectedDateRange.from).toISOString().split('T')[0];
      return { from, to };
    }
    const now = new Date();
    const in14 = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14);
    return {
      from: now.toISOString().split('T')[0],
      to: in14.toISOString().split('T')[0],
    };
  }, [activeQuickFilters, selectedDateRange]);

  const { data: searchResult, isLoading: isLoadingPublic, refetch: refetchPublic } = useSearchEvents({
    categories: selectedCategories.length > 0 ? selectedCategories : undefined,
    date_from: dateFilter?.from,
    date_to: dateFilter?.to,
    free_only: activeQuickFilters.has('free') || undefined,
    limit: 200,
  }, !isPrivateMode);

  const { data: privateEvents, isLoading: isLoadingPrivate, refetch: refetchPrivate } = useQuery({
    queryKey: ['private-events', user?.id, selectedCategories, dateFilter?.from, dateFilter?.to, activeQuickFilters.has('free')],
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
      if (selectedCategories.length > 0) query = query.in('category', selectedCategories);
      if (dateFilter) {
        query = query.gte('event_date', dateFilter.from).lte('event_date', dateFilter.to + 'T23:59:59');
      }
      if (activeQuickFilters.has('free')) query = query.eq('price_cents', 0);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: isPrivateMode && !!user,
    staleTime: 30_000,
  });

  const isLoading = isPrivateMode ? isLoadingPrivate : isLoadingPublic;

  // City search
  const handleCityInput = (value: string) => {
    setCityQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) {
      setCitySuggestions([]);
      setEventSuggestions([]);
      setShowCitySuggestions(false);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    debounceRef.current = setTimeout(async () => {
      // Cancel any in-flight request
      if (searchAbortRef.current) searchAbortRef.current.abort();
      const ctrl = new AbortController();
      searchAbortRef.current = ctrl;
      const q = value.trim();
      const escaped = q.replace(/[%,()]/g, ' ');
      try {
        const [placesRes, eventsRes] = await Promise.all([
          fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?types=place,locality&limit=4&language=en&access_token=${MAPBOX_TOKEN}`,
            { signal: ctrl.signal }
          ).then(r => r.json()).catch(() => ({ features: [] })),
          supabase
            .from('events')
            .select('id,title,description,category,event_date,location_name,latitude,longitude,image_url,is_featured,max_participants,current_participants,visibility,source,end_time,created_by,created_at,updated_at')
            .eq('visibility', 'public')
            .eq('approval_status', 'approved')
            .or(`title.ilike.%${escaped}%,location_name.ilike.%${escaped}%,description.ilike.%${escaped}%`)
            .order('event_date', { ascending: true })
            .limit(6)
            .then(r => r),
        ]);
        if (ctrl.signal.aborted) return;
        const places: GeoResult[] = (placesRes.features || []).map((f: any) => ({
          name: f.place_name, lat: f.center[1], lng: f.center[0],
        }));
        const evs = (eventsRes.data || []) as any as SearchEvent[];
        setCitySuggestions(places);
        setEventSuggestions(evs);
        setShowCitySuggestions(places.length + evs.length > 0);
      } catch {
        if (!ctrl.signal.aborted) {
          setCitySuggestions([]);
          setEventSuggestions([]);
        }
      } finally {
        if (!ctrl.signal.aborted) setSearchLoading(false);
      }
    }, 300);
  };

  const selectCity = (loc: GeoResult) => {
    if (cityOverviewTimerRef.current) clearTimeout(cityOverviewTimerRef.current);
    setCityQuery(loc.name.split(',')[0]);
    setShowCitySuggestions(false);
    setMapFocusCenter([loc.lat, loc.lng]);
    // Clear any previously selected event from the prior city so the carousel
    // doesn't keep showing an out-of-area event after the user switches cities.
    setSelectedEventId(null);
    setSelectedEvent(null);
    setFrozenCarousel(null);
    mapRef.current?.setOverview(loc.lat, loc.lng, LOCATION_OVERVIEW_ZOOM);
    cityOverviewTimerRef.current = setTimeout(() => {
      mapRef.current?.setOverview(loc.lat, loc.lng, LOCATION_OVERVIEW_ZOOM);
    }, 350);
    localStorage.setItem('selectedCity', JSON.stringify(loc));
  };

  const selectEventSuggestion = (ev: SearchEvent) => {
    setShowCitySuggestions(false);
    setCityQuery(ev.title);
    const eventPosition: [number, number] = [ev.latitude ?? 47.2692, ev.longitude ?? 11.4041];
    const mapEv: MapEvent = {
      id: ev.id,
      title: ev.title,
      position: eventPosition,
      image: ev.image_url || undefined,
      category: ev.category || undefined,
      description: ev.description || undefined,
      event_date: ev.event_date,
      location_name: ev.location_name,
      max_participants: ev.max_participants || undefined,
      current_participants: ev.current_participants || undefined,
      is_featured: ev.is_featured || false,
    };
    if (ev.latitude != null && ev.longitude != null) {
      setMapFocusCenter(eventPosition);
      // Briefly fly in to confirm location, then zoom back to overview so the
      // user can navigate the map without being stuck zoomed in.
      mapRef.current?.flyTo(ev.latitude, ev.longitude, 16);
      setTimeout(() => {
        mapRef.current?.flyTo(ev.latitude!, ev.longitude!, LOCATION_OVERVIEW_ZOOM);
      }, 1400);
    }
    setSelectedEventId(ev.id);
    setSelectedEvent(mapEv);
  };

  const clearCitySearch = () => {
    setCityQuery("");
    setCitySuggestions([]);
    setEventSuggestions([]);
    setShowCitySuggestions(false);
    setSearchLoading(false);
    localStorage.removeItem('selectedCity');
  };

  const handleCreateEvent = (coordinates: [number, number]) => {
    if (!user) {
      toast.info(t('nearby.signInCreate'), {
        action: { label: t('nearby.signIn'), onClick: () => navigate('/auth') },
      });
      return;
    }
    setSelectedPosition(coordinates);
    setDialogOpen(true);
  };

  // Map data
  const publicMapEvents: MapEvent[] = (searchResult?.data || [])
    .filter((e: SearchEvent) => e.latitude != null && e.longitude != null)
    .map((e: SearchEvent) => ({
      id: e.id, title: e.title,
      position: [e.latitude!, e.longitude!] as [number, number],
      image: e.image_url || undefined, category: e.category || undefined,
      description: e.description || undefined, event_date: e.event_date,
      location_name: e.location_name, max_participants: e.max_participants || undefined,
      current_participants: e.current_participants || undefined,
      is_featured: e.is_featured || false,
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
      is_featured: (e as any).is_featured || false,
    }));

  let mapEvents = isPrivateMode ? privateMapEvents : publicMapEvents;

  mapEvents = mapEvents.filter(e => (
    haversineDistance(mapFocusCenter[0], mapFocusCenter[1], e.position[0], e.position[1]) <= MAP_EVENT_RADIUS_KM
  ));

  // "Popular" filter: only featured
  if (activeQuickFilters.has('popular')) {
    mapEvents = mapEvents.filter(e => e.is_featured);
  }

  // Carousel = events within 30km of the current map focus, visible in viewport,
  // featured first then by date, max 10.
  // While the carousel drives the map, we freeze the viewport reference so the order stays put.
  const effectiveBounds = viewportBounds;
  const carouselEvents = useMemo(() => {
    const inView = effectiveBounds
      ? mapEvents.filter(e => {
          const [lat, lng] = e.position;
          return lat >= effectiveBounds.south && lat <= effectiveBounds.north
              && lng >= effectiveBounds.west && lng <= effectiveBounds.east;
        })
      : mapEvents;
    // Keep the selected event only while it is still inside the current 30km map area.
    const selected = selectedEventId != null
      ? mapEvents.find(e => String(e.id) === String(selectedEventId))
      : undefined;
    if (selected && !inView.find(e => String(e.id) === String(selected.id))) {
      inView.unshift(selected);
    }
    const featured = inView.filter(e => e.is_featured);
    const others = inView.filter(e => !e.is_featured);
    const sortedOthers = [...others].sort((a, b) => {
      const da = a.event_date ? new Date(a.event_date).getTime() : Infinity;
      const db = b.event_date ? new Date(b.event_date).getTime() : Infinity;
      return da - db;
    });
    return [...featured, ...sortedOthers].slice(0, 10);
  }, [mapEvents, effectiveBounds, selectedEventId]);

  carouselEventsRef.current = carouselEvents;

  // The list shown in the carousel: prefer the frozen snapshot during a swipe session.
  const displayedCarouselEvents = frozenCarousel ?? carouselEvents;

  const freezeCarouselOrder = () => {
    setFrozenCarousel(prev => prev ?? carouselEventsRef.current);
  };

  const lockCarouselDrivenMapMove = () => {
    carouselDrivingRef.current = true;
    carouselViewportIgnoreUntilRef.current = Date.now() + 1800;
    if (carouselDrivingTimerRef.current) clearTimeout(carouselDrivingTimerRef.current);
    carouselDrivingTimerRef.current = setTimeout(() => {
      carouselDrivingRef.current = false;
    }, 1800);
  };

  // Auto-select first carousel item
  useEffect(() => {
    if (displayedCarouselEvents.length > 0 && (selectedEventId == null || !displayedCarouselEvents.find(e => String(e.id) === String(selectedEventId)))) {
      setSelectedEventId(displayedCarouselEvents[0].id);
    }
    if (displayedCarouselEvents.length === 0) setSelectedEventId(null);
  }, [displayedCarouselEvents]);

  // Reset the freeze whenever filters / mode change — the user expects a fresh list then.
  useEffect(() => {
    setFrozenCarousel(null);
  }, [selectedCategories, dateFilter?.from, dateFilter?.to, isPrivateMode, activeQuickFilters]);

  // Sync map when carousel selection changes — pan only (no zoom change),
  // and freeze viewport-driven re-ordering until the flight settles.
  const handleCarouselSelect = (ev: MapEvent) => {
    freezeCarouselOrder();
    setSelectedEventId(ev.id);
    lockCarouselDrivenMapMove();
    setMapFocusCenter(ev.position);
    mapRef.current?.flyTo(ev.position[0], ev.position[1], 15);
  };

  const handleRefetch = () => {
    if (isPrivateMode) refetchPrivate(); else refetchPublic();
  };

  const toggleQuickFilter = (f: QuickFilter) => {
    setActiveQuickFilters(prev => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
    if (f === 'nearby' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setMapFocusCenter([pos.coords.latitude, pos.coords.longitude]);
          setFrozenCarousel(null);
          mapRef.current?.flyTo(pos.coords.latitude, pos.coords.longitude, 14);
        },
        () => toast.error(t('nearby.locationError'))
      );
    }
  };

  const quickPills: { id: QuickFilter; label: string; icon: React.ElementType }[] = [
    { id: 'tonight', label: t('nearby.tonight'), icon: Moon },
    { id: 'free', label: t('nearby.free'), icon: Tag },
    { id: 'nearby', label: t('nearby.nearbyFilter'), icon: Navigation },
    { id: 'popular', label: t('nearby.popular'), icon: Flame },
  ];

  return (
    <Layout>
      <div className="relative h-[calc(100dvh-96px-env(safe-area-inset-bottom))] overflow-hidden">
        {/* Map fills everything */}
        <div className="absolute inset-0">
          <InteractiveMap
            ref={mapRef}
            onCreateEvent={handleCreateEvent}
            onEventClick={(event) => {
              // User tapped a marker on the map → fresh list around that marker.
              setFrozenCarousel(null);
              setMapFocusCenter(event.position);
              setSelectedEventId(event.id);
              // Auto-expand the carousel so the matching card is visible
              setCarouselExpandTrigger(t => t + 1);
              // Pan to the event so the carousel viewport-filter keeps it in view,
              // and the matching card scrolls to the active center.
              lockCarouselDrivenMapMove();
              mapRef.current?.flyTo(event.position[0], event.position[1]);
            }}
            onViewportChange={(b) => {
              if (carouselDrivingRef.current || Date.now() < carouselViewportIgnoreUntilRef.current) return;
              // User moved/zoomed the map themselves → unfreeze and refresh the list.
              setFrozenCarousel(null);
              setMapFocusCenter([(b.south + b.north) / 2, (b.west + b.east) / 2]);
              setViewportBounds(b);
            }}
            events={mapEvents}
            isAdmin={true}
            center={initialCenter}
            selectedEventId={selectedEventId}
          />
        </div>

        {/* TOP BAR: glass search + actions */}
        <div className="absolute top-3 left-3 right-3 z-20 flex items-start gap-2">
          {/* Search field */}
          <div className="flex-1 relative">
            <div className="flex items-center bg-card/90 backdrop-blur-xl rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-border/50 h-11 px-4">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <input
                value={cityQuery}
                onChange={(e) => handleCityInput(e.target.value)}
                onFocus={() => { setSearchOpen(true); (citySuggestions.length + eventSuggestions.length) > 0 && setShowCitySuggestions(true); }}
                placeholder="Search events, places..."
                className="flex-1 bg-transparent border-0 outline-none px-3 text-sm text-foreground placeholder:text-muted-foreground"
              />
              {searchLoading && (
                <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin shrink-0" />
              )}
              {cityQuery && !searchLoading && (
                <button onClick={clearCitySearch} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {showCitySuggestions && (
              <div className="mt-1.5 bg-card/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-xl overflow-hidden max-h-[60vh] overflow-y-auto">
                {eventSuggestions.length > 0 && (
                  <>
                    <div className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Events</div>
                    {eventSuggestions.map((ev) => (
                      <button
                        key={`ev-${ev.id}`}
                        onClick={() => selectEventSuggestion(ev)}
                        className="w-full px-3 py-2.5 text-left hover:bg-muted/50 flex items-center gap-3"
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                          {ev.image_url
                            ? <img src={ev.image_url} alt="" className="w-full h-full object-cover" />
                            : <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-foreground truncate">{ev.title}</span>
                            {ev.is_featured && (
                              <span className="px-1.5 py-0.5 rounded-full bg-[hsl(var(--blitz-pink))] text-white text-[9px] font-bold uppercase shrink-0">Top</span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {ev.event_date && new Date(ev.event_date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}
                            {ev.location_name && ` · ${ev.location_name}`}
                          </div>
                        </div>
                      </button>
                    ))}
                  </>
                )}
                {citySuggestions.length > 0 && (
                  <>
                    <div className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Places</div>
                    {citySuggestions.map((s, i) => (
                      <button
                        key={`pl-${i}`}
                        onClick={() => selectCity(s)}
                        className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted/50 flex items-center gap-3"
                      >
                        <MapPin className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate">{s.name}</span>
                      </button>
                    ))}
                  </>
                )}
                {!searchLoading && eventSuggestions.length === 0 && citySuggestions.length === 0 && (
                  <div className="px-4 py-4 text-sm text-muted-foreground text-center">No events or places found</div>
                )}
              </div>
            )}
          </div>

          {/* Filter button (advanced) */}
          <div className="h-11 flex items-center bg-card/90 backdrop-blur-xl rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-border/50 px-2">
            <CategoryFilter
              selectedCategories={selectedCategories}
              onCategoriesChange={setSelectedCategories}
              selectedDateRange={selectedDateRange}
              onDateRangeChange={setSelectedDateRange}
            />
          </div>
        </div>

        {/* PUBLIC / PRIVATE TOGGLE — pinned, always visible directly under the search bar */}
        <div className="absolute top-[58px] right-3 z-20">
          <div className="flex items-center gap-2 h-9 px-3 rounded-full bg-card/95 backdrop-blur-xl border border-border/50 shadow-[0_4px_14px_rgba(0,0,0,0.10)]">
            <Globe className={`h-3.5 w-3.5 ${!isPrivateMode ? 'text-primary' : 'text-muted-foreground'}`} />
            <Switch
              checked={isPrivateMode}
              onCheckedChange={(checked) => {
                if (checked && !user) {
                  toast.info('Please sign in to see private events.', {
                    action: { label: 'Sign in', onClick: () => navigate('/auth') },
                  });
                  return;
                }
                setIsPrivateMode(checked);
              }}
              className="scale-75"
            />
            <Lock className={`h-3.5 w-3.5 ${isPrivateMode ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
        </div>

        {/* QUICK FILTER PILLS */}
        <div className="absolute top-[60px] left-0 z-10 pl-3 pr-[125px] right-0">
          <div className="gap-2 overflow-x-auto scrollbar-hide pb-1 flex flex-row text-left font-thin mx-0 px-0 py-0 my-0">
            {quickPills.map(({ id, label, icon: Icon }) => {
              const active = activeQuickFilters.has(id);
              return (
                <button
                  key={id}
                  onClick={() => toggleQuickFilter(id)}
                  className={`shrink-0 flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-semibold transition-all ${
                    active
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-card/90 backdrop-blur-xl text-foreground border border-border/50 shadow-sm'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>


        {isLoading && (
          <div className="absolute top-[110px] left-1/2 -translate-x-1/2 z-10 bg-card/95 backdrop-blur rounded-full px-3 py-1 text-xs text-foreground shadow">
            Loading events...
          </div>
        )}

        {/* BOTTOM CAROUSEL — collapsible drawer */}
        <div className="absolute left-0 right-0 z-10" style={{ bottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }}>
          <CollapsibleCarousel
            expandedHeight={280}
            collapsedHeight={36}
            expandTrigger={carouselExpandTrigger}
            autoCollapse={displayedCarouselEvents.length === 0}
          >
            <EventCarousel
              events={displayedCarouselEvents}
              selectedId={selectedEventId}
              onInteractionStart={freezeCarouselOrder}
              onSelect={handleCarouselSelect}
              onExpand={(ev) => setSelectedEvent(ev)}
            />
          </CollapsibleCarousel>
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
