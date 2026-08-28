ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS avatar_url text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  new_code text;
  ref_code text;
  ref_user uuid;
  full_name text;
  avatar text;
begin
  new_code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  ref_code := nullif(new.raw_user_meta_data->>'referral_code','');
  if ref_code is not null then
    select id into ref_user from public.profiles where referral_code = upper(ref_code) limit 1;
  end if;

  full_name := coalesce(
    nullif(new.raw_user_meta_data->>'name',''),
    nullif(new.raw_user_meta_data->>'full_name',''),
    ''
  );
  avatar := coalesce(
    nullif(new.raw_user_meta_data->>'avatar_url',''),
    nullif(new.raw_user_meta_data->>'picture',''),
    ''
  );

  insert into public.profiles (id, name, phone, email, avatar_url, referral_code, referred_by)
  values (
    new.id,
    full_name,
    coalesce(new.raw_user_meta_data->>'phone',''),
    coalesce(new.email,''),
    avatar,
    new_code,
    ref_user
  );

  if lower(coalesce(new.email,'')) = 'myannohsq@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;

  insert into public.notifications (user_id, title, body)
  values (new.id, 'Inscription réussie 🎉', 'Tongasoa eto amin''ny BOOST SERVICE MADA !');
  return new;
end;
$function$;

-- Promote existing admin account if it already exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE lower(email) = 'myannohsq@gmail.com'
ON CONFLICT DO NOTHING;

UPDATE public.profiles p
SET email = coalesce(u.email, ''),
    avatar_url = coalesce(nullif(u.raw_user_meta_data->>'avatar_url',''), nullif(u.raw_user_meta_data->>'picture',''), p.avatar_url)
FROM auth.users u
WHERE u.id = p.id AND p.email = '';

CREATE OR REPLACE FUNCTION public.place_order(_service_id uuid, _quantity integer, _link text, _promo text)
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

  insert into public.orders (user_id, service_id, service_label, quantity, target_link, amount)
  values (auth.uid(), s.id, s.name_fr, _quantity, _link, cost) returning id into oid;

  insert into public.notifications (user_id, title, body)
  values (auth.uid(), 'Nouvelle commande 📦', s.name_fr || ' × ' || _quantity || ' — ' || cost || ' Ar');
  insert into public.activity_log (user_id, action, detail) values (auth.uid(), 'order_created', s.name_fr);
  return oid;
end;
$function$;