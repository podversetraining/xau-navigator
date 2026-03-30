import { motion } from "framer-motion";
import type { AnalysisResult } from "@/types/analysis";
import type { TimeframeData } from "@/lib/parseData";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

function LevelRow({ label, value, current, type }: { label: string; value: number; current: number; type: "resistance" | "support" | "neutral" }) {
  const dist = value - current;
  const distPct = ((dist / current) * 100).toFixed(2);
  const color = type === "resistance" ? "text-bearish" : type === "support" ? "text-bullish" : "text-gold";

  return (
    <div className="flex items-center justify-between py-1 border-b border-border/20 last:border-0">
      <span className="text-dim text-[10px] font-data">{label}</span>
      <div className="flex items-center gap-4">
        <span className={`font-data text-xs font-semibold ${color}`}>{value.toFixed(2)}</span>
        <span className="text-dim text-[10px] font-data w-16 text-right tabular-nums">{dist > 0 ? "+" : ""}{distPct}%</span>
      </div>
    </div>
  );
}

export function SlideEntryPoint({ analysis, data }: { analysis: AnalysisResult; data: TimeframeData[] }) {
  const m15 = data.find(d => d.timeframe.includes("M15"));
  const m5 = data.find(d => d.timeframe.includes("M5"));
  const layer = analysis.layer3Analysis;
  const price = m5?.currentPrice || 0;

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="h-full flex flex-col gap-4 p-8"
    >
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <h2 className="font-display text-xs tracking-[0.3em] text-dim">LAYER 3 — ENTRY ZONE & CONFIRMATION</h2>
        <div className="px-3 py-1 rounded-md bg-primary/10 border border-primary/20">
          <span className="text-gold font-display text-lg">{analysis.score.layer3}/25</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-3 gap-4 flex-1">
        <motion.div variants={fadeUp} className="premium-card rounded-xl p-4">
          <h3 className="font-display text-[10px] tracking-[0.3em] text-gold mb-3">PIVOT POINTS — M15</h3>
          {m15 && (
            <div className="flex flex-col">
              <LevelRow label="R3" value={m15.r3} current={price} type="resistance" />
              <LevelRow label="R2" value={m15.r2} current={price} type="resistance" />
              <LevelRow label="R1" value={m15.r1} current={price} type="resistance" />
              <LevelRow label="Pivot" value={m15.pivot} current={price} type="neutral" />
              <LevelRow label="S1" value={m15.s1} current={price} type="support" />
              <LevelRow label="S2" value={m15.s2} current={price} type="support" />
              <LevelRow label="S3" value={m15.s3} current={price} type="support" />
            </div>
          )}
        </motion.div>

        <motion.div variants={fadeUp} className="premium-card rounded-xl p-4">
          <h3 className="font-display text-[10px] tracking-[0.3em] text-gold mb-3">BANDS & CHANNELS</h3>
          {m5 && (
            <div className="flex flex-col gap-3">
              <div>
                <span className="text-dim text-[10px] font-display tracking-wider block mb-1">BOLLINGER BANDS (M5)</span>
                <LevelRow label="Upper" value={m5.bbUpper} current={price} type="resistance" />
                <LevelRow label="Middle" value={m5.bbMid} current={price} type="neutral" />
                <LevelRow label="Lower" value={m5.bbLower} current={price} type="support" />
                <div className="flex justify-between mt-1">
                  <span className="text-dim text-[10px]">BB Width</span>
                  <span className="text-gold text-[10px] font-bold">{m5.bbWidth20.toFixed(2)}</span>
                </div>
              </div>
              <div className="border-t border-border/20 pt-2">
                <span className="text-dim text-[10px] font-display tracking-wider block mb-1">KELTNER CHANNEL (M5)</span>
                <LevelRow label="Upper" value={m5.keltnerUpper} current={price} type="resistance" />
                <LevelRow label="Middle" value={m5.keltnerMiddle} current={price} type="neutral" />
                <LevelRow label="Lower" value={m5.keltnerLower} current={price} type="support" />
              </div>
              <div className="border-t border-border/20 pt-2">
                <div className="flex justify-between">
                  <span className="text-dim text-[10px]">Channel Position</span>
                  <span className="text-gold text-[10px] font-bold">{m5.channelPosition.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        <motion.div variants={fadeUp} className="premium-card rounded-xl p-4">
          <h3 className="font-display text-[10px] tracking-[0.3em] text-gold mb-3">VOLUME & VOLATILITY</h3>
          {m5 && (
            <div className="flex flex-col gap-2.5">
              {[
                { label: "ATR (M5)", value: m5.atr.toFixed(3), color: "text-foreground" },
                { label: "Volatility Ratio", value: m5.volatilityRatio.toFixed(2), color: m5.volatilityRatio > 1 ? "text-bearish" : "text-bullish" },
                { label: "Relative Volume", value: m5.relativeVolume.toFixed(2), color: m5.relativeVolume > 1.5 ? "text-bullish" : "text-dim" },
                { label: "MFI (14)", value: m5.mfi14.toFixed(1), color: m5.mfi14 > 80 ? "text-bearish" : m5.mfi14 < 20 ? "text-bullish" : "text-gold" },
                { label: "PSAR", value: `${m5.psar.toFixed(2)} (${m5.psar < price ? "Below" : "Above"})`, color: m5.psar < price ? "text-bullish" : "text-bearish" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg p-2.5" style={{ background: 'hsla(220,15%,12%,0.6)' }}>
                  <span className="text-dim text-[10px] block font-data">{item.label}</span>
                  <span className={`text-sm font-bold font-data ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-dim mt-3 font-data leading-relaxed">{layer.summary}</p>
        </motion.div>
      </div>
    </motion.div>
  );
}
