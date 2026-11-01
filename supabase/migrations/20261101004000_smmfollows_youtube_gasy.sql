ALTER TABLE public.provider_settings ADD COLUMN IF NOT EXISTS smmfollows_api_key text NOT NULL DEFAULT '';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'smmgen';
