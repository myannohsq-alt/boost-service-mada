import { supabase } from "@/integrations/supabase/client";

export const ACTIVE_LINK_MSG =
  "Mbola misy commande eo am-pandehanana amin'io lien io. Andraso ho vita aloha vao manao commande vaovao.";

// The provider rejects a second order on a link that still has an active order.
export async function hasActiveOrderOnLink(link: string): Promise<boolean> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return false;
  const { data } = await supabase
    .from("orders")
    .select("id")
    .eq("user_id", u.user.id)
    .eq("target_link", link)
    .in("status", ["pending", "processing"])
    .limit(1);
  return (data?.length ?? 0) > 0;
}
