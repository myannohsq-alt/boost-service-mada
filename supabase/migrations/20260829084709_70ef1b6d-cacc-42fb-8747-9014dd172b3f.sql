ALTER TABLE public.services ADD COLUMN IF NOT EXISTS badge text NOT NULL DEFAULT '';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS delivery_time text NOT NULL DEFAULT '0-6 h';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notes text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.place_order(_service_id uuid, _quantity integer, _link text, _promo text, _note text DEFAULT '')
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare s public.services%rowtype; cost numeric; pc public.promo_codes%rowtype; bal numeric; oid uuid; is_admin boolean;
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  select * into s from public.services where id = _service_id and active;
  if s.id is null then raise exception 'Service introuvable'; end if;
  if _quantity < s.unit then raise exception 'Quantité minimum: %', s.unit; end if;
  cost := ceil((_quantity::numeric / s.unit) * s.price);

  if _promo is not null and _promo <> '' then
    select * into pc from public.promo_codes where code = upper(_promo) and active
      and (expires_at is null or expires_at > now()) and uses < max_uses;
    if pc.id is not null then
      cost := ceil(cost * (100 - pc.discount_percent) / 100.0);
      update public.promo_codes set uses = uses + 1 where id = pc.id;
    end if;
  end if;

  is_admin := public.has_role(auth.uid(), 'admin'::app_role);
  if is_admin then
    cost := 0;
  else
    select balance into bal from public.profiles where id = auth.uid();
    if bal < cost then raise exception 'Solde insuffisant'; end if;
    update public.profiles set balance = balance - cost where id = auth.uid();
  end if;

  insert into public.orders (user_id, service_id, service_label, quantity, target_link, amount, notes)
  values (auth.uid(), s.id, s.name_fr, _quantity, _link, cost, coalesce(_note, '')) returning id into oid;

  insert into public.notifications (user_id, title, body)
  values (auth.uid(), 'Nouvelle commande 📦', s.name_fr || ' × ' || _quantity || ' — ' || cost || ' Ar');
  insert into public.activity_log (user_id, action, detail) values (auth.uid(), 'order_created', s.name_fr);
  return oid;
end;
$function$;

DROP FUNCTION IF EXISTS public.place_order(uuid, integer, text, text);