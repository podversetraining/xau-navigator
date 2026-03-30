import type { TimeframeData } from "@/lib/parseData";

export function SlideIchimoku({ data }: { data: TimeframeData[] }) {
  const d1 = data.find(d => d.timeframe.includes("D1"));
  const h4 = data.find(d => d.timeframe.includes("H4"));
  const h1 = data.find(d => d.timeframe.includes("H1"));
  const m30 = data.find(d => d.timeframe.includes("M30"));

  return (
    <div className="h-full flex flex-col gap-4 p-8">
      <h2 className="font-display text-lg tracking-widest text-dim">ICHIMOKU CLOUD & ADVANCED INDICATORS</h2>

      <div className="grid grid-cols-4 gap-4 flex-1">
        {[{ tf: d1, name: "D1" }, { tf: h4, name: "H4" }, { tf: h1, name: "H1" }, { tf: m30, name: "M30" }].map(({ tf, name }) => tf && (
          <div key={name} className="glass-panel rounded-lg p-4 gold-border-glow flex flex-col gap-2">
            <h3 className="font-display text-xs tracking-widest text-gold">{name}</h3>

            <CloudBadge position={tf.cloudPosition} />

            <div className="flex flex-col gap-1 text-xs font-data">
              <Row label="Tenkan Sen" value={tf.tenkanSen.toFixed(2)} color={tf.tenkanSen > tf.kijunSen ? "text-bullish" : "text-bearish"} />
              <Row label="Kijun Sen" value={tf.kijunSen.toFixed(2)} />
              <Row label="Senkou A" value={tf.senkouA.toFixed(2)} />
              <Row label="Senkou B" value={tf.senkouB.toFixed(2)} />
              <Row label="Cloud Top" value={tf.cloudTop.toFixed(2)} color="text-bearish" />
              <Row label="Cloud Bottom" value={tf.cloudBottom.toFixed(2)} color="text-bullish" />
            </div>

            <div className="border-t border-border pt-2 mt-auto">
              <span className="text-dim text-xs block mb-1">Advanced</span>
              <Row label="Aroon Osc" value={tf.aroonOscillator.toFixed(0)} color={tf.aroonOscillator > 0 ? "text-bullish" : "text-bearish"} />
              <Row label="Vortex Diff" value={tf.vortexDiff.toFixed(4)} color={tf.vortexDiff > 0 ? "text-bullish" : "text-bearish"} />
              <Row label="TRIX" value={tf.trix.toFixed(4)} color={tf.trix > 0 ? "text-bullish" : "text-bearish"} />
              <Row label="ADXR" value={tf.adxr.toFixed(1)} />
              <Row label="TSI" value={tf.trendStrengthIndex.toFixed(1)} color={tf.trendStrengthIndex > 0 ? "text-bullish" : "text-bearish"} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CloudBadge({ position }: { position: string }) {
  const color = position === "ABOVE_CLOUD" ? "bg-bullish/15 text-bullish border-bullish/30"
    : position === "BELOW_CLOUD" ? "bg-bearish/15 text-bearish border-bearish/30"
    : "bg-gold/15 text-gold border-gold/30";

  return (
    <div className={`text-center py-1 px-2 rounded border text-xs font-display ${color}`}>
      {position.replace("_", " ")}
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-dim">{label}</span>
      <span className={`font-semibold ${color || "text-foreground"}`}>{value}</span>
    </div>
  );
}
