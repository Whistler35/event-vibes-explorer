import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  Building2, CheckCircle, XCircle, Eye, Users, CalendarDays,
  CreditCard, Loader2, ShieldCheck, Ban, Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { toast } from 'sonner';

interface HostRow {
  id: string;
  user_id: string;
  company_name: string | null;
  is_verified: boolean;
  status: string;
  total_events_created: number;
  total_revenue_cents: number;
  created_at: string;
  current_plan_id: string | null;
  // joined
  profile_name: string;
  profile_email: string;
  plan_name: string;
  plan_slug: string;
  event_count: number;
}

const AdminHostManagement = () => {
  const { t } = useTranslation();
  const [hosts, setHosts] = useState<HostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionDialog, setActionDialog] = useState<{
    host: HostRow;
    action: 'verify' | 'suspend' | 'activate' | 'delete';
  } | null>(null);

  useEffect(() => {
    fetchHosts();
  }, []);

  const fetchHosts = async () => {
    setLoading(true);

    // Fetch host profiles
    const { data: hostData, error } = await supabase
      .from('host_profiles')
      .select('*')
      .order('created_at', { ascending: false }) as any;

    if (error || !hostData) {
      setLoading(false);
      return;
    }

    // Enrich with profile names, plans, and event counts
    const enriched: HostRow[] = await Promise.all(
      hostData.map(async (h: any) => {
        const [profileRes, planRes, eventsRes] = await Promise.all([
          supabase.from('profiles').select('name').eq('user_id', h.user_id).single(),
          h.current_plan_id
            ? supabase.from('subscription_plans').select('name, slug').eq('id', h.current_plan_id).single()
            : Promise.resolve({ data: null }),
          supabase.from('events').select('id', { count: 'exact', head: true }).eq('created_by', h.user_id),
        ]);

        return {
          ...h,
          profile_name: profileRes.data?.name || t('adminHosts.unknown'),
          profile_email: '',
          plan_name: planRes.data?.name || t('adminHosts.noPlan'),
          plan_slug: planRes.data?.slug || '',
          event_count: eventsRes.count || 0,
        };
      })
    );

    setHosts(enriched);
    setLoading(false);
  };

  const handleAction = async () => {
    if (!actionDialog) return;
    const { host, action } = actionDialog;

    if (action === 'verify') {
      await supabase
        .from('host_profiles')
        .update({ is_verified: true } as any)
        .eq('id', host.id);
      toast.success(t('adminHosts.verified', { name: host.profile_name }));
    } else if (action === 'suspend') {
      await supabase
        .from('host_profiles')
        .update({ status: 'suspended' } as any)
        .eq('id', host.id);
      toast.success(t('adminHosts.suspendedToast', { name: host.profile_name }));
    } else if (action === 'activate') {
      await supabase
        .from('host_profiles')
        .update({ status: 'active' } as any)
        .eq('id', host.id);
      toast.success(t('adminHosts.activatedToast', { name: host.profile_name }));
    } else if (action === 'delete') {
      await supabase.from('host_profiles').delete().eq('id', host.id);
      toast.success(t('adminHosts.deletedToast', { name: host.profile_name }));
    }

    setActionDialog(null);
    fetchHosts();
  };

  const actionLabels = {
    verify: { titleKey: 'adminHosts.actions.verify', icon: CheckCircle },
    suspend: { titleKey: 'adminHosts.actions.suspend', icon: Ban },
    activate: { titleKey: 'adminHosts.actions.activate', icon: CheckCircle },
    delete: { titleKey: 'adminHosts.actions.delete', icon: Trash2 },
  } as const;

  // Stats
  const totalHosts = hosts.length;
  const activeHosts = hosts.filter((h) => h.status === 'active').length;
  const totalRevenue = hosts.reduce((s, h) => s + h.total_revenue_cents, 0);
  const totalEvents = hosts.reduce((s, h) => s + h.event_count, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <Building2 className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-foreground font-bold text-lg">{totalHosts}</p>
            <p className="text-muted-foreground text-[10px]">{t('adminHosts.totalHosts')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <CheckCircle className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-foreground font-bold text-lg">{activeHosts}</p>
            <p className="text-muted-foreground text-[10px]">{t('adminHosts.activeHosts')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <CalendarDays className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-foreground font-bold text-lg">{totalEvents}</p>
            <p className="text-muted-foreground text-[10px]">{t('adminHosts.totalEvents')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <CreditCard className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-foreground font-bold text-lg">
              €{(totalRevenue / 100).toFixed(0)}
            </p>
            <p className="text-muted-foreground text-[10px]">{t('adminHosts.totalRevenue')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Host List */}
      {hosts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {t('adminHosts.noHosts')}
        </div>
      ) : (
        <div className="space-y-3">
          {hosts.map((host) => (
            <Card key={host.id}>
              <CardContent className="p-4 space-y-3">
                {/* Host info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-foreground font-semibold text-sm truncate">
                          {host.profile_name}
                        </p>
                        {host.is_verified && (
                          <ShieldCheck className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        )}
                      </div>
                      {host.company_name && (
                        <p className="text-muted-foreground text-xs truncate">{host.company_name}</p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={host.status === 'active' ? 'default' : 'destructive'}
                    className="text-[10px] flex-shrink-0"
                  >
                    {host.status === 'active' ? t('adminHosts.active') : host.status === 'suspended' ? t('adminHosts.suspended') : host.status}
                  </Badge>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-1.5 rounded bg-muted/50">
                    <p className="text-foreground font-bold text-xs">{host.plan_name}</p>
                    <p className="text-muted-foreground text-[9px]">{t('adminHosts.plan')}</p>
                  </div>
                  <div className="p-1.5 rounded bg-muted/50">
                    <p className="text-foreground font-bold text-xs">{host.event_count}</p>
                    <p className="text-muted-foreground text-[9px]">{t('adminHosts.events')}</p>
                  </div>
                  <div className="p-1.5 rounded bg-muted/50">
                    <p className="text-foreground font-bold text-xs">
                      €{(host.total_revenue_cents / 100).toFixed(0)}
                    </p>
                    <p className="text-muted-foreground text-[9px]">{t('adminHosts.revenue')}</p>
                  </div>
                  <div className="p-1.5 rounded bg-muted/50">
                    <p className="text-foreground font-bold text-xs">
                      {format(new Date(host.created_at), 'MM/yy')}
                    </p>
                    <p className="text-muted-foreground text-[9px]">{t('adminHosts.since')}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {!host.is_verified && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => setActionDialog({ host, action: 'verify' })}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 mr-1" /> {t('adminHosts.verify')}
                    </Button>
                  )}
                  {host.status === 'active' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs text-destructive border-destructive/30"
                      onClick={() => setActionDialog({ host, action: 'suspend' })}
                    >
                      <Ban className="w-3.5 h-3.5 mr-1" /> {t('adminHosts.suspend')}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => setActionDialog({ host, action: 'activate' })}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1" /> {t('adminHosts.activate')}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-destructive"
                    onClick={() => setActionDialog({ host, action: 'delete' })}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Action Confirmation Dialog */}
      {actionDialog && (() => {
        const info = actionLabels[actionDialog.action];
        return (
          <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t(`${info.titleKey}.title`)}</DialogTitle>
                <DialogDescription>
                  {t('adminHosts.confirm', { desc: t(`${info.titleKey}.desc`), name: actionDialog.host.profile_name })}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setActionDialog(null)}>{t('adminHosts.cancel')}</Button>
                <Button
                  variant={actionDialog.action === 'delete' || actionDialog.action === 'suspend' ? 'destructive' : 'default'}
                  onClick={handleAction}
                >
                  {t(`${info.titleKey}.btn`)}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
};

export default AdminHostManagement;
