import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIsAdmin } from './useIsAdmin';

export function usePendingEventsCount() {
  const { isAdmin } = useIsAdmin();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;

    const fetch = async () => {
      const { count: c } = await supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('approval_status', 'pending');
      setCount(c ?? 0);
    };

    fetch();

    const channel = supabase
      .channel('pending-events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetch())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAdmin]);

  return { count, isAdmin };
}
