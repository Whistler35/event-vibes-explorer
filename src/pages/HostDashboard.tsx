import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsHost } from '@/hooks/useIsHost';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CalendarPlus, BarChart3, CreditCard, Eye, Users, TrendingUp,
  Clock, CheckCircle, FileText, Pencil, Trash2, Star, Loader2
} from 'lucide-react';
import CreateEventDialog from '@/components/CreateEventDialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de, enGB } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

interface HostEvent {
  id: string;
  title: string;
  event_date: string;
  end_time: string | null;
  location_name: string;
  category: string | null;
  approval_status: string;
  is_featured: boolean;
  current_participants: number | null;
  max_participants: number | null;
  image_url: string | null;
}

interface PlanInfo {
  name: string;
  slug: string;
  included_events: number | null;
  price_cents: number;
  additional_event_price_cents: number | null;
}

interface EventStats {
  views: number;
  uniqueViewers: number;
}


const HostDashboard = () => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language.startsWith('de') ? de : enGB;
  const { user } = useAuth();
  const { isHost, loading: hostLoading } = useIsHost();
  const navigate = useNavigate();

  const [events, setEvents] = useState<HostEvent[]>([]);
  const [statsByEvent, setStatsByEvent] = useState<Record<string, EventStats>>({});
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [eventsUsed, setEventsUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    if (!user || hostLoading) return;
    if (!isHost) {
      navigate('/profile');
      return;
    }
    fetchData();
  }, [user, isHost, hostLoading]);

  const fetchData = async () => {
    if (!user) return;

    // Fetch host events
    const { data: eventsData } = await supabase
      .from('events')
      .select('id, title, event_date, end_time, location_name, category, approval_status, is_featured, current_participants, max_participants, image_url')
      .eq('created_by', user.id)
      .order('event_date', { ascending: false });

    const list = eventsData || [];
    setEvents(list);
    setEventsUsed(list.length);

    // Fetch real view stats for these events
    if (list.length > 0) {
      const ids = list.map((e) => e.id);
      const { data: viewsData } = await supabase
        .from('event_views')
        .select('event_id, viewer_id, session_id')
        .in('event_id', ids);

      const agg: Record<string, { views: number; viewers: Set<string> }> = {};
      (viewsData || []).forEach((v: any) => {
        const key = v.event_id as string;
        if (!agg[key]) agg[key] = { views: 0, viewers: new Set() };
        agg[key].views += 1;
        agg[key].viewers.add(v.viewer_id || v.session_id || Math.random().toString());
      });
      const stats: Record<string, EventStats> = {};
      Object.entries(agg).forEach(([id, v]) => {
        stats[id] = { views: v.views, uniqueViewers: v.viewers.size };
      });
      setStatsByEvent(stats);
    }

    // Fetch host profile + plan
    const { data: hostProfile } = await supabase
      .from('host_profiles')
      .select('current_plan_id')
      .eq('user_id', user.id)
      .single() as any;

    if (hostProfile?.current_plan_id) {
      const { data: planData } = await supabase
        .from('subscription_plans')
        .select('name, slug, included_events, price_cents, additional_event_price_cents')
        .eq('id', hostProfile.current_plan_id)
        .single();
      if (planData) setPlan(planData);
    }

    setLoading(false);
  };

  const handleDelete = async (eventId: string) => {
    const { error } = await supabase.from('events').delete().eq('id', eventId);
    if (error) {
      toast.error(t('host.deleteFailed'));
    } else {
      toast.success(t('host.deleted'));
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
    }
  };

  if (hostLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[70vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const now = new Date();
  const activeEvents = events.filter((e) => new Date(e.event_date) >= now && e.approval_status === 'approved');
  const pendingEvents = events.filter((e) => e.approval_status === 'pending');
  const expiredEvents = events.filter((e) => new Date(e.event_date) < now);

  const totalViews = events.reduce((sum, e) => sum + getMockStats(e.id).views, 0);
  const totalRegistrations = events.reduce((sum, e) => sum + getMockStats(e.id).registrations, 0);

  return (
    <Layout>
      <div className="p-4 pb-24 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-foreground text-2xl font-bold">{t('host.dashboard')}</h1>
            <p className="text-muted-foreground text-sm">
              {plan ? plan.name : t('host.noPlan')} · {t('host.eventsCreated', { count: eventsUsed })}
            </p>
          </div>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <CalendarPlus className="w-4 h-4 mr-1" />
            {t('host.newEvent')}
          </Button>
        </div>

        {/* Plan Counter */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-foreground font-semibold text-sm">{t('host.eventQuota')}</p>
                  <p className="text-muted-foreground text-xs">
                    {plan?.included_events === null
                      ? t('host.unlimitedEvents')
                      : plan?.included_events === 0
                      ? t('host.payPerEvent')
                      : t('host.ofUsed', { used: eventsUsed, total: plan?.included_events })}
                  </p>
                </div>
              </div>
              {plan?.included_events !== null && plan?.included_events !== 0 && (
                <div className="text-right">
                  <p className="text-foreground font-bold text-lg">
                    {eventsUsed}/{plan?.included_events}
                  </p>
                  <div className="w-24 h-2 bg-muted rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min(100, (eventsUsed / (plan?.included_events || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
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
              <p className="text-foreground font-bold text-lg">{totalRegistrations}</p>
              <p className="text-muted-foreground text-[10px]">{t('host.registrations')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <TrendingUp className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-foreground font-bold text-lg">
                {totalViews > 0 ? ((totalRegistrations / totalViews) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-muted-foreground text-[10px]">{t('host.conversion')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Event Tabs */}
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="active" className="text-xs">
              {t('host.active')} ({activeEvents.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs">
              {t('host.pending')} ({pendingEvents.length})
            </TabsTrigger>
            <TabsTrigger value="expired" className="text-xs">
              {t('host.expired')} ({expiredEvents.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-3 mt-3">
            {activeEvents.length === 0 ? (
              <EmptyState text={t('host.noActive')} />
            ) : (
              activeEvents.map((event) => (
                <EventRow key={event.id} event={event} onDelete={handleDelete} onNavigate={navigate} dateLocale={dateLocale} t={t} />
              ))
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-3 mt-3">
            {pendingEvents.length === 0 ? (
              <EmptyState text={t('host.noPending')} />
            ) : (
              pendingEvents.map((event) => (
                <EventRow key={event.id} event={event} onDelete={handleDelete} onNavigate={navigate} dateLocale={dateLocale} t={t} />
              ))
            )}
          </TabsContent>

          <TabsContent value="expired" className="space-y-3 mt-3">
            {expiredEvents.length === 0 ? (
              <EmptyState text={t('host.noExpired')} />
            ) : (
              expiredEvents.map((event) => (
                <EventRow key={event.id} event={event} onDelete={handleDelete} onNavigate={navigate} dateLocale={dateLocale} t={t} />
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* Bottom Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="w-full" onClick={() => navigate('/host/stats')}>
            <BarChart3 className="w-4 h-4 mr-2" />
            {t('host.stats')}
          </Button>
          <Button variant="outline" className="w-full" onClick={() => navigate('/host/billing')}>
            <CreditCard className="w-4 h-4 mr-2" />
            {t('host.billing')}
          </Button>
        </div>

        {/* Create Event Dialog */}
        <CreateEventDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          position={null}
          onEventCreated={() => {
            setShowCreateDialog(false);
            fetchData();
          }}
        />
      </div>
    </Layout>
  );
};

function EventRow({
  event,
  onDelete,
  onNavigate,
  dateLocale,
  t,
}: {
  event: HostEvent;
  onDelete: (id: string) => void;
  onNavigate: (path: string) => void;
  dateLocale: any;
  t: (key: string, opts?: any) => string;
}) {
  const stats = getMockStats(event.id);
  const statusBadge = {
    approved: { label: t('host.approved'), variant: 'default' as const },
    pending: { label: t('host.pending'), variant: 'secondary' as const },
    rejected: { label: t('host.rejected'), variant: 'destructive' as const },
  }[event.approval_status] || { label: event.approval_status, variant: 'outline' as const };

  return (
    <Card className="overflow-hidden">
      <div className="flex">
        {/* Image */}
        <div className="w-20 h-20 flex-shrink-0 bg-muted">
          {event.image_url ? (
            <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <CalendarPlus className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-foreground font-semibold text-sm truncate">{event.title}</h3>
                {event.is_featured && <Star className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />}
              </div>
              <p className="text-muted-foreground text-xs truncate">
                {format(new Date(event.event_date), 'dd. MMM yyyy, HH:mm', { locale: dateLocale })} · {event.location_name}
              </p>
            </div>
            <Badge variant={statusBadge.variant} className="text-[10px] flex-shrink-0">
              {statusBadge.label}
            </Badge>
          </div>

          {/* Mini stats */}
          <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Eye className="w-3 h-3" /> {stats.views}
            </span>
            <span className="flex items-center gap-0.5">
              <Users className="w-3 h-3" /> {stats.registrations}
            </span>
            <span className="flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> {stats.conversionRate}%
            </span>
            <div className="flex-1" />
            <button
              onClick={() => onNavigate(`/event/${event.id}`)}
              className="p-1 rounded hover:bg-muted"
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button
              onClick={() => {
                if (confirm(t('host.deleteConfirm'))) onDelete(event.id);
              }}
              className="p-1 rounded hover:bg-destructive/10"
            >
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-8">
      <p className="text-muted-foreground text-sm">{text}</p>
    </div>
  );
}

export default HostDashboard;
