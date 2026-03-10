import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, ArrowLeft, MapPin, Calendar, Star, StarOff, ChevronUp, ChevronDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" }) +
    ", " + d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
};

interface AdminEvent {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  event_date: string;
  location_name: string;
  image_url: string | null;
  created_at: string;
  created_by: string | null;
  approval_status: string;
  is_featured: boolean;
  featured_order: number;
}

const AdminEvents = () => {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const navigate = useNavigate();
  const [pendingEvents, setPendingEvents] = useState<AdminEvent[]>([]);
  const [allEvents, setAllEvents] = useState<AdminEvent[]>([]);
  const [nonFeaturedEvents, setNonFeaturedEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, adminLoading, navigate]);

  const fetchPendingEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("events")
      .select("id, title, description, category, event_date, location_name, image_url, created_at, created_by, approval_status, is_featured")
      .eq("approval_status", "pending")
      .order("created_at", { ascending: false });

    if (!error && data) setPendingEvents(data as AdminEvent[]);
    setLoading(false);
  };

  const fetchFeaturedEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("id, title, description, category, event_date, location_name, image_url, created_at, created_by, approval_status, is_featured, featured_order")
      .eq("approval_status", "approved")
      .eq("is_featured", true)
      .order("featured_order", { ascending: true })
      .order("event_date", { ascending: true });

    if (!error && data) setAllEvents(data as AdminEvent[]);
  };

  const fetchNonFeaturedEvents = async () => {
    const { data, error } = await supabase
      .from("events")
      .select("id, title, description, category, event_date, location_name, image_url, created_at, created_by, approval_status, is_featured, featured_order")
      .eq("approval_status", "approved")
      .eq("is_featured", false)
      .order("event_date", { ascending: true });

    if (!error && data) setNonFeaturedEvents(data as AdminEvent[]);
  };

  const fetchAllEvents = async () => {
    setLoading(true);
    await Promise.all([fetchFeaturedEvents(), fetchNonFeaturedEvents()]);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) {
      if (tab === "pending") fetchPendingEvents();
      else fetchAllEvents();
    }
  }, [isAdmin, tab]);

  const filteredNonFeatured = nonFeaturedEvents.filter((e) =>
    e.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleApprove = async (eventId: string) => {
    const { error } = await supabase
      .from("events")
      .update({ approval_status: "approved" } as any)
      .eq("id", eventId);

    if (error) {
      toast.error("Fehler beim Freigeben");
    } else {
      toast.success("Event freigegeben! ✅");
      setPendingEvents((prev) => prev.filter((e) => e.id !== eventId));
    }
  };

  const handleReject = async (eventId: string) => {
    const { error } = await supabase
      .from("events")
      .update({ approval_status: "rejected" } as any)
      .eq("id", eventId);

    if (error) {
      toast.error("Fehler beim Ablehnen");
    } else {
      toast.success("Event abgelehnt");
      setPendingEvents((prev) => prev.filter((e) => e.id !== eventId));
    }
  };

  const toggleFeatured = async (eventId: string, currentlyFeatured: boolean) => {
    const maxOrder = allEvents.length > 0 
      ? Math.max(...allEvents.map(e => e.featured_order || 0)) + 1 
      : 0;
    
    const { error } = await supabase
      .from("events")
      .update({ 
        is_featured: !currentlyFeatured,
        featured_order: currentlyFeatured ? 0 : maxOrder,
      } as any)
      .eq("id", eventId);

    if (error) {
      toast.error("Fehler beim Aktualisieren");
    } else {
      toast.success(currentlyFeatured ? "Nicht mehr Top Event" : "Als Top Event markiert ⭐");
      await Promise.all([fetchFeaturedEvents(), fetchNonFeaturedEvents()]);
    }
  };

  const moveEvent = async (eventId: string, direction: "up" | "down") => {
    const idx = allEvents.findIndex((e) => e.id === eventId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= allEvents.length) return;

    const current = allEvents[idx];
    const swap = allEvents[swapIdx];

    // Swap featured_order values
    const { error: e1 } = await supabase
      .from("events")
      .update({ featured_order: swap.featured_order } as any)
      .eq("id", current.id);
    const { error: e2 } = await supabase
      .from("events")
      .update({ featured_order: current.featured_order } as any)
      .eq("id", swap.id);

    if (e1 || e2) {
      toast.error("Fehler beim Sortieren");
    } else {
      const newEvents = [...allEvents];
      newEvents[idx] = { ...swap, featured_order: current.featured_order };
      newEvents[swapIdx] = { ...current, featured_order: swap.featured_order };
      // Re-sort
      newEvents.sort((a, b) => a.featured_order - b.featured_order);
      setAllEvents(newEvents);
    }
  };

  if (adminLoading || !isAdmin) return null;

  return (
    <Layout>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </Button>
          <div>
            <h1 className="text-foreground text-xl font-bold">Admin Bereich</h1>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full bg-muted">
            <TabsTrigger value="pending" className="flex-1">
              Freigaben {pendingEvents.length > 0 && `(${pendingEvents.length})`}
            </TabsTrigger>
            <TabsTrigger value="featured" className="flex-1">
              Top Events
            </TabsTrigger>
          </TabsList>

          {/* Pending Events Tab */}
          <TabsContent value="pending" className="space-y-4 mt-4">
            {loading ? (
              <div className="text-center text-muted-foreground py-12">Laden...</div>
            ) : pendingEvents.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                <p className="text-foreground font-semibold">Alles erledigt!</p>
                <p className="text-muted-foreground text-sm">Keine offenen Events zur Prüfung.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingEvents.map((event) => (
                  <div key={event.id} className="bg-card rounded-2xl overflow-hidden border border-border">
                    {event.image_url && (
                      <img src={event.image_url} alt={event.title} className="w-full h-36 object-cover" />
                    )}
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-foreground font-bold text-lg">{event.title}</h3>
                        <Badge variant="outline" className="text-yellow-400 border-yellow-400/30 shrink-0">
                          <Clock className="w-3 h-3 mr-1" /> Pending
                        </Badge>
                      </div>
                      {event.description && (
                        <p className="text-muted-foreground text-sm line-clamp-2">{event.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(event.event_date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {event.location_name}
                        </span>
                      </div>
                      <div className="flex gap-3 pt-1">
                        <Button
                          onClick={() => handleReject(event.id)}
                          variant="outline"
                          className="flex-1 border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <XCircle className="w-4 h-4 mr-1" /> Ablehnen
                        </Button>
                        <Button
                          onClick={() => handleApprove(event.id)}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" /> Freigeben
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Top Events Tab */}
          <TabsContent value="featured" className="space-y-6 mt-4">
            {loading ? (
              <div className="text-center text-muted-foreground py-12">Laden...</div>
            ) : (
              <>
                {/* Current featured events */}
                {allEvents.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-foreground font-semibold text-sm">Aktuelle Top Events</h4>
                    {allEvents.map((event) => (
                      <div
                        key={event.id}
                        className="bg-card rounded-2xl overflow-hidden border border-yellow-400/50"
                      >
                        <div className="flex items-center gap-3 p-4">
                          {event.image_url ? (
                            <img src={event.image_url} alt={event.title} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center text-2xl shrink-0">📅</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-foreground font-bold text-sm truncate">{event.title}</h3>
                              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 shrink-0" />
                            </div>
                            <p className="text-muted-foreground text-xs">{formatDate(event.event_date)}</p>
                            <p className="text-muted-foreground text-xs truncate">{event.location_name}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <div className="flex flex-col">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                disabled={allEvents.indexOf(event) === 0}
                                onClick={() => moveEvent(event.id, "up")}
                              >
                                <ChevronUp className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                disabled={allEvents.indexOf(event) === allEvents.length - 1}
                                onClick={() => moveEvent(event.id, "down")}
                              >
                                <ChevronDown className="w-4 h-4" />
                              </Button>
                            </div>
                            <span className="text-muted-foreground text-xs font-mono w-5 text-center">
                              #{allEvents.indexOf(event) + 1}
                            </span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleFeatured(event.id, true)}
                              className="border-destructive/50 text-destructive hover:bg-destructive/10 shrink-0"
                            >
                              <StarOff className="w-4 h-4 mr-1" /> Entfernen
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new featured events */}
                <div className="space-y-3">
                  <h4 className="text-foreground font-semibold text-sm">Events hinzufügen</h4>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Event suchen..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  {filteredNonFeatured.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">Keine weiteren Events verfügbar.</p>
                  ) : (
                    filteredNonFeatured.map((event) => (
                      <div key={event.id} className="bg-card rounded-2xl overflow-hidden border border-border">
                        <div className="flex items-center gap-3 p-4">
                          {event.image_url ? (
                            <img src={event.image_url} alt={event.title} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center text-2xl shrink-0">📅</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-foreground font-bold text-sm truncate">{event.title}</h3>
                            <p className="text-muted-foreground text-xs">{formatDate(event.event_date)}</p>
                            <p className="text-muted-foreground text-xs truncate">{event.location_name}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleFeatured(event.id, false)}
                            className="border-yellow-400/50 text-yellow-400 hover:bg-yellow-400/10 shrink-0"
                          >
                            <Star className="w-4 h-4 mr-1" /> Hinzufügen
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default AdminEvents;
