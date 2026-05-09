import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsHost } from '@/hooks/useIsHost';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  ArrowLeft, CreditCard, FileText, Check, Crown, Zap, Rocket,
  Star, Download, Loader2, CalendarDays, ArrowUpRight
} from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { de, enGB } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface Plan {
  id: string;
  name: string;
  slug: string;
  price_cents: number;
  included_events: number | null;
  additional_event_price_cents: number | null;
  description: string | null;
  sort_order: number;
}

interface Invoice {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  description: string | null;
  invoice_number: string | null;
  created_at: string;
}

const planIcons: Record<string, typeof Zap> = {
  'pay-per-event': CreditCard,
  'starter': Zap,
  'growth': Rocket,
  'pro': Crown,
};

// Mock invoices
function getMockInvoices(planName: string): Invoice[] {
  const now = new Date();
  return [
    {
      id: '1', amount_cents: 4900, currency: 'EUR', status: 'paid',
      description: `${planName} – März 2026`, invoice_number: 'INV-2026-003',
      created_at: new Date(2026, 2, 1).toISOString(),
    },
    {
      id: '2', amount_cents: 4900, currency: 'EUR', status: 'paid',
      description: `${planName} – Februar 2026`, invoice_number: 'INV-2026-002',
      created_at: new Date(2026, 1, 1).toISOString(),
    },
    {
      id: '3', amount_cents: 2990, currency: 'EUR', status: 'paid',
      description: 'Standard Event – Einzelkauf', invoice_number: 'INV-2026-001',
      created_at: new Date(2026, 0, 15).toISOString(),
    },
  ];
}

const HostBilling = () => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language.startsWith('de') ? de : enGB;
  const { user } = useAuth();
  const { isHost, loading: hostLoading } = useIsHost();
  const navigate = useNavigate();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [eventsUsed, setEventsUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [changePlanDialog, setChangePlanDialog] = useState(false);
  const [selectedNewPlan, setSelectedNewPlan] = useState<Plan | null>(null);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [payPerEventDialog, setPayPerEventDialog] = useState(false);
  const [payPerEventType, setPayPerEventType] = useState<'standard' | 'top'>('standard');

  useEffect(() => {
    if (!user || hostLoading) return;
    if (!isHost) { navigate('/profile'); return; }
    fetchData();
  }, [user, isHost, hostLoading]);

  const fetchData = async () => {
    if (!user) return;

    const [plansRes, hostRes, eventsRes] = await Promise.all([
      supabase.from('subscription_plans').select('*').order('sort_order'),
      supabase.from('host_profiles').select('current_plan_id').eq('user_id', user.id).single() as any,
      supabase.from('events').select('id', { count: 'exact', head: true }).eq('created_by', user.id),
    ]);

    const allPlans = (plansRes.data || []) as Plan[];
    setPlans(allPlans);
    setEventsUsed(eventsRes.count || 0);

    if (hostRes.data?.current_plan_id) {
      const cp = allPlans.find((p) => p.id === hostRes.data.current_plan_id);
      if (cp) setCurrentPlan(cp);
    }

    setLoading(false);
  };

  const handleChangePlan = (plan: Plan) => {
    setSelectedNewPlan(plan);
    setChangePlanDialog(false);
    setConfirmDialog(true);
  };

  const confirmPlanChange = async () => {
    if (!selectedNewPlan || !user) return;

    // Update host profile with new plan
    await supabase
      .from('host_profiles')
      .update({ current_plan_id: selectedNewPlan.id } as any)
      .eq('user_id', user.id);

    setCurrentPlan(selectedNewPlan);
    setConfirmDialog(false);
    toast.success(t('host.planChangedTo', { plan: selectedNewPlan.name }));
  };

  const handlePayPerEvent = () => {
    toast.success(
      payPerEventType === 'standard'
        ? t('host.bookedStandardDemo')
        : t('host.bookedTopDemo')
    );
    setPayPerEventDialog(false);
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

  const nextBillingDate = format(addMonths(new Date(), 1), 'dd. MMMM yyyy', { locale: dateLocale });
  const invoices = getMockInvoices(currentPlan?.name || 'Starter');

  return (
    <Layout>
      <div className="p-4 pb-24 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/host/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-foreground text-xl font-bold">{t('host.billingTitle')}</h1>
        </div>

        {/* Current Plan */}
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {currentPlan && (() => {
                  const Icon = planIcons[currentPlan.slug] || CreditCard;
                  return <Icon className="w-5 h-5 text-primary" />;
                })()}
                <CardTitle className="text-lg">{currentPlan?.name || t('host.noPlan')}</CardTitle>
              </div>
              <Badge variant="default" className="text-xs">{t('host.currentPlanBadge')}</Badge>
            </div>
            <CardDescription>{currentPlan?.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">{t('host.monthlyPrice')}</p>
                <p className="text-foreground font-bold">
                  {currentPlan?.price_cents === 0
                    ? t('host.noSubscription')
                    : `€${(currentPlan?.price_cents || 0 / 100).toFixed(2).replace('.', ',')}`}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{t('host.eventsThisMonth')}</p>
                <p className="text-foreground font-bold">
                  {currentPlan?.included_events === null
                    ? `${eventsUsed} (${t('host.unlimited')})`
                    : currentPlan?.included_events === 0
                    ? `${eventsUsed} (${t('host.payPerEvent')})`
                    : `${eventsUsed} / ${currentPlan?.included_events}`}
                </p>
              </div>
              {currentPlan?.slug !== 'pay-per-event' && (
                <>
                  <div>
                    <p className="text-muted-foreground text-xs">{t('host.nextBilling')}</p>
                    <p className="text-foreground font-semibold text-xs">{nextBillingDate}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">{t('host.nextAmount')}</p>
                    <p className="text-foreground font-semibold text-xs">
                      €{((currentPlan?.price_cents || 0) / 100).toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setChangePlanDialog(true)}
              >
                {t('host.changePlan')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setPayPerEventDialog(true)}
              >
                {t('host.bookSingleEvent')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pay-per-Event Quick Action */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="w-4 h-4 text-primary" />
              {t('host.eventBoost')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-xs mb-3">
              {t('host.eventBoostDescription')}
            </p>
            <Button
              size="sm"
              className="w-full"
              onClick={() => {
                setPayPerEventType('top');
                setPayPerEventDialog(true);
              }}
            >
              <Star className="w-4 h-4 mr-1" />
              {t('host.bookTopEvent')}
            </Button>
          </CardContent>
        </Card>

        {/* Invoice History */}
        <div>
          <h2 className="text-foreground font-bold text-sm mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" /> {t('host.invoiceHistory')}
          </h2>
          <div className="space-y-2">
            {invoices.map((inv) => (
              <Card key={inv.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-foreground text-sm font-medium">{inv.description}</p>
                    <p className="text-muted-foreground text-xs">
                      {inv.invoice_number} · {format(new Date(inv.created_at), 'dd.MM.yyyy', { locale: dateLocale })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-foreground font-semibold text-sm">
                        €{(inv.amount_cents / 100).toFixed(2).replace('.', ',')}
                      </p>
                      <Badge variant="secondary" className="text-[10px]">
                        {inv.status === 'paid' ? t('host.paid') : inv.status}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toast.info(t('host.pdfDownloadInfo'))}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Cancel */}
        {currentPlan?.slug !== 'pay-per-event' && (
          <Button
            variant="ghost"
            className="w-full text-destructive hover:text-destructive"
            onClick={() => toast.info(t('host.cancelInfo'))}
          >
            {t('host.cancelPlan')}
          </Button>
        )}
      </div>

      {/* Plan Change Dialog */}
      <Dialog open={changePlanDialog} onOpenChange={setChangePlanDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Plan wechseln</DialogTitle>
            <DialogDescription>Wähle deinen neuen Plan</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {plans.map((plan) => {
              const Icon = planIcons[plan.slug] || CreditCard;
              const isCurrent = plan.id === currentPlan?.id;
              return (
                <button
                  key={plan.id}
                  onClick={() => !isCurrent && handleChangePlan(plan)}
                  disabled={isCurrent}
                  className={cn(
                    'w-full text-left rounded-xl border-2 p-4 transition-all',
                    isCurrent
                      ? 'border-primary bg-primary/5 opacity-70'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-primary" />
                      <span className="text-foreground font-semibold">{plan.name}</span>
                    </div>
                    {isCurrent && <Badge variant="default" className="text-[10px]">Aktuell</Badge>}
                  </div>
                  <p className="text-muted-foreground text-xs mb-2">{plan.description}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground font-bold">
                      {plan.price_cents === 0
                        ? 'Kostenlos'
                        : `€${(plan.price_cents / 100).toFixed(0)}/Monat`}
                    </span>
                    <span className="text-muted-foreground">
                      {plan.included_events === null
                        ? 'Unbegrenzte Events'
                        : plan.included_events === 0
                        ? 'Einzelkauf'
                        : `${plan.included_events} Events inkl.`}
                    </span>
                  </div>
                  {plan.additional_event_price_cents && plan.additional_event_price_cents > 0 && (
                    <p className="text-muted-foreground text-[10px] mt-1">
                      + €{(plan.additional_event_price_cents / 100).toFixed(2).replace('.', ',')} pro zusätzlichem Event
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Plan Change Dialog */}
      <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Plan wechseln bestätigen</DialogTitle>
            <DialogDescription>
              Möchtest du zu <strong>{selectedNewPlan?.name}</strong> wechseln?
              {selectedNewPlan && selectedNewPlan.price_cents > 0 && (
                <> Der neue Preis beträgt <strong>€{(selectedNewPlan.price_cents / 100).toFixed(0)}/Monat</strong>.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDialog(false)}>Abbrechen</Button>
            <Button onClick={confirmPlanChange}>Bestätigen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay-per-Event Dialog */}
      <Dialog open={payPerEventDialog} onOpenChange={setPayPerEventDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Event buchen</DialogTitle>
            <DialogDescription>Wähle die Art des Events</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <button
              onClick={() => setPayPerEventType('standard')}
              className={cn(
                'w-full text-left rounded-xl border-2 p-4 transition-all',
                payPerEventType === 'standard' ? 'border-primary bg-primary/5' : 'border-border'
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground font-semibold">Standard Event</p>
                  <p className="text-muted-foreground text-xs">Normales Event veröffentlichen</p>
                </div>
                <p className="text-foreground font-bold">€29,90</p>
              </div>
            </button>
            <button
              onClick={() => setPayPerEventType('top')}
              className={cn(
                'w-full text-left rounded-xl border-2 p-4 transition-all',
                payPerEventType === 'top' ? 'border-primary bg-primary/5' : 'border-border'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div>
                    <p className="text-foreground font-semibold flex items-center gap-1">
                      Top Event <Star className="w-3.5 h-3.5 text-yellow-500" />
                    </p>
                    <p className="text-muted-foreground text-xs">Hervorgehoben auf der Karte + Featured</p>
                  </div>
                </div>
                <p className="text-foreground font-bold">€49,90</p>
              </div>
            </button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayPerEventDialog(false)}>Abbrechen</Button>
            <Button onClick={handlePayPerEvent}>
              Jetzt buchen · €{payPerEventType === 'standard' ? '29,90' : '49,90'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default HostBilling;
