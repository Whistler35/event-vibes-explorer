import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface JoinRequestButtonProps {
  eventId: string;
  eventOwnerId: string | null;
}

type RequestStatus = 'none' | 'pending' | 'accepted' | 'rejected' | 'cancelled';

const JoinRequestButton: React.FC<JoinRequestButtonProps> = ({ eventId, eventOwnerId }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<RequestStatus>('none');
  const [loading, setLoading] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) fetchStatus();
  }, [user, eventId]);

  const fetchStatus = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('join_requests')
      .select('status')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle();
    
    setStatus((data?.status as RequestStatus) || 'none');
  };

  const handleRequest = async () => {
    if (!user) {
      toast.error('Please log in');
      navigate('/auth');
      return;
    }
    if (user.id === eventOwnerId) {
      toast.info('You are the creator of this event');
      return;
    }

    if (status === 'none' && !showMessage) {
      setShowMessage(true);
      return;
    }

    if (status === 'none' && !message.trim()) {
      toast.error('Please leave a short message');
      return;
    }

    setLoading(true);
    try {
      if (status === 'none') {
        const { error } = await supabase.from('join_requests').insert({
          event_id: eventId,
          user_id: user.id,
          message: message.trim(),
        });
        if (error) throw error;
        setStatus('pending');
        setShowMessage(false);
        setMessage('');
        toast.success('Request sent!');
      } else if (status === 'pending') {
        const { error } = await supabase
          .from('join_requests')
          .update({ status: 'cancelled' as any })
          .eq('event_id', eventId)
          .eq('user_id', user.id);
        if (error) throw error;
        setStatus('cancelled');
        toast.info('Request withdrawn');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  if (user?.id === eventOwnerId) return null;

  const statusConfig: Record<RequestStatus, { label: string; icon: React.ElementType; variant: 'default' | 'outline' | 'secondary' }> = {
    none: { label: 'Request to join', icon: UserPlus, variant: 'default' },
    pending: { label: 'Request pending', icon: Clock, variant: 'outline' },
    accepted: { label: 'Accepted ✓', icon: CheckCircle, variant: 'secondary' },
    rejected: { label: 'Rejected', icon: XCircle, variant: 'secondary' },
    cancelled: { label: 'Request again', icon: UserPlus, variant: 'default' },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="space-y-2">
      {showMessage && status === 'none' && (
        <div className="space-y-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Kurze Nachricht an den Ersteller *"
            className="bg-muted border-border text-foreground placeholder:text-muted-foreground rounded-xl resize-none"
            rows={2}
          />
        </div>
      )}
      <Button
        onClick={handleRequest}
        disabled={loading || status === 'accepted' || status === 'rejected'}
        variant={config.variant}
        className={`w-full h-12 rounded-xl ${
          config.variant === 'default' ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : ''
        }`}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Icon className="w-4 h-4 mr-2" />
        )}
        {config.label}
      </Button>
    </div>
  );
};

export default JoinRequestButton;
