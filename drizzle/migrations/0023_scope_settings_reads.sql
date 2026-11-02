DROP POLICY IF EXISTS "signed-in read pauses" ON public.deposit_pauses;
CREATE POLICY "admins read pauses" ON public.deposit_pauses FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "chat settings readable" ON public.chat_settings;
CREATE POLICY "admins read chat settings" ON public.chat_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.get_deposit_pauses()
RETURNS TABLE(method text, paused_until timestamptz) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT method, paused_until FROM public.deposit_pauses WHERE auth.uid() IS NOT NULL $$;
REVOKE ALL ON FUNCTION public.get_deposit_pauses() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_deposit_pauses() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_chat_fee_enabled()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT coalesce((SELECT fee_enabled FROM public.chat_settings WHERE id = 1), true) $$;
REVOKE ALL ON FUNCTION public.get_chat_fee_enabled() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_chat_fee_enabled() TO authenticated;