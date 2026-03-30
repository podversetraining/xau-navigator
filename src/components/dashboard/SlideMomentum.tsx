import type { AnalysisResult } from "@/types/analysis";
import type { TimeframeData } from "@/lib/parseData";
import { sanitizeAiText, isValidAiText } from "@/lib/sanitizeAi";

function MomentumGauge({ value, min, max, label, zones }: { value: number; min: number; max: number; label: string; zones?: { low: number; high: number } }) {
  const pct = ((value - min) / (max - min)) * 100;
  const clampedPct = Math.max(0, Math.min(100, pct));
  const isOverbought = zones && value > zones.high;
  const isOversold = zones && value < zones.low;
  const barColor = isOverbought ? "bg-bearish" : isOversold ? "bg-bullish" : "bg-gold";
  const textColor = isOverbought ? "text-bearish" : isOversold ? "text-bullish" : "text-gold";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="text-dim text-xs font-data">{label}</span>
        <span className={`text-sm font-data font-bold ${textColor}`}>{value.toFixed(2)}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden relative">
        {zones && (
          <>
            <div className="absolute h-full bg-bullish/20 rounded-full" style={{ width: `${((zones.low - min) / (max - min)) * 100}%` }} />
            <div className="absolute h-full bg-bearish/20 rounded-full right-0" style={{ width: `${((max - zones.high) / (max - min)) * 100}%` }} />
          </>
        )}
        <div className={`h-full rounded-full ${barColor} relative z-10`} style={{ width: `${clampedPct}%` }} />
      </div>
    </div>
  );
}

export function SlideMomentum({ analysis, data }: { analysis: AnalysisResult; data: TimeframeData[] }) {
  const h1 = data.find(d => d.timeframe.includes("H1"));
  const m30 = data.find(d => d.timeframe.includes("M30"));
  const m15 = data.find(d => d.timeframe.includes("M15"));
  const layer = analysis.layer2Analysis;
  const momColor = layer.momentum === "Bullish" ? "text-bullish" : layer.momentum === "Bearish" ? "text-bearish" : "text-gold";

  return (
    <div className="h-full flex flex-col gap-4 p-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg tracking-widest text-dim">LAYER 2 — MOMENTUM & TIMING</h2>
        <div className="flex items-center gap-3">
          <span className={`font-display text-2xl font-bold ${momColor}`}>{layer.momentum.toUpperCase()}</span>
          <span className="text-gold font-display text-xl">{analysis.score.layer2}/35</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 flex-1">
        {[{ tf: h1, name: "H1" }, { tf: m30, name: "M30" }, { tf: m15, name: "M15" }].map(({ tf, name }) => tf && (
          <div key={name} className="glass-panel rounded-lg p-4 gold-border-glow flex flex-col gap-3">
            <h3 className="font-display text-xs tracking-widest text-gold">{name} MOMENTUM</h3>
            <MomentumGauge value={tf.rsi} min={0} max={100} label="RSI (14)" zones={{ low: 30, high: 70 }} />
            <MomentumGauge value={tf.rsi9} min={0} max={100} label="RSI (9)" zones={{ low: 30, high: 70 }} />
            <MomentumGauge value={tf.stochK} min={0} max={100} label="Stoch %K" zones={{ low: 20, high: 80 }} />
            <MomentumGauge value={tf.stochD} min={0} max={100} label="Stoch %D" zones={{ low: 20, high: 80 }} />
            <MomentumGauge value={tf.williamsR} min={-100} max={0} label="Williams %R" zones={{ low: -80, high: -20 }} />
            <MomentumGauge value={tf.cci20} min={-200} max={200} label="CCI (20)" zones={{ low: -100, high: 100 }} />
            <MomentumGauge value={tf.demarker} min={0} max={1} label="DeMarker" zones={{ low: 0.3, high: 0.7 }} />
            <div className="border-t border-border pt-2 mt-1">
              <div className="flex justify-between text-xs font-data">
                <span className="text-dim">MACD</span>
                <span className={tf.macd > tf.macdSignal ? "text-bullish" : "text-bearish"}>
                  {tf.macd.toFixed(2)} / {tf.macdSignal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs font-data mt-1">
                <span className="text-dim">Histogram</span>
                <span className={tf.macdHistogram > 0 ? "text-bullish" : "text-bearish"}>
                  {tf.macdHistogram.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-panel rounded-lg p-4 gold-border-glow">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs text-gold font-display tracking-widest mb-1">DIVERGENCE CHECK</h4>
            <p className="text-sm text-foreground font-data">{layer.divergence || "No significant divergence detected"}</p>
          </div>
          <div>
            <h4 className="text-xs text-gold font-display tracking-widest mb-1">MOMENTUM SUMMARY</h4>
            <p className="text-sm text-foreground font-data">{layer.summary}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
