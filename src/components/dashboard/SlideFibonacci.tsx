import type { TimeframeData } from "@/lib/parseData";

export function SlideFibonacci({ data }: { data: TimeframeData[] }) {
  const d1 = data.find(d => d.timeframe.includes("D1"));
  const h4 = data.find(d => d.timeframe.includes("H4"));
  const h1 = data.find(d => d.timeframe.includes("H1"));

  if (!d1) return null;

  const price = d1.currentPrice;

  return (
    <div className="h-full flex flex-col gap-4 p-8">
      <h2 className="font-display text-lg tracking-widest text-dim">FIBONACCI GOLDEN RATIO ANALYSIS</h2>

      <div className="grid grid-cols-3 gap-4 flex-1">
        {[{ tf: d1, name: "D1" }, { tf: h4, name: "H4" }, { tf: h1, name: "H1" }].map(({ tf, name }) => tf && (
          <div key={name} className="glass-panel rounded-lg p-4 gold-border-glow flex flex-col">
            <h3 className="font-display text-xs tracking-widest text-gold mb-2">{name} FIBONACCI</h3>
            <div className="flex justify-between text-xs font-data mb-3">
              <span className="text-dim">Swing High: <span className="text-bearish">{tf.fibSwingHigh.toFixed(2)}</span></span>
              <span className="text-dim">Swing Low: <span className="text-bullish">{tf.fibSwingLow.toFixed(2)}</span></span>
            </div>
            <div className={`text-center mb-3 px-3 py-1 rounded ${tf.fibTrendDirection === "UPTREND" ? "bg-bullish/10 text-bullish" : "bg-bearish/10 text-bearish"} text-xs font-display`}>
              {tf.fibTrendDirection}
            </div>

            {/* Retracement levels */}
            <div className="flex flex-col gap-1 mb-3">
              <span className="text-dim text-xs mb-1">Retracement Levels</span>
              {Object.entries(tf.fibLevels).map(([level, val]) => (
                <FibRow key={level} level={level} value={val} price={price} />
              ))}
            </div>

            {/* Position */}
            <div className="mt-auto pt-3 border-t border-border">
              <div className="flex justify-between text-xs font-data">
                <span className="text-dim">Position in Range</span>
                <span className="text-gold font-bold">{tf.pricePositionInRange.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-xs font-data mt-1">
                <span className="text-dim">Closest Level</span>
                <span className="text-gold font-bold">{tf.closestFibLevel}</span>
              </div>
              {/* Visual bar */}
              <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden relative">
                <div className="absolute h-full bg-bearish/30 rounded-full" style={{ width: "100%" }} />
                <div className="absolute h-full w-1 bg-gold rounded-full" style={{ left: `${tf.pricePositionInRange}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FibRow({ level, value, price }: { level: string; value: number; price: number }) {
  const isAbove = value > price;
  const dist = Math.abs(value - price);
  const color = isAbove ? "text-bearish" : "text-bullish";

  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-gold-dim text-xs font-data w-12">{level}</span>
      <span className={`text-xs font-data font-semibold ${color}`}>{value.toFixed(2)}</span>
      <span className="text-dim text-xs font-data w-16 text-right">{dist.toFixed(1)}p</span>
    </div>
  );
}
