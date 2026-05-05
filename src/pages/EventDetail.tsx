import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Calendar, Clock, MapPin, Users, Pencil, ScanLine, Share2 } from "lucide-react";
import { toast } from "sonner";
import JoinRequestButton from "@/components/JoinRequestButton";
import JoinRequestList from "@/components/JoinRequestList";
import EditEventDialog from "@/components/EditEventDialog";
import EventJoinedConfirmation from "@/components/EventJoinedConfirmation";
import EventParticipantStatus from "@/components/EventParticipantStatus";

interface Event {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  location_name: string;
  latitude: number | null;
  longitude: number | null;
  image_url?: string | null;
  max_participants: number | null;
  current_participants: number | null;
  category: string | null;
  source: string | null;
  created_by: string | null;
}

interface Participant {
  id: string;
  user_id: string;
  name: string;
  avatar_url?: string | null;
}

const EventDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isParticipant, setIsParticipant] = useState(false);
  const [loading, setLoading] = useState(true);
  const [joinLoading, setJoinLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [showJoinedOverlay, setShowJoinedOverlay] = useState(false);
  const { isAdmin } = useIsAdmin();

  const isOwner = user && event?.created_by === user.id;
  const canEdit = isOwner || isAdmin;
  const isCommunityEvent = event?.source === 'community';

  useEffect(() => {
    if (id) {
      fetchEventDetails();
      fetchParticipants();
    }
  }, [id, user]);

  const fetchEventDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      setEvent(data);
    } catch (error) {
      console.error('Error fetching event:', error);
      toast.error('Could not load event');
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipants = async () => {
    try {
      const { data: participantData, error: participantError } = await supabase
        .from('event_participants')
        .select('id, user_id')
        .eq('event_id', id);

      if (participantError) throw participantError;
      if (!participantData || participantData.length === 0) {
        setParticipants([]);
        setIsParticipant(false);
        return;
      }

      const userIds = participantData.map(p => p.user_id);
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_id, name, avatar_url')
        .in('user_id', userIds);

      const participantsWithProfiles = participantData.map(participant => {
        const profile = profileData?.find(p => p.user_id === participant.user_id);
        return {
          id: participant.id,
          user_id: participant.user_id,
          name: profile?.name || 'Unknown user',
          avatar_url: profile?.avatar_url,
        };
      });

      setParticipants(participantsWithProfiles);
      if (user) {
        setIsParticipant(!!participantData.find(p => p.user_id === user.id));
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  const handleJoinEvent = async () => {
    if (!user) {
      toast.error('You must be signed in to join events');
      navigate('/auth');
      return;
    }
    if (!event) return;

    setJoinLoading(true);
    try {
      if (isParticipant) {
        const { error } = await supabase
          .from('event_participants')
          .delete()
          .eq('event_id', event.id)
          .eq('user_id', user.id);
        if (error) throw error;
        toast.success('Du hast das Event verlassen');
        setIsParticipant(false);
      } else {
        const { error } = await supabase
          .from('event_participants')
          .insert({ event_id: event.id, user_id: user.id })
          .select();
        if (error) throw error;
        setIsParticipant(true);
        setShowJoinedOverlay(true);
      }
      fetchParticipants();
    } catch (error: any) {
      toast.error(error.message || 'Error joining/leaving');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleConfirmationDone = () => {
    setShowJoinedOverlay(false);
    setTimeout(() => {
      document.getElementById('participant-status-block')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleShare = async () => {
    if (!event) return;
    const url = `${window.location.origin}/event/${event.id}`;
    const dateStr = new Date(event.event_date).toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const text = `${event.title}\n📅 ${dateStr}\n📍 ${event.location_name}\n\n${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: event.title, text, url });
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        try {
          await navigator.clipboard.writeText(text);
          toast.success('Link kopiert');
        } catch {
          toast.error('Teilen nicht möglich');
        }
      }
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-4 flex items-center justify-center min-h-[50vh]">
          <div className="text-foreground">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!event) {
    return (
      <Layout>
        <div className="p-4 flex items-center justify-center min-h-[50vh]">
          <div className="text-center space-y-4">
            <div className="text-foreground">Event not found</div>
            <Button onClick={() => navigate('/events')}>Back to events</Button>
          </div>
        </div>
      </Layout>
    );
  }

  const eventDate = new Date(event.event_date);
  const formattedDate = eventDate.toLocaleDateString('en-GB');
  const formattedTime = eventDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const categoryLabels: Record<string, string> = {
    music: 'Music', sports: 'Sports', culture: 'Culture', food: 'Food',
    nightlife: 'Nightlife', outdoor: 'Outdoor', community: 'Community',
    workshop: 'Workshop', other: 'Other',
  };

  return (
    <Layout>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-foreground hover:bg-card"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-foreground text-xl font-bold">Event Details</h1>
            {event.category && (
              <Badge variant="secondary" className="bg-primary/20 text-primary border-0">
                {categoryLabels[event.category] || event.category}
              </Badge>
            )}
            {isCommunityEvent && (
              <Badge variant="outline" className="border-primary text-primary text-xs">
                Community
              </Badge>
            )}
          </div>
          {canEdit && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setEditOpen(true)}
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            >
              <Pencil className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Event Image */}
        {event.image_url && (
          <div className="w-full h-48 rounded-2xl overflow-hidden">
            <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Event Info */}
        <Card className="bg-card border-border">
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="text-foreground text-2xl font-bold mb-2">{event.title}</h2>
              <p className="text-muted-foreground">{event.description}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-muted-foreground">
                <Calendar className="w-5 h-5" />
                <span>{formattedDate}</span>
              </div>
              <div className="flex items-center space-x-3 text-muted-foreground">
                <Clock className="w-5 h-5" />
                <span>{formattedTime}</span>
              </div>
              <div className="flex items-center space-x-3 text-muted-foreground">
                <MapPin className="w-5 h-5" />
                <span>{event.location_name}</span>
              </div>
              <div className="flex items-center space-x-3 text-muted-foreground">
                <Users className="w-5 h-5" />
                <span>{participants.length} / {event.max_participants || '∞'} participants</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Join Requests for Owner (Community Events) */}
        {isOwner && isCommunityEvent && (
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <JoinRequestList eventId={event.id} />
            </CardContent>
          </Card>
        )}

        {/* Participants */}
        {participants.length > 0 && (
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <h3 className="text-foreground font-bold text-lg mb-4">Participants</h3>
              <div className="flex flex-wrap gap-3">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center space-x-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={participant.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {participant.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-muted-foreground text-sm">{participant.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Section */}
        <div className="space-y-3">
          {isCommunityEvent && !isOwner && !isParticipant ? (
            <JoinRequestButton eventId={event.id} eventOwnerId={event.created_by} />
          ) : user ? (
            <>
              {isParticipant ? (
                <EventParticipantStatus
                  event={event}
                  userId={user.id}
                  participants={participants}
                  onLeave={handleJoinEvent}
                  leaveLoading={joinLoading}
                />
              ) : (
                <Button
                  onClick={handleJoinEvent}
                  disabled={joinLoading}
                  className="w-full bg-primary hover:bg-primary/80 text-primary-foreground h-12 text-base font-bold"
                >
                  {joinLoading ? 'Lädt...' : "I'm in!"}
                </Button>
              )}
              {canEdit && (
                <Button
                  onClick={() => navigate(`/event/${id}/checkin`)}
                  variant="outline"
                  className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <ScanLine className="w-4 h-4 mr-2" />
                  Tickets scannen (Check-in)
                </Button>
              )}
            </>
          ) : (
            <Button
              onClick={() => navigate('/auth')}
              className="w-full bg-primary hover:bg-primary/80 text-primary-foreground"
            >
              Anmelden um teilzunehmen
            </Button>
          )}
        </div>
        {canEdit && event && (
          <EditEventDialog
            open={editOpen}
            onClose={() => setEditOpen(false)}
            event={event}
            onEventUpdated={() => fetchEventDetails()}
          />
        )}
      </div>
      {showJoinedOverlay && event && (
        <EventJoinedConfirmation
          eventTitle={event.title}
          eventDate={event.event_date}
          onDone={handleConfirmationDone}
        />
      )}
    </Layout>
  );
};

export default EventDetail;
