
-- ROLES
create type public.app_role as enum ('admin','user');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  phone text not null default '',
  balance numeric not null default 0,
  referral_code text not null unique,
  referred_by uuid references auth.users(id) on delete set null,
  referral_earnings numeric not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique(user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "profiles_select_own" on public.profiles for select to authenticated
  using (auth.uid() = id or public.has_role(auth.uid(),'admin'));
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (auth.uid() = id or public.has_role(auth.uid(),'admin'))
  with check (auth.uid() = id or public.has_role(auth.uid(),'admin'));
create policy "profiles_insert_own" on public.profiles for insert to authenticated
  with check (auth.uid() = id);

create policy "roles_select_own" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- SERVICES
create table public.services (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  category text not null default '',
  name_fr text not null,
  name_mg text not null,
  unit integer not null default 100,
  price numeric not null,
  note text default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.services to anon, authenticated;
grant all on public.services to service_role;
grant insert, update, delete on public.services to authenticated;
alter table public.services enable row level security;
create policy "services_public_read" on public.services for select to anon, authenticated using (true);
create policy "services_admin_write" on public.services for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- ORDERS
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  service_label text not null default '',
  quantity integer not null,
  target_link text not null,
  amount numeric not null,
  status text not null default 'pending',
  admin_note text default '',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "orders_select" on public.orders for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "orders_insert_own" on public.orders for insert to authenticated
  with check (user_id = auth.uid());
create policy "orders_admin_update" on public.orders for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- RECHARGES
create table public.recharges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sender_phone text not null,
  reference text not null,
  amount numeric not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.recharges to authenticated;
grant all on public.recharges to service_role;
alter table public.recharges enable row level security;
create policy "recharges_select" on public.recharges for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "recharges_insert_own" on public.recharges for insert to authenticated
  with check (user_id = auth.uid());
create policy "recharges_admin_update" on public.recharges for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- NOTIFICATIONS
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  body text not null default '',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "notif_select" on public.notifications for select to authenticated
  using (user_id = auth.uid() or user_id is null or public.has_role(auth.uid(),'admin'));
create policy "notif_update_own" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notif_admin_insert" on public.notifications for insert to authenticated
  with check (public.has_role(auth.uid(),'admin'));

-- TUTORIALS
create table public.tutorials (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  video_url text not null default '',
  is_premium boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.tutorials to anon, authenticated;
grant insert, update, delete on public.tutorials to authenticated;
grant all on public.tutorials to service_role;
alter table public.tutorials enable row level security;
create policy "tuto_public_read" on public.tutorials for select to anon, authenticated using (true);
create policy "tuto_admin_write" on public.tutorials for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- PROMOTIONS
create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  discount integer not null default 0,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.promotions to anon, authenticated;
grant insert, update, delete on public.promotions to authenticated;
grant all on public.promotions to service_role;
alter table public.promotions enable row level security;
create policy "promo_public_read" on public.promotions for select to anon, authenticated using (true);
create policy "promo_admin_write" on public.promotions for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- NEWS
create table public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null default '',
  created_at timestamptz not null default now()
);
grant select on public.news to anon, authenticated;
grant insert, update, delete on public.news to authenticated;
grant all on public.news to service_role;
alter table public.news enable row level security;
create policy "news_public_read" on public.news for select to anon, authenticated using (true);
create policy "news_admin_write" on public.news for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- REVIEWS
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default '',
  rating integer not null default 5,
  comment text not null default '',
  approved boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.reviews to anon, authenticated;
grant insert, update, delete on public.reviews to authenticated;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;
create policy "reviews_public_read" on public.reviews for select to anon, authenticated
  using (approved = true);
create policy "reviews_own_read" on public.reviews for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "reviews_insert_own" on public.reviews for insert to authenticated
  with check (user_id = auth.uid());
create policy "reviews_admin_write" on public.reviews for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "reviews_admin_delete" on public.reviews for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- PROMO CODES
create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_percent integer not null default 10,
  expires_at timestamptz,
  max_uses integer not null default 100,
  uses integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.promo_codes to anon, authenticated;
grant insert, update, delete on public.promo_codes to authenticated;
grant all on public.promo_codes to service_role;
alter table public.promo_codes enable row level security;
create policy "promocode_read" on public.promo_codes for select to anon, authenticated using (active = true);
create policy "promocode_admin" on public.promo_codes for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- PROTECTION CODES
create table public.protection_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  code text not null unique,
  used boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.protection_codes to authenticated;
grant all on public.protection_codes to service_role;
alter table public.protection_codes enable row level security;
create policy "protection_select" on public.protection_codes for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "protection_admin" on public.protection_codes for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- ACTIVITY LOG
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  action text not null,
  detail text not null default '',
  created_at timestamptz not null default now()
);
grant select, insert on public.activity_log to authenticated;
grant all on public.activity_log to service_role;
alter table public.activity_log enable row level security;
create policy "activity_select" on public.activity_log for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "activity_insert_own" on public.activity_log for insert to authenticated
  with check (user_id = auth.uid());

-- NEW USER TRIGGER
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_code text;
  ref_code text;
  ref_user uuid;
begin
  new_code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  ref_code := nullif(new.raw_user_meta_data->>'referral_code','');
  if ref_code is not null then
    select id into ref_user from public.profiles where referral_code = upper(ref_code) limit 1;
  end if;

  insert into public.profiles (id, name, phone, referral_code, referred_by)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name',''),
    coalesce(new.raw_user_meta_data->>'phone',''),
    new_code,
    ref_user
  );

  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;

  insert into public.notifications (user_id, title, body)
  values (new.id, 'Inscription réussie 🎉', 'Tongasoa eto amin''ny BOOST SERVICE MADA !');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RECHARGE VALIDATION
create or replace function public.approve_recharge(_recharge_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r public.recharges%rowtype;
begin
  if not public.has_role(auth.uid(),'admin') then
    raise exception 'Forbidden';
  end if;
  select * into r from public.recharges where id = _recharge_id;
  if r.id is null or r.status <> 'pending' then
    raise exception 'Recharge invalide';
  end if;
  update public.recharges set status = 'approved' where id = r.id;
  update public.profiles set balance = balance + r.amount where id = r.user_id;
  insert into public.notifications (user_id, title, body)
  values (r.user_id, 'Recharge validée ✅', 'Votre solde a été crédité de ' || r.amount || ' Ar.');
  insert into public.activity_log (user_id, action, detail)
  values (r.user_id, 'recharge_approved', r.amount || ' Ar');
end;
$$;

create or replace function public.place_order(_service_id uuid, _quantity integer, _link text, _promo text)
returns uuid language plpgsql security definer set search_path = public as $$
declare s public.services%rowtype; cost numeric; pc public.promo_codes%rowtype; bal numeric; oid uuid;
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

  select balance into bal from public.profiles where id = auth.uid();
  if bal < cost then raise exception 'Solde insuffisant'; end if;

  update public.profiles set balance = balance - cost where id = auth.uid();
  insert into public.orders (user_id, service_id, service_label, quantity, target_link, amount)
  values (auth.uid(), s.id, s.name_fr, _quantity, _link, cost) returning id into oid;

  insert into public.notifications (user_id, title, body)
  values (auth.uid(), 'Nouvelle commande 📦', s.name_fr || ' × ' || _quantity || ' — ' || cost || ' Ar');
  insert into public.activity_log (user_id, action, detail) values (auth.uid(), 'order_created', s.name_fr);
  return oid;
end;
$$;

create or replace function public.public_stats()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'users', (select count(*) from public.profiles),
    'orders', (select count(*) from public.orders where status = 'done'),
    'services', (select count(*) from public.services where active),
    'reviews', (select count(*) from public.reviews where approved)
  )
$$;
