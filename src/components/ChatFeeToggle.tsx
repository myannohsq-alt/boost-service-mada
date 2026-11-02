import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function useChatFee() {
  return useQuery({
    queryKey: ["chat-fee"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_chat_fee_enabled");
      return data ?? true;
    },
  });
}

export function ChatFeeToggle() {
  const qc = useQueryClient();
  const { data: on = true } = useChatFee();
  const toggle = async () => {
    const { error } = await supabase.from("chat_settings").update({ fee_enabled: !on, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) { toast.error(error.message); return; }
    toast.success(!on ? "1 Ar / message activé" : "Messages gratuits dans le groupe");
    await qc.invalidateQueries({ queryKey: ["chat-fee"] });
  };
  return (
    <div className="bsm-card flex items-center justify-between gap-3 p-4">
      <div>
        <p className="font-semibold">💬 Groupe : 1 Ar / message</p>
        <p className="text-xs text-muted-foreground">{on ? "Activé — chaque message texte coûte 1 Ar" : "Désactivé — messages gratuits"}</p>
      </div>
      <button onClick={toggle} role="switch" aria-checked={on} aria-label="1 Ar par message"
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? "bg-primary" : "bg-secondary"}`}>
        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-background transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}
