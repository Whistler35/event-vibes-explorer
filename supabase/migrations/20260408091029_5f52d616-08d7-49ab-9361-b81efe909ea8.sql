
-- 1. Extend app_role enum with professional_host
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'professional_host';

-- 2. Subscription plans table
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  price_cents integer NOT NULL DEFAULT 0,
  included_events integer, -- NULL = unlimited
  additional_event_price_cents integer,
  description text,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active plans"
  ON public.subscription_plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage plans"
  ON public.subscription_plans FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default plans
INSERT INTO public.subscription_plans (name, slug, price_cents, included_events, additional_event_price_cents, description, sort_order) VALUES
  ('Pay-per-Event', 'pay-per-event', 0, 0, 2990, 'Einzelne Events ohne Abo veröffentlichen', 0),
  ('Starter', 'starter', 4900, 2, 2000, '2 Events inklusive pro Monat', 1),
  ('Growth', 'growth', 14900, 8, 1500, '8 Events inklusive pro Monat', 2),
  ('Pro', 'pro', 39900, NULL, 0, 'Unbegrenzte Events + Push-Benachrichtigungen', 3);

-- 3. Host profiles table
CREATE TABLE public.host_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  company_name text,
  is_verified boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  current_plan_id uuid REFERENCES public.subscription_plans(id),
  total_events_created integer NOT NULL DEFAULT 0,
  total_revenue_cents integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.host_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view own profile"
  ON public.host_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Hosts can update own profile"
  ON public.host_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Hosts can insert own profile"
  ON public.host_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all host profiles"
  ON public.host_profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all host profiles"
  ON public.host_profiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Host subscriptions table
CREATE TABLE public.host_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES public.host_profiles(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing')),
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL DEFAULT (now() + interval '1 month'),
  events_used_this_period integer NOT NULL DEFAULT 0,
  next_billing_date timestamptz,
  stripe_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.host_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view own subscriptions"
  ON public.host_subscriptions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.host_profiles hp
    WHERE hp.id = host_subscriptions.host_id AND hp.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all subscriptions"
  ON public.host_subscriptions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can manage subscriptions"
  ON public.host_subscriptions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Event views tracking table
CREATE TABLE public.event_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  viewer_id uuid,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  session_id text
);

CREATE INDEX idx_event_views_event_id ON public.event_views (event_id);
CREATE INDEX idx_event_views_viewed_at ON public.event_views (viewed_at);

ALTER TABLE public.event_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event creators can view their event views"
  ON public.event_views FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = event_views.event_id AND e.created_by = auth.uid()
  ));

CREATE POLICY "Admins can view all event views"
  ON public.event_views FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can insert event views"
  ON public.event_views FOR INSERT
  WITH CHECK (true);

-- 6. Invoices table
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL REFERENCES public.host_profiles(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('draft', 'pending', 'paid', 'failed', 'refunded')),
  description text,
  invoice_number text,
  pdf_url text,
  stripe_invoice_id text,
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can view own invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.host_profiles hp
    WHERE hp.id = invoices.host_id AND hp.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all invoices"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage invoices"
  ON public.invoices FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
