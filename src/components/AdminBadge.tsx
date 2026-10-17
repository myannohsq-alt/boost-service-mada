import { BadgeCheck } from "lucide-react";

export const isAdminName = (name?: string | null) => (name ?? "").trim().toLowerCase() === "admin";

export function DisplayName({ name, admin, className = "" }: { name?: string | null; admin?: boolean; className?: string }) {
  const verified = admin || isAdminName(name);
  return (
    <span className={`inline-flex min-w-0 items-center ${verified ? "font-bold" : ""} ${className}`}>
      <span className="truncate">{name || "Membre"}</span>
      {verified ? (
        <span title="Administrateur vérifié" aria-label="Administrateur vérifié" className="inline-flex shrink-0">
          <BadgeCheck size={18} className="ml-1 inline fill-[#1D9BF0] text-white" />
        </span>
      ) : null}
    </span>
  );
}
