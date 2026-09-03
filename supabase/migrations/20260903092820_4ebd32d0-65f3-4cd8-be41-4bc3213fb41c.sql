-- lovable-cron-fallback-reviewed: 288 runs/day; SMMGen has no webhook, order statuses (Pending/Processing/Completed/Partial/Cancelled) can only be polled, and the user requires 5-minute freshness.
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS provider_name text NOT NULL DEFAULT 'SMMGen',
  ADD COLUMN IF NOT EXISTS provider_min integer,
  ADD COLUMN IF NOT EXISTS provider_max integer,
  ADD COLUMN IF NOT EXISTS provider_rate_usd numeric;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS provider_response jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS provider_charge numeric,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS api_error text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sync_at timestamptz;

UPDATE public.orders SET last_sync_at = last_synced_at WHERE last_sync_at IS NULL AND last_synced_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.api_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'SMMGen',
  action text NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  request jsonb NOT NULL DEFAULT '{}'::jsonb,
  response jsonb NOT NULL DEFAULT '{}'::jsonb,
  status_code integer,
  ok boolean NOT NULL DEFAULT true,
  error text NOT NULL DEFAULT '',
  duration_ms integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.api_logs TO authenticated;
GRANT ALL ON public.api_logs TO service_role;

ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read api logs"
  ON public.api_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS api_logs_created_idx ON public.api_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_provider_order_idx ON public.orders (provider_order_id);

ALTER TABLE public.provider_settings
  ADD COLUMN IF NOT EXISTS cron_secret text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  ADD COLUMN IF NOT EXISTS sync_url text NOT NULL DEFAULT 'https://boost-service-mada.lovable.app/api/public/smmgen-sync';

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.trigger_smmgen_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE s public.provider_settings%rowtype;
BEGIN
  SELECT * INTO s FROM public.provider_settings LIMIT 1;
  IF s.id IS NULL OR coalesce(s.api_key,'') = '' THEN RETURN; END IF;
  PERFORM net.http_post(
    url := s.sync_url,
    headers := jsonb_build_object('content-type','application/json','x-cron-secret', s.cron_secret),
    body := jsonb_build_object('source','pg_cron')
  );
END; $$;

REVOKE ALL ON FUNCTION public.trigger_smmgen_sync() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule('smmgen-sync-5min') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'smmgen-sync-5min');
SELECT cron.schedule('smmgen-sync-5min', '*/5 * * * *', $$SELECT public.trigger_smmgen_sync();$$);