
-- 1. provider_settings (server-only)
CREATE TABLE public.provider_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  api_url text NOT NULL DEFAULT 'https://smmgen.com/api/v2',
  api_key text NOT NULL DEFAULT '',
  ar_per_usd numeric NOT NULL DEFAULT 4500,
  markup_percent integer NOT NULL DEFAULT 20,
  auto_fulfill boolean NOT NULL DEFAULT true,
  paused boolean NOT NULL DEFAULT false,
  pause_reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.provider_settings TO service_role;
ALTER TABLE public.provider_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.provider_settings (singleton) VALUES (true);

-- 2. provider_services
CREATE TABLE public.provider_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_service_id text NOT NULL UNIQUE,
  name text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT '',
  rate_usd numeric NOT NULL DEFAULT 0,
  min_qty integer NOT NULL DEFAULT 0,
  max_qty integer NOT NULL DEFAULT 0,
  selected boolean NOT NULL DEFAULT false,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_services TO authenticated;
GRANT ALL ON public.provider_services TO service_role;
ALTER TABLE public.provider_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY provider_services_admin ON public.provider_services FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3. sync_jobs queue
CREATE TABLE public.sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key text UNIQUE,
  attempts integer NOT NULL DEFAULT 0,
  last_error text NOT NULL DEFAULT '',
  run_after timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sync_jobs_pending_idx ON public.sync_jobs (status, run_after);
GRANT SELECT ON public.sync_jobs TO authenticated;
GRANT ALL ON public.sync_jobs TO service_role;
ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY sync_jobs_admin_read ON public.sync_jobs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4. sync_runs history
CREATE TABLE public.sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  items_processed integer NOT NULL DEFAULT 0,
  items_failed integer NOT NULL DEFAULT 0,
  detail text NOT NULL DEFAULT '',
  error text NOT NULL DEFAULT '',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sync_runs_recent_idx ON public.sync_runs (started_at DESC);
GRANT SELECT ON public.sync_runs TO authenticated;
GRANT ALL ON public.sync_runs TO service_role;
ALTER TABLE public.sync_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY sync_runs_admin_read ON public.sync_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 5. single-flight lock
CREATE TABLE public.sync_locks (
  name text PRIMARY KEY,
  locked_until timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.sync_locks TO service_role;
ALTER TABLE public.sync_locks ENABLE ROW LEVEL SECURITY;

-- 6. columns on existing tables
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS provider_service_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS provider_order_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS provider_status text NOT NULL DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS remains integer;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS start_count integer;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS provider_error text NOT NULL DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

-- 7. updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER provider_settings_updated BEFORE UPDATE ON public.provider_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER provider_services_updated BEFORE UPDATE ON public.provider_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER sync_jobs_updated BEFORE UPDATE ON public.sync_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. lock helper (service_role only)
CREATE OR REPLACE FUNCTION public.acquire_sync_lock(_name text, _seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ok boolean;
BEGIN
  INSERT INTO public.sync_locks (name, locked_until)
  VALUES (_name, now() + make_interval(secs => _seconds))
  ON CONFLICT (name) DO UPDATE
    SET locked_until = excluded.locked_until, updated_at = now()
    WHERE public.sync_locks.locked_until < now()
  RETURNING true INTO ok;
  RETURN coalesce(ok, false);
END; $$;
REVOKE ALL ON FUNCTION public.acquire_sync_lock(text, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_sync_lock(text, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.release_sync_lock(_name text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.sync_locks SET locked_until = now() - interval '1 second' WHERE name = _name;
$$;
REVOKE ALL ON FUNCTION public.release_sync_lock(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_sync_lock(text) TO service_role;
