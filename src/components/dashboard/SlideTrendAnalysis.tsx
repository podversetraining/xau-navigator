import { motion } from "framer-motion";
import type { AnalysisResult } from "@/types/analysis";
import type { TimeframeData } from "@/lib/parseData";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

function Gauge({ value, max, label, size = 90 }: { value: number; max: number; label: string; size?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 70 ? "hsl(142, 72%, 45%)" : pct >= 40 ? "hsl(43, 96%, 56%)" : "hsl(0, 72%, 51%)";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="hsl(220, 15%, 12%)" strokeWidth={5} />
        <motion.circle
          cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={5}
          strokeLinecap="round" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </svg>
      <span className="font-display text-base font-bold text-foreground" style={{ marginTop: -size/2 - 8, position: "relative" }}>
        {value.toFixed(1)}
      </span>
      <span className="text-dim text-[10px] font-data mt-3">{label}</span>
    </div>
  );
}

function IndicatorCard({ label, value, status }: { label: string; value: string; status: "bullish" | "bearish" | "neutral" }) {
  const borderColor = status === "bullish" ? "hsla(142,72%,45%,0.5)" : status === "bearish" ? "hsla(0,72%,51%,0.5)" : "hsla(43,96%,56%,0.3)";
  const bgColor = status === "bullish" ? "hsla(142,72%,45%,0.05)" : status === "bearish" ? "hsla(0,72%,51%,0.05)" : "hsla(43,96%,56%,0.03)";
  
  return (
    <motion.div
      variants={fadeUp}
      className="rounded-md p-2.5 border-l-2"
      style={{ borderLeftColor: borderColor, background: bgColor }}
    >
      <span className="text-dim text-[10px] font-data block">{label}</span>
      <span className="text-foreground text-xs font-data font-semibold">{value}</span>
    </motion.div>
  );
}

export function SlideTrendAnalysis({ analysis, data }: { analysis: AnalysisResult; data: TimeframeData[] }) {
  const d1 = data.find(d => d.timeframe.includes("D1"));
  const layer = analysis.layer1Analysis;
  const trendColor = layer.trend === "Bullish" ? "text-bullish" : layer.trend === "Bearish" ? "text-bearish" : "text-gold";

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="h-full flex flex-col gap-4 p-8"
    >
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <h2 className="font-display text-xs tracking-[0.3em] text-dim">LAYER 1 — TREND ANALYSIS</h2>
        <div className="flex items-center gap-4">
          <motion.span
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className={`font-display text-xl font-bold ${trendColor}`}
          >
            {layer.trend.toUpperCase()}
          </motion.span>
          <div className="px-3 py-1 rounded-md bg-primary/10 border border-primary/20">
            <span className="text-gold font-display text-lg">{analysis.score.layer1}/40</span>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-4 gap-4 flex-1">
        <motion.div variants={fadeUp} className="premium-card rounded-xl p-4 col-span-2">
          <h3 className="font-display text-[10px] tracking-[0.3em] text-gold mb-3">MOVING AVERAGES — D1</h3>
          {d1 && (
            <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 gap-2">
              <IndicatorCard label="EMA 8" value={d1.ema8.toFixed(2)} status={d1.currentPrice > d1.ema8 ? "bullish" : "bearish"} />
              <IndicatorCard label="EMA 21" value={d1.ema21.toFixed(2)} status={d1.currentPrice > d1.ema21 ? "bullish" : "bearish"} />
              <IndicatorCard label="EMA 50" value={d1.ema50.toFixed(2)} status={d1.currentPrice > d1.ema50 ? "bullish" : "bearish"} />
              <IndicatorCard label="EMA 100" value={d1.ema100.toFixed(2)} status={d1.currentPrice > d1.ema100 ? "bullish" : "bearish"} />
              <IndicatorCard label="EMA 200" value={d1.ema200.toFixed(2)} status={d1.currentPrice > d1.ema200 ? "bullish" : "bearish"} />
              <IndicatorCard label="SMA 200" value={d1.sma200.toFixed(2)} status={d1.currentPrice > d1.sma200 ? "bullish" : "bearish"} />
            </motion.div>
          )}
          <p className="text-[10px] text-dim mt-3 font-data leading-relaxed">{layer.emaOrder}</p>
        </motion.div>

        <motion.div variants={fadeUp} className="premium-card rounded-xl p-4">
          <h3 className="font-display text-[10px] tracking-[0.3em] text-gold mb-3">TREND INDICATORS</h3>
          <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-2">
            {d1 && (
              <>
                <IndicatorCard label="SuperTrend" value={d1.superTrendDirection} status={d1.superTrendDirection === "UP" ? "bullish" : "bearish"} />
                <IndicatorCard label="Alligator" value={d1.alligatorState} status={d1.alligatorState.includes("UP") ? "bullish" : d1.alligatorState.includes("DOWN") ? "bearish" : "neutral"} />
                <IndicatorCard label="Trend Class" value={d1.trendClassification} status={d1.trendClassification.includes("UP") ? "bullish" : d1.trendClassification.includes("DOWN") ? "bearish" : "neutral"} />
                <IndicatorCard label="ADX" value={d1.adxMain.toFixed(1)} status={d1.adxMain > 25 ? (d1.adxPlus > d1.adxMinus ? "bullish" : "bearish") : "neutral"} />
              </>
            )}
          </motion.div>
        </motion.div>

        <motion.div variants={fadeUp} className="premium-card rounded-xl p-4">
          <h3 className="font-display text-[10px] tracking-[0.3em] text-gold mb-3">ICHIMOKU & FIB</h3>
          <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-2">
            {d1 && (
              <>
                <IndicatorCard label="Cloud Position" value={d1.cloudPosition} status={d1.cloudPosition === "ABOVE_CLOUD" ? "bullish" : d1.cloudPosition === "BELOW_CLOUD" ? "bearish" : "neutral"} />
                <IndicatorCard label="Fib Direction" value={d1.fibTrendDirection} status={d1.fibTrendDirection === "UPTREND" ? "bullish" : "bearish"} />
                <IndicatorCard label="Price in Range" value={`${d1.pricePositionInRange.toFixed(1)}%`} status="neutral" />
                <IndicatorCard label="Closest Fib" value={d1.closestFibLevel} status="neutral" />
              </>
            )}
          </motion.div>
          <p className="text-[10px] text-dim mt-3 font-data leading-relaxed">{layer.summary}</p>
        </motion.div>
      </div>
    </motion.div>
  );
}
