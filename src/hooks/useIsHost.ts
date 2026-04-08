import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useIsHost() {
  const { user } = useAuth();
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsHost(false);
      setLoading(false);
      return;
    }

    const check = async () => {
      const { data, error } = await supabase
        .rpc('has_role', { _user_id: user.id, _role: 'professional_host' });
      setIsHost(!error && data === true);
      setLoading(false);
    };

    check();
  }, [user]);

  return { isHost, loading };
}
