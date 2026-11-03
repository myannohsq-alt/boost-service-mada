ALTER TABLE public.deposit_pauses ADD COLUMN IF NOT EXISTS auto_enabled boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.get_deposit_auto()
RETURNS TABLE(method text, auto_enabled boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT method, auto_enabled FROM public.deposit_pauses WHERE auth.uid() IS NOT NULL $$;
REVOKE ALL ON FUNCTION public.get_deposit_auto() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_deposit_auto() TO authenticated;

CREATE OR REPLACE FUNCTION public.auto_approve_recharge(_recharge_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
declare r public.recharges%rowtype; bonus numeric := 0;
begin
  select * into r from public.recharges where id = _recharge_id for update;
  if r.id is null or r.status <> 'pending' then raise exception 'Recharge invalide'; end if;
  if r.amount >= 40000 then bonus := round(r.amount * 0.05); end if;
  update public.recharges set status = 'approved' where id = r.id;
  update public.profiles set balance = balance + r.amount + bonus where id = r.user_id;
  insert into public.notifications (user_id, title, body)
  values (r.user_id, 'Recharge validée ✅', 'Dépôt automatique confirmé : ' || r.amount || ' Ar.' || case when bonus>0 then ' 🎁 Bonus 5% offert !' else '' end);
  insert into public.activity_log (user_id, action, detail) values (r.user_id, 'recharge_auto', r.amount || ' Ar + bonus ' || bonus);
end; $$;
REVOKE ALL ON FUNCTION public.auto_approve_recharge(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auto_approve_recharge(uuid) TO service_role;