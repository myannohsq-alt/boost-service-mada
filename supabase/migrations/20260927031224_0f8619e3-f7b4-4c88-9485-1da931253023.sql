revoke execute on function public.recent_wheel_wins(timestamptz, integer) from anon, public;
revoke execute on function public.recent_saturday_winners(integer) from anon, public;
grant execute on function public.recent_wheel_wins(timestamptz, integer) to authenticated;
grant execute on function public.recent_saturday_winners(integer) to authenticated;