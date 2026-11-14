CREATE OR REPLACE FUNCTION public.approve_recharge(_recharge_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare r public.recharges%rowtype; bonus numeric := 0;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Forbidden'; end if;
  select * into r from public.recharges where id = _recharge_id for update;
  if r.id is null or r.status <> 'pending' then raise exception 'Recharge invalide'; end if;
  if r.sender_phone = 'PAPI' or r.reference like 'BSM-%' then raise exception 'Dépôt Papi : crédité uniquement après confirmation Papi'; end if;
  if r.amount >= 40000 then bonus := round(r.amount * 0.05); end if;
  update public.recharges set status = 'approved' where id = r.id;
  update public.profiles set balance = balance + r.amount + bonus where id = r.user_id;
  insert into public.notifications (user_id, title, body)
  values (r.user_id, 'Recharge validée ✅', 'Votre solde a été crédité de ' || r.amount || ' Ar.' || case when bonus>0 then ' 🎁 Bonus 5% offert !' else '' end);
  insert into public.activity_log (user_id, action, detail) values (r.user_id, 'recharge_approved', r.amount || ' Ar + bonus ' || bonus);
end; $$;