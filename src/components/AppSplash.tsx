import { useEffect, useState } from "react";

/** Animated intro shown once per launch inside the installed app (APK / home screen). */
export function AppSplash() {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const installed = window.matchMedia("(display-mode: standalone)").matches
      || window.matchMedia("(display-mode: fullscreen)").matches
      || document.referrer.startsWith("android-app://");
    if (!installed || sessionStorage.getItem("bsm-splash")) return;
    sessionStorage.setItem("bsm-splash", "1");
    setShow(true);
    const a = window.setTimeout(() => setLeaving(true), 1900);
    const b = window.setTimeout(() => setShow(false), 2400);
    return () => { window.clearTimeout(a); window.clearTimeout(b); };
  }, []);
  if (!show) return null;
  return (
    <div className={`fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${leaving ? "opacity-0" : "opacity-100"}`}>
      <style>{`
        @keyframes bsm-pop{0%{transform:scale(.3) rotate(-25deg);opacity:0}60%{transform:scale(1.08) rotate(4deg);opacity:1}100%{transform:scale(1) rotate(0)}}
        @keyframes bsm-ring{0%{transform:scale(.8);opacity:.8}100%{transform:scale(1.9);opacity:0}}
        @keyframes bsm-rise{from{transform:translateY(16px);opacity:0}to{transform:none;opacity:1}}
        @keyframes bsm-bar{from{width:0}to{width:100%}}
      `}</style>
      <div className="relative h-44 w-44">
        <span className="absolute inset-0 rounded-full border-4 border-primary" style={{ animation: "bsm-ring 1.4s ease-out infinite" }} />
        <span className="absolute inset-0 rounded-full border-4 border-gold" style={{ animation: "bsm-ring 1.4s ease-out .5s infinite" }} />
        <img src="/icon-512.png" alt="SMM B&S" className="relative h-44 w-44 rounded-full shadow-[0_0_60px_var(--primary)]" style={{ animation: "bsm-pop .9s cubic-bezier(.2,.9,.3,1.3) both" }} />
      </div>
      <p className="mt-8 font-display text-2xl font-black tracking-wide text-foreground" style={{ animation: "bsm-rise .6s .5s both" }}>
        BOOST <span className="text-primary">SERVICE</span> MADA
      </p>
      <p className="mt-1 text-xs text-muted-foreground" style={{ animation: "bsm-rise .6s .7s both" }}>Boostez vos réseaux sociaux - 100% Gasy</p>
      <div className="mt-6 h-1 w-40 overflow-hidden rounded-full bg-secondary">
        <div className="h-full bg-gradient-to-r from-primary to-gold" style={{ animation: "bsm-bar 1.8s ease-in-out both" }} />
      </div>
    </div>
  );
}
