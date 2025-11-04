"use client";

export default function GasPanel({ retention }: GasPanelProps) {
  const groups: Array<GasGroupConfig> = [
    {
      title: "Stays In The Air",
      tone: "retained",
      gases: retention.gases.filter((gas) => gas.status === "retained"),
      fallback: "All tracked gases are leaking away.",
    },
    {
      title: "Leaking Into Space",
      tone: "escaping",
      gases: retention.gases.filter((gas) => gas.status === "escaping"),
      fallback: "Everything we track stays put for now.",
    },
  ];

  return (
    <section className="bg-gray-900/85 border border-gray-700 rounded-lg shadow-lg p-3 text-[10px] text-gray-100 space-y-3 w-full">
      <header className="space-y-0.5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-white/90">
          Atmosphere Snapshot
        </h2>
        <p className="text-[9px] text-gray-400 leading-snug">
          Which gases your planet keeps versus those that drift away.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {groups.map((group) => (
          <GasGroup
            key={group.title}
            title={group.title}
            tone={group.tone}
            gases={group.gases}
            emptyFallback={group.fallback}
          />
        ))}
      </div>
    </section>
  );
}

interface GasPanelProps {
  retention: PhysicsInfoProps["retention"];
}

function GasGroup({
  title,
  gases,
  tone,
  emptyFallback,
}: {
  title: string;
  gases: GasRetentionDetail[];
  tone: "retained" | "escaping";
  emptyFallback: string;
}) {
  const toneClasses =
    tone === "retained"
      ? "text-green-300 border-green-400/30 bg-green-900/10"
      : "text-orange-300 border-orange-400/30 bg-orange-900/10";

  return (
    <article className={`border rounded-lg px-2.5 py-2.5 ${toneClasses} space-y-2`}>
      <header className="space-y-0.5">
        <h3 className="text-[10px] font-semibold uppercase tracking-wide text-white">
          {title}
        </h3>
      </header>
      {gases.length === 0 ? (
        <p className="text-[9px] text-white/80 leading-snug">{emptyFallback}</p>
      ) : (
        <div className="grid gap-1.5">
          {gases.map((gas) => (
            <article
              key={gas.gas}
              className="border border-white/25 rounded-md px-2 py-1.5 text-[10px] bg-black/20 shadow-sm"
            >
              <div className="flex items-center justify-between mb-1 gap-2">
                <span className="font-semibold uppercase tracking-wide text-[9px]">
                  {gas.gas}
                </span>
                <span className="text-[8px] text-gray-200">
                  {tone === "retained" ? "Stable" : "Escaping"}
                </span>
              </div>
              <p className="text-[9px] leading-snug text-gray-200">
                {tone === "retained"
                  ? "Gravity keeps this gas in the atmosphere."
                  : "Too light to hold long-term—it drifts outward."}
              </p>
            </article>
          ))}
        </div>
      )}
    </article>
  );
}

interface GasGroupConfig {
  title: string;
  tone: "retained" | "escaping";
  gases: GasRetentionDetail[];
  fallback: string;
}
