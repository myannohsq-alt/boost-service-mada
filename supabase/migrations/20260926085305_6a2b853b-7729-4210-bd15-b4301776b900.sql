INSERT INTO public.services (platform, category, name_fr, name_mg, unit, price, note, active, sort_order, badge, delivery_time, provider_service_id, provider_name, provider_min, provider_max, provider_rate_usd)
SELECT 'facebook', 'Followers Gasy', 'Followers Gasy', 'Followers Gasy', 100, 2000, '', true, 6, '', delivery_time, provider_service_id, provider_name, provider_min, provider_max, provider_rate_usd
FROM public.services
WHERE platform = 'facebook' AND name_fr = 'Followers Facebook' AND unit = 100
  AND NOT EXISTS (SELECT 1 FROM public.services WHERE platform = 'facebook' AND name_fr = 'Followers Gasy')
LIMIT 1;