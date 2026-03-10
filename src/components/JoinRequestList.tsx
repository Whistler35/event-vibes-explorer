import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Check, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface JoinRequest {
  id: string;
  user_id: string;
  status: string;
  message: string | null;
  created_at: string;
  profile?: { name: string; avatar_url: string | null };
}

interface JoinRequestListProps {
  eventId: string;
}

const JoinRequestList: React.FC<JoinRequestListProps> = ({ eventId }) => {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, [eventId]);

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('join_requests')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) { setLoading(false); return; }

    // Fetch profiles
    const userIds = (data || []).map(r => r.user_id);
    if (userIds.length === 0) { setRequests([]); setLoading(false); return; }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, name, avatar_url')
      .in('user_id', userIds);

    const enriched = (data || []).map(r => ({
      ...r,
      profile: profiles?.find(p => p.user_id === r.user_id),
    }));

    setRequests(enriched);
    setLoading(false);
  };

  const handleUpdate = async (requestId: string, newStatus: 'accepted' | 'rejected') => {
    setUpdating(requestId);
    try {
      const { error } = await supabase
        .from('join_requests')
        .update({ status: newStatus as any })
        .eq('id', requestId);

      if (error) throw error;

      // If accepted, also add to event_participants
      if (newStatus === 'accepted') {
        const req = requests.find(r => r.id === requestId);
        if (req) {
          await supabase.from('event_participants').insert({
            event_id: eventId,
            user_id: req.user_id,
          });
        }
      }

      toast.success(newStatus === 'accepted' ? 'Angenommen!' : 'Abgelehnt');
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message || 'Fehler');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) return <div className="text-muted-foreground text-sm">Lädt Anfragen...</div>;
  if (requests.length === 0) return null;

  const pending = requests.filter(r => r.status === 'pending');
  const resolved = requests.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-3">
      <h3 className="text-foreground font-bold text-lg">
        Teilnahme-Anfragen {pending.length > 0 && <span className="text-primary">({pending.length})</span>}
      </h3>

      {pending.map(req => (
        <div key={req.id} className="flex items-center gap-3 p-3 bg-muted rounded-xl">
          <Avatar className="w-10 h-10">
            <AvatarImage src={req.profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {req.profile?.name?.[0] || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-foreground font-medium text-sm">{req.profile?.name || 'Unbekannt'}</p>
            {req.message && <p className="text-muted-foreground text-xs truncate">{req.message}</p>}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => handleUpdate(req.id, 'accepted')}
              disabled={updating === req.id}
              className="bg-green-600 hover:bg-green-700 text-white rounded-full w-8 h-8 p-0"
            >
              {updating === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleUpdate(req.id, 'rejected')}
              disabled={updating === req.id}
              className="border-destructive text-destructive hover:bg-destructive/10 rounded-full w-8 h-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}

      {resolved.length > 0 && (
        <div className="space-y-1">
          {resolved.map(req => (
            <div key={req.id} className="flex items-center gap-2 text-xs text-muted-foreground px-1">
              <span>{req.profile?.name || 'Unbekannt'}</span>
              <span>–</span>
              <span className={req.status === 'accepted' ? 'text-green-500' : 'text-destructive'}>
                {req.status === 'accepted' ? 'Angenommen' : req.status === 'rejected' ? 'Abgelehnt' : 'Zurückgezogen'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JoinRequestList;
