
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.has_role(uuid, public.app_role) from public, anon;
revoke all on function public.approve_recharge(uuid) from public, anon;
revoke all on function public.place_order(uuid, integer, text, text) from public, anon;
revoke all on function public.public_stats() from public;

grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.approve_recharge(uuid) to authenticated;
grant execute on function public.place_order(uuid, integer, text, text) to authenticated;
grant execute on function public.public_stats() to anon, authenticated;
