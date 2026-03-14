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
import { ArrowLeft, Calendar, Clock, MapPin, Users, MessageCircle, Pencil } from "lucide-react";
import { toast } from "sonner";
import JoinRequestButton from "@/components/JoinRequestButton";
import JoinRequestList from "@/components/JoinRequestList";
import EditEventDialog from "@/components/EditEventDialog";

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
      toast.error('Event konnte nicht geladen werden');
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
          name: profile?.name || 'Unbekannter User',
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
      toast.error('Du musst eingeloggt sein um Events beizutreten');
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
        toast.success('Du bist dem Event beigetreten! Chat wurde erstellt.');
        setIsParticipant(true);
      }
      fetchParticipants();
    } catch (error: any) {
      toast.error(error.message || 'Fehler beim Beitreten/Verlassen');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleOpenChat = () => {
    navigate(`/event/${id}/chat`);
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-4 flex items-center justify-center min-h-[50vh]">
          <div className="text-foreground">Lädt...</div>
        </div>
      </Layout>
    );
  }

  if (!event) {
    return (
      <Layout>
        <div className="p-4 flex items-center justify-center min-h-[50vh]">
          <div className="text-center space-y-4">
            <div className="text-foreground">Event nicht gefunden</div>
            <Button onClick={() => navigate('/events')}>Zurück zu Events</Button>
          </div>
        </div>
      </Layout>
    );
  }

  const eventDate = new Date(event.event_date);
  const formattedDate = eventDate.toLocaleDateString('de-DE');
  const formattedTime = eventDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

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
                <span>{participants.length} / {event.max_participants || '∞'} Teilnehmer</span>
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
              <h3 className="text-foreground font-bold text-lg mb-4">Teilnehmer</h3>
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

        {/* Action Buttons */}
        <div className="space-y-3">
          {isCommunityEvent && !isOwner ? (
            <JoinRequestButton eventId={event.id} eventOwnerId={event.created_by} />
          ) : user ? (
            <>
              <Button
                onClick={handleJoinEvent}
                disabled={joinLoading}
                className={`w-full ${
                  isParticipant
                    ? 'bg-muted hover:bg-muted/80 text-foreground'
                    : 'bg-primary hover:bg-primary/80 text-primary-foreground'
                }`}
              >
                {joinLoading ? 'Lädt...' : isParticipant ? 'Event verlassen' : 'Ich bin dabei!'}
              </Button>

              {isParticipant && (
                <Button
                  onClick={handleOpenChat}
                  variant="outline"
                  className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Zum Gruppenchat
                </Button>
              )}
            </>
          ) : (
            <Button
              onClick={() => navigate('/auth')}
              className="w-full bg-primary hover:bg-primary/80 text-primary-foreground"
            >
              Anmelden um beizutreten
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
    </Layout>
  );
};

export default EventDetail;
