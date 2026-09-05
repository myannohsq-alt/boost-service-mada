ALTER TABLE public.provider_settings
  ADD COLUMN IF NOT EXISTS balance_value text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS balance_currency text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS balance_error text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS balance_cached_at timestamptz,
  ADD COLUMN IF NOT EXISTS services_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS rate_limited_until timestamptz,
  ADD COLUMN IF NOT EXISTS rate_limit_hits integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS orders_pending_send_idx
  ON public.orders (status, created_at)
  WHERE provider_order_id IS NULL;