import { useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";

/**
 * Evendle 2.0 landing — dark forest gradient, EVENDLE logo pill,
 * live Blitz preview card, bold headline, lime "Get started"
 * + outlined "I already have an account" CTAs.
 */
const Landing = () => {
  const navigate = useNavigate();

  return (
    <div
      className="fixed inset-0 flex flex-col text-white overflow-y-auto"
      style={{
        background:
          "radial-gradient(120% 80% at 50% 0%, hsl(var(--blitz-forest-mid)) 0%, hsl(var(--blitz-forest-dark)) 55%, hsl(var(--blitz-forest-deep)) 100%)",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Logo pill */}
      <div className="flex items-center justify-center gap-2 pt-14">
        <div className="grid h-7 w-7 place-items-center rounded-full bg-[hsl(var(--bolt))]">
          <Zap
            size={16}
            strokeWidth={2.2}
            className="text-[hsl(var(--ink))] fill-[hsl(var(--ink))]"
          />
        </div>
        <span className="font-display text-[13px] font-semibold tracking-[0.22em]">
          EVENDLE
        </span>
      </div>

      {/* Live Blitz preview card */}
      <div
        className="mx-6 mt-12 rounded-3xl p-4 backdrop-blur-md"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div className="flex items-center gap-2 text-[12px] text-white/60">
          <div
            className="inline-flex items-center justify-center rounded-full font-semibold text-white"
            style={{ width: 22, height: 22, background: "#3A6B8A", fontSize: 9 }}
          >
            JP
          </div>
          <span>Jakob · just now</span>
        </div>
        <div className="mt-2 font-display text-[26px] font-bold leading-tight tracking-tight">
          Beachvolleyball?
        </div>
        <div className="mt-1 text-[13px] text-white/70">Now · Hofgarten</div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex">
            {[
              { n: "AB", c: "#C0653A" },
              { n: "BH", c: "#3A6B8A" },
              { n: "LM", c: "#3A6B8A" },
            ].map((a, i) => (
              <div
                key={a.n}
                className="inline-flex items-center justify-center rounded-full font-semibold text-white ring-2 ring-[hsl(var(--blitz-forest-dark))]"
                style={{
                  width: 28,
                  height: 28,
                  background: a.c,
                  fontSize: 10,
                  marginLeft: i === 0 ? 0 : -8,
                }}
              >
                {a.n}
              </div>
            ))}
          </div>
          <div className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-[hsl(var(--bolt))] text-[hsl(var(--ink))]">
            <Zap size={11} className="fill-[hsl(var(--ink))] text-[hsl(var(--ink))]" />{" "}
            Anna is in
          </div>
        </div>
      </div>

      {/* Headline */}
      <div className="px-6 mt-10">
        <h1 className="font-display text-[34px] font-bold leading-[1.05] tracking-tight">
          Make plans before the group chat kills them.
        </h1>
        <p className="mt-4 text-[15px] text-white/70 leading-relaxed">
          One tap to ask, one tap to join. Real plans in minutes — not 87
          unread messages.
        </p>
      </div>

      <div className="flex-1" />

      {/* CTAs */}
      <div className="px-6 pb-8 pt-8 space-y-3">
        <button
          onClick={() => navigate("/auth?mode=signup")}
          className="w-full rounded-full py-4 font-semibold text-[15px] bg-[hsl(var(--bolt))] text-[hsl(var(--ink))] active:scale-[0.98] transition"
          style={{ boxShadow: "0 10px 30px hsl(var(--bolt) / 0.25)" }}
        >
          Get started
        </button>
        <button
          onClick={() => navigate("/auth?mode=login")}
          className="w-full rounded-full py-4 font-semibold text-white text-[15px] active:scale-[0.98] transition"
          style={{ border: "1px solid rgba(255,255,255,0.2)" }}
        >
          I already have an account
        </button>
      </div>
    </div>
  );
};

export default Landing;
