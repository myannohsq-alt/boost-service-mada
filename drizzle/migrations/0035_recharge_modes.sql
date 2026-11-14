ALTER TABLE public.deposit_pauses DROP CONSTRAINT IF EXISTS deposit_pauses_method_check;
ALTER TABLE public.deposit_pauses ADD CONSTRAINT deposit_pauses_method_check CHECK (method = ANY (ARRAY['mvola','orange','airtel','instant','manual']));
ALTER TABLE public.deposit_pauses ADD COLUMN IF NOT EXISTS closed boolean NOT NULL DEFAULT false;
INSERT INTO public.deposit_pauses(method) SELECT m FROM unnest(ARRAY['instant','manual']) m ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION public.get_recharge_modes()
RETURNS TABLE(method text, closed boolean) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT method, closed FROM public.deposit_pauses WHERE method IN ('instant','manual') AND auth.uid() IS NOT NULL $$;
REVOKE EXECUTE ON FUNCTION public.get_recharge_modes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_recharge_modes() TO authenticated;