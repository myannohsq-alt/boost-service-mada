REVOKE EXECUTE ON FUNCTION public.place_order(uuid, integer, text, text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.place_order(uuid, integer, text, text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.approve_recharge(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.reject_recharge(uuid, text) FROM anon, public;
CREATE POLICY "Admins read sync locks" ON public.sync_locks FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins read provider settings" ON public.provider_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));