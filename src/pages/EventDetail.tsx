import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Calendar, Clock, MapPin, Users, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location_name: string;
  latitude: number;
  longitude: number;
  image_url?: string;
  max_participants: number;
  current_participants: number;
}

interface Participant {
  id: string;
  user_id: string;
  name: string;
  avatar_url?: string;
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
        .single();

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
      // First get event participants
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

      // Get user IDs
      const userIds = participantData.map(p => p.user_id);

      // Get profiles for these users
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, name, avatar_url')
        .in('user_id', userIds);

      if (profileError) throw profileError;

      // Combine the data
      const participantsWithProfiles = participantData.map(participant => {
        const profile = profileData?.find(p => p.user_id === participant.user_id);
        return {
          id: participant.id,
          user_id: participant.user_id,
          name: profile?.name || 'Unbekannter User',
          avatar_url: profile?.avatar_url
        };
      });

      setParticipants(participantsWithProfiles);
      
      // Check if current user is participant
      if (user) {
        const userParticipant = participantData.find(p => p.user_id === user.id);
        setIsParticipant(!!userParticipant);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  };

  const handleJoinEvent = async () => {
    console.log('handleJoinEvent called', { user, event, isParticipant });
    if (!user || !event) return;

    setJoinLoading(true);
    try {
      if (isParticipant) {
        // Leave event
        const { error } = await supabase
          .from('event_participants')
          .delete()
          .eq('event_id', event.id)
          .eq('user_id', user.id);

        if (error) throw error;
        toast.success('Du hast das Event verlassen');
        setIsParticipant(false);
      } else {
        // Join event
        const { error } = await supabase
          .from('event_participants')
          .insert({
            event_id: event.id,
            user_id: user.id
          });

        if (error) throw error;
        toast.success('Du bist dem Event beigetreten! Chat wurde erstellt.');
        setIsParticipant(true);
      }
      
      fetchParticipants();
    } catch (error: any) {
      console.error('Error joining/leaving event:', error);
      toast.error(error.message || 'Fehler beim Beitreten/Verlassen');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleOpenChat = () => {
    navigate(`/event-hangouts/${id}`);
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-4 flex items-center justify-center min-h-[50vh]">
          <div className="text-white">Lädt...</div>
        </div>
      </Layout>
    );
  }

  if (!event) {
    return (
      <Layout>
        <div className="p-4 flex items-center justify-center min-h-[50vh]">
          <div className="text-center space-y-4">
            <div className="text-white">Event nicht gefunden</div>
            <Button onClick={() => navigate('/events')}>
              Zurück zu Events
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const eventDate = new Date(event.event_date);
  const formattedDate = eventDate.toLocaleDateString('de-DE');
  const formattedTime = eventDate.toLocaleTimeString('de-DE', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <Layout>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-evendle-dark-card"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-white text-xl font-bold">Event Details</h1>
        </div>

        {/* Event Image */}
        {event.image_url && (
          <div className="w-full h-48 rounded-2xl overflow-hidden">
            <img 
              src={event.image_url} 
              alt={event.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Event Info */}
        <Card className="bg-evendle-dark-card border-evendle-gray">
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="text-white text-2xl font-bold mb-2">{event.title}</h2>
              <p className="text-evendle-light-gray">{event.description}</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-evendle-light-gray">
                <Calendar className="w-5 h-5" />
                <span>{formattedDate}</span>
              </div>

              <div className="flex items-center space-x-3 text-evendle-light-gray">
                <Clock className="w-5 h-5" />
                <span>{formattedTime}</span>
              </div>

              <div className="flex items-center space-x-3 text-evendle-light-gray">
                <MapPin className="w-5 h-5" />
                <span>{event.location_name}</span>
              </div>

              <div className="flex items-center space-x-3 text-evendle-light-gray">
                <Users className="w-5 h-5" />
                <span>{participants.length} / {event.max_participants} Teilnehmer</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Participants */}
        {participants.length > 0 && (
          <Card className="bg-evendle-dark-card border-evendle-gray">
            <CardContent className="p-6">
              <h3 className="text-white font-bold text-lg mb-4">Teilnehmer</h3>
              <div className="flex flex-wrap gap-3">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center space-x-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={participant.avatar_url} />
                      <AvatarFallback className="bg-evendle-orange text-white text-xs">
                        {participant.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-evendle-light-gray text-sm">
                      {participant.name}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {user ? (
            <>
              <Button
                onClick={handleJoinEvent}
                disabled={joinLoading}
                className={`w-full ${
                  isParticipant 
                    ? 'bg-evendle-gray hover:bg-evendle-gray/80 text-white' 
                    : 'bg-evendle-orange hover:bg-evendle-orange/80 text-white'
                }`}
              >
                {joinLoading ? 'Lädt...' : isParticipant ? 'Event verlassen' : 'Ich bin dabei!'}
              </Button>

              {isParticipant && (
                <Button
                  onClick={handleOpenChat}
                  variant="outline"
                  className="w-full border-evendle-orange text-evendle-orange hover:bg-evendle-orange hover:text-white"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Zum Gruppenchat
                </Button>
              )}
            </>
          ) : (
            <Button
              onClick={() => navigate('/auth')}
              className="w-full bg-evendle-orange hover:bg-evendle-orange/80 text-white"
            >
              Anmelden um beizutreten
            </Button>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default EventDetail;