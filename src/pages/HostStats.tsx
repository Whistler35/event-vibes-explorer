import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsHost } from '@/hooks/useIsHost';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Eye, Users, TrendingUp, Clock, ChevronDown, ChevronUp, Loader2
} from 'lucide-react';
import { format, subDays, subHours, addDays } from 'date-fns';
import { de, enGB } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

interface HostEvent {
  id: string;
  title: string;
  event_date: string;
  location_name: string;
  category: string | null;
  approval_status: string;
  current_participants: number | null;
  max_participants: number | null;
  image_url: string | null;
}

// Generate deterministic mock data based on event id
function generateMockStats(event: HostEvent, dateLocale: any) {
  const hash = event.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const totalViews = 80 + (hash % 500);
  const totalRegistrations = Math.floor(totalViews * (0.06 + (hash % 25) / 100));
  const conversionRate = ((totalRegistrations / totalViews) * 100).toFixed(1);

  // Views over time (last 14 days)
  const viewsOverTime = Array.from({ length: 14 }, (_, i) => {
    const date = subDays(new Date(), 13 - i);
    const base = Math.floor(totalViews / 14);
    const spike = i === 7 || i === 10 ? base * 2 : 0;
    const views = base + Math.floor(Math.random() * base * 0.6) + spike;
    return {
      date: format(date, 'dd.MM', { locale: dateLocale }),
      views,
      registrations: Math.floor(views * (totalRegistrations / totalViews)),
    };
  });

  // Peak hours (0-23)
  const peakHours = Array.from({ length: 24 }, (_, hour) => {
    let factor = 0.2;
    if (hour >= 8 && hour <= 10) factor = 0.6 + (hash % 3) * 0.1;
    if (hour >= 12 && hour <= 14) factor = 0.8;
    if (hour >= 17 && hour <= 21) factor = 1.0;
    if (hour >= 22 || hour <= 5) factor = 0.15;
    const views = Math.floor(totalViews / 24 * factor * (1 + Math.random() * 0.3));
    return { hour: `${hour}:00`, views };
  });

  // Participants mock
  const participantNames = [
    'Max M.', 'Anna S.', 'Leon K.', 'Sophie B.', 'Tim W.',
    'Laura H.', 'Jonas F.', 'Marie L.', 'Finn D.', 'Emma R.',
    'Paul G.', 'Lena T.', 'Noah A.', 'Mia C.', 'Elias P.',
  ];
  const participants = participantNames
    .slice(0, Math.min(totalRegistrations, participantNames.length))
    .map((name, i) => ({
      name,
      signupDate: format(subDays(new Date(), 14 - i), 'dd. MMM yyyy', { locale: dateLocale }),
    }));

  return {
    totalViews,
    totalRegistrations,
    conversionRate,
    viewsOverTime,
    peakHours,
    participants,
  };
}

const HostStats = () => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language.startsWith('de') ? de : enGB;
  const { user } = useAuth();
  const { isHost, loading: hostLoading } = useIsHost();
  const navigate = useNavigate();
  const [events, setEvents] = useState<HostEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  useEffect(() => {
    if (!user || hostLoading) return;
    if (!isHost) { navigate('/profile'); return; }

    const fetch = async () => {
      const { data } = await supabase
        .from('events')
        .select('id, title, event_date, location_name, category, approval_status, current_participants, max_participants, image_url')
        .eq('created_by', user.id)
        .order('event_date', { ascending: false });
      setEvents(data || []);
      if (data && data.length > 0) setExpandedEvent(data[0].id);
      setLoading(false);
    };
    fetch();
  }, [user, isHost, hostLoading]);

  if (hostLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[70vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  // Aggregate stats
  const allStats = events.map((e) => ({ event: e, stats: generateMockStats(e, dateLocale) }));
  const totalViews = allStats.reduce((s, a) => s + a.stats.totalViews, 0);
  const totalRegs = allStats.reduce((s, a) => s + a.stats.totalRegistrations, 0);

  return (
    <Layout>
      <div className="p-4 pb-24 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/host/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-foreground text-xl font-bold">{t('host.statsTitle')}</h1>
            <p className="text-muted-foreground text-xs">{t('host.eventsCount', { count: events.length })}</p>
          </div>
        </div>

        {/* Global Overview */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <Eye className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-foreground font-bold text-lg">{totalViews}</p>
              <p className="text-muted-foreground text-[10px]">{t('host.totalViews')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Users className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-foreground font-bold text-lg">{totalRegs}</p>
              <p className="text-muted-foreground text-[10px]">{t('host.registrations')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <TrendingUp className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-foreground font-bold text-lg">
                {totalViews > 0 ? ((totalRegs / totalViews) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-muted-foreground text-[10px]">{t('host.conversion')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Per-Event Stats */}
        {events.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">{t('host.noEventsCreated')}</div>
        ) : (
          <div className="space-y-3">
            {allStats.map(({ event, stats }) => {
              const isExpanded = expandedEvent === event.id;
              return (
                <Card key={event.id}>
                  {/* Event Header — always visible */}
                  <button
                    onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
                    className="w-full text-left"
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-sm truncate">{event.title}</CardTitle>
                          <p className="text-muted-foreground text-xs mt-0.5">
                            {format(new Date(event.event_date), 'dd. MMM yyyy', { locale: dateLocale })} · {event.location_name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right text-xs">
                            <span className="text-foreground font-semibold">{stats.totalViews}</span>
                            <span className="text-muted-foreground"> {t('host.views')}</span>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <CardContent className="p-4 pt-0 space-y-5">
                      {/* Key metrics */}
                      <div className="grid grid-cols-3 gap-2 pt-2">
                        <div className="text-center p-2 rounded-lg bg-muted/50">
                          <p className="text-foreground font-bold">{stats.totalViews}</p>
                          <p className="text-muted-foreground text-[10px]">{t('host.views')}</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-muted/50">
                          <p className="text-foreground font-bold">{stats.totalRegistrations}</p>
                          <p className="text-muted-foreground text-[10px]">{t('host.registrations')}</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-muted/50">
                          <p className="text-foreground font-bold">{stats.conversionRate}%</p>
                          <p className="text-muted-foreground text-[10px]">{t('host.conversion')}</p>
                        </div>
                      </div>

                      {/* Views over time chart */}
                      <div>
                        <h4 className="text-foreground text-xs font-semibold mb-2">{t('host.viewsAndRegs')}</h4>
                        <div className="h-40">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.viewsOverTime}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis
                                dataKey="date"
                                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                tickLine={false}
                              />
                              <YAxis
                                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                                tickLine={false}
                                width={30}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--card))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                }}
                              />
                              <Line
                                type="monotone"
                                dataKey="views"
                                stroke="hsl(var(--primary))"
                                strokeWidth={2}
                                dot={false}
                                name="Views"
                              />
                              <Line
                                type="monotone"
                                dataKey="registrations"
                                stroke="hsl(var(--accent-foreground))"
                                strokeWidth={2}
                                dot={false}
                                name="Anmeldungen"
                                strokeDasharray="4 4"
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Peak hours chart */}
                      <div>
                        <h4 className="text-foreground text-xs font-semibold mb-2 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Peak-Zeiten
                        </h4>
                        <div className="h-32">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.peakHours}>
                              <XAxis
                                dataKey="hour"
                                tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
                                tickLine={false}
                                interval={3}
                              />
                              <YAxis hide />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--card))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                }}
                              />
                              <Bar
                                dataKey="views"
                                fill="hsl(var(--primary))"
                                radius={[2, 2, 0, 0]}
                                name="Views"
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Participant list */}
                      <div>
                        <h4 className="text-foreground text-xs font-semibold mb-2 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" /> Teilnehmer ({stats.participants.length})
                        </h4>
                        {stats.participants.length === 0 ? (
                          <p className="text-muted-foreground text-xs">Noch keine Teilnehmer</p>
                        ) : (
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {stats.participants.map((p, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50 text-xs"
                              >
                                <span className="text-foreground font-medium">{p.name}</span>
                                <span className="text-muted-foreground">{p.signupDate}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default HostStats;
