CREATE OR REPLACE FUNCTION public.admin_nexus_key_status()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN EXISTS (SELECT 1 FROM public.provider_settings WHERE coalesce(nexus_api_key,'') <> '');
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.admin_get_nexus_key()
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN (SELECT nexus_api_key FROM public.provider_settings LIMIT 1);
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.admin_set_nexus_key(_key text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF length(trim(coalesce(_key,''))) = 0 THEN RAISE EXCEPTION 'Clé vide'; END IF;
  UPDATE public.provider_settings SET nexus_api_key = left(trim(_key), 500);
END $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.admin_nexus_key_status() FROM public, anon;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.admin_get_nexus_key() FROM public, anon;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.admin_set_nexus_key(text) FROM public, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.admin_nexus_key_status() TO authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.admin_get_nexus_key() TO authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.admin_set_nexus_key(text) TO authenticated;
