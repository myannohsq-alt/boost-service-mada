REVOKE EXECUTE ON FUNCTION public.acquire_sync_lock(text,integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_sync_lock(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.approve_recharge(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.place_order(uuid,integer,text,text,text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;