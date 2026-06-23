-- Row Level Security policies.
-- Admin-only mutations are intended to be performed server-side with the Supabase
-- service role. Service role bypasses RLS; client sessions do not receive broad
-- admin write policies here.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_outcome_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles are viewable by owner" ON public.profiles;
CREATE POLICY "Profiles are viewable by owner"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Users update their own non-admin profile" ON public.profiles;
CREATE POLICY "Users update their own non-admin profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = public.current_user_role());

DROP POLICY IF EXISTS "Active plans are public" ON public.plans;
CREATE POLICY "Active plans are public"
  ON public.plans FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Users read their own subscriptions" ON public.subscriptions;
CREATE POLICY "Users read their own subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage their own watchlists" ON public.watchlists;
CREATE POLICY "Users manage their own watchlists"
  ON public.watchlists FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage their own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users manage their own notification preferences"
  ON public.notification_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Signals are readable by authenticated users" ON public.signals;
CREATE POLICY "Signals are readable by authenticated users"
  ON public.signals FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Outcome events are readable by authenticated users" ON public.signal_outcome_events;
CREATE POLICY "Outcome events are readable by authenticated users"
  ON public.signal_outcome_events FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users insert their own outcome events" ON public.signal_outcome_events;
CREATE POLICY "Users insert their own outcome events"
  ON public.signal_outcome_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins read audit logs" ON public.audit_logs;
CREATE POLICY "Admins read audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.current_user_role() = 'admin');

-- No client policies for webhook_events. Insert/update processing must happen
-- server-side with the service role after validating webhook signatures.
