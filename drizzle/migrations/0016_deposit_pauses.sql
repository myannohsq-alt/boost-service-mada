create table public.deposit_pauses (
  method text primary key check (method in ('mvola','orange','airtel')),
  paused_until timestamptz,
  updated_at timestamptz not null default now()
);
grant select on public.deposit_pauses to anon, authenticated;
grant insert, update on public.deposit_pauses to authenticated;
grant all on public.deposit_pauses to service_role;
alter table public.deposit_pauses enable row level security;
create policy "read pauses" on public.deposit_pauses for select using (true);
create policy "admin insert pauses" on public.deposit_pauses for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));
create policy "admin update pauses" on public.deposit_pauses for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
insert into public.deposit_pauses(method) values ('mvola'),('orange'),('airtel');

create or replace function public.guard_recharge_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare _until timestamptz; _last timestamptz;
begin
  select paused_until into _until from deposit_pauses where method = new.method;
  if _until is not null and _until > now() then
    raise exception 'Dépôt % suspendu temporairement (réseau). Réessayez après %.', upper(new.method),
      to_char(_until at time zone 'Indian/Antananarivo', 'HH24:MI');
  end if;
  select max(created_at) into _last from recharges where user_id = new.user_id;
  if _last is not null and _last > now() - interval '5 minutes' then
    raise exception 'Patientez 5 minutes entre deux demandes de dépôt.';
  end if;
  return new;
end $$;
create trigger guard_recharge_insert before insert on public.recharges
  for each row execute function public.guard_recharge_insert();