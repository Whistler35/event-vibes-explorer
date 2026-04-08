import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type EventCategory = 'music' | 'sports' | 'culture' | 'food' | 'nightlife' | 'outdoor' | 'community' | 'workshop' | 'other';
export type EventSource = 'curated' | 'imported' | 'community';

export interface SearchEventsParams {
  bbox?: { sw_lat: number; sw_lng: number; ne_lat: number; ne_lng: number };
  radius?: { lat: number; lng: number; meters: number };
  category?: EventCategory;
  categories?: EventCategory[];
  source?: EventSource;
  date_from?: string;
  date_to?: string;
  text?: string;
  limit?: number;
  offset?: number;
}

export interface SearchEvent {
  id: string;
  title: string;
  description: string | null;
  category: EventCategory | null;
  source: EventSource | null;
  visibility: string | null;
  event_date: string;
  end_time: string | null;
  location_name: string;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  max_participants: number | null;
  current_participants: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  is_featured: boolean;
}

interface SearchResult {
  data: SearchEvent[];
  total: number | null;
  limit: number;
  offset: number;
}

async function fetchSearchEvents(params: SearchEventsParams): Promise<SearchResult> {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  const res = await fetch(
    `https://${projectId}.supabase.co/functions/v1/search-events`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
      },
      body: JSON.stringify(params),
    }
  );

  if (!res.ok) {
    throw new Error(`Search failed: ${res.status}`);
  }

  return res.json();
}

export function useSearchEvents(params: SearchEventsParams, enabled = true) {
  return useQuery({
    queryKey: ['search-events', params],
    queryFn: () => fetchSearchEvents(params),
    enabled,
    staleTime: 30_000,
  });
}
