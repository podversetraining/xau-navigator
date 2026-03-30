import { motion } from "framer-motion";
import type { AnalysisResult } from "@/types/analysis";
import type { TimeframeData } from "@/lib/parseData";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

function MomentumGauge({ value, min, max, label, zones }: { value: number; min: number; max: number; label: string; zones?: { low: number; high: number } }) {
  const pct = ((value - min) / (max - min)) * 100;
  const clampedPct = Math.max(0, Math.min(100, pct));
  const isOverbought = zones && value > zones.high;
  const isOversold = zones && value < zones.low;
  const barColor = isOverbought ? "bg-gradient-to-r from-destructive to-destructive/70" : isOversold ? "bg-gradient-to-r from-success to-success/70" : "bg-gradient-to-r from-primary to-primary/70";
  const textColor = isOverbought ? "text-bearish" : isOversold ? "text-bullish" : "text-gold";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="text-dim text-[10px] font-data">{label}</span>
        <span className={`text-xs font-data font-bold ${textColor}`}>{value.toFixed(2)}</span>
      </div>
      <div className="h-1.5 bg-secondary/60 rounded-full overflow-hidden relative">
        {zones && (
          <>
            <div className="absolute h-full rounded-full" style={{ width: `${((zones.low - min) / (max - min)) * 100}%`, background: 'hsla(142,72%,45%,0.08)' }} />
            <div className="absolute h-full rounded-full right-0" style={{ width: `${((max - zones.high) / (max - min)) * 100}%`, background: 'hsla(0,72%,51%,0.08)' }} />
          </>
        )}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clampedPct}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className={`h-full rounded-full ${barColor} relative z-10`}
        />
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
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="h-full flex flex-col gap-4 p-8"
    >
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <h2 className="font-display text-xs tracking-[0.3em] text-dim">LAYER 2 — MOMENTUM & TIMING</h2>
        <div className="flex items-center gap-4">
          <motion.span
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className={`font-display text-xl font-bold ${momColor}`}
          >
            {layer.momentum.toUpperCase()}
          </motion.span>
          <div className="px-3 py-1 rounded-md bg-primary/10 border border-primary/20">
            <span className="text-gold font-display text-lg">{analysis.score.layer2}/35</span>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-3 gap-4 flex-1">
        {[{ tf: h1, name: "H1" }, { tf: m30, name: "M30" }, { tf: m15, name: "M15" }].map(({ tf, name }, idx) => tf && (
          <motion.div
            key={name}
            variants={fadeUp}
            className="premium-card rounded-xl p-4 flex flex-col gap-2.5"
          >
            <h3 className="font-display text-[10px] tracking-[0.3em] text-gold">{name} MOMENTUM</h3>
            <MomentumGauge value={tf.rsi} min={0} max={100} label="RSI (14)" zones={{ low: 30, high: 70 }} />
            <MomentumGauge value={tf.rsi9} min={0} max={100} label="RSI (9)" zones={{ low: 30, high: 70 }} />
            <MomentumGauge value={tf.stochK} min={0} max={100} label="Stoch %K" zones={{ low: 20, high: 80 }} />
            <MomentumGauge value={tf.stochD} min={0} max={100} label="Stoch %D" zones={{ low: 20, high: 80 }} />
            <MomentumGauge value={tf.williamsR} min={-100} max={0} label="Williams %R" zones={{ low: -80, high: -20 }} />
            <MomentumGauge value={tf.cci20} min={-200} max={200} label="CCI (20)" zones={{ low: -100, high: 100 }} />
            <MomentumGauge value={tf.demarker} min={0} max={1} label="DeMarker" zones={{ low: 0.3, high: 0.7 }} />
            <div className="border-t border-border/30 pt-2 mt-1">
              <div className="flex justify-between text-[10px] font-data">
                <span className="text-dim">MACD</span>
                <span className={tf.macd > tf.macdSignal ? "text-bullish" : "text-bearish"}>
                  {tf.macd.toFixed(2)} / {tf.macdSignal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[10px] font-data mt-1">
                <span className="text-dim">Histogram</span>
                <span className={tf.macdHistogram > 0 ? "text-bullish" : "text-bearish"}>
                  {tf.macdHistogram.toFixed(2)}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div variants={fadeUp} className="premium-card rounded-xl p-4">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="text-[10px] text-gold font-display tracking-[0.2em] mb-1">DIVERGENCE CHECK</h4>
            <p className="text-xs text-foreground font-data leading-relaxed">{layer.divergence || "No significant divergence detected"}</p>
          </div>
          <div>
            <h4 className="text-[10px] text-gold font-display tracking-[0.2em] mb-1">MOMENTUM SUMMARY</h4>
            <p className="text-xs text-foreground font-data leading-relaxed">{layer.summary}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
