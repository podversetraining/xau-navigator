import { motion } from "framer-motion";
import type { AnalysisResult } from "@/types/analysis";
import type { TimeframeData } from "@/lib/parseData";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

function ScoreBar({ label, value, max, delay = 0 }: { label: string; value: number; max: number; delay?: number }) {
  const pct = (value / max) * 100;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-sm font-data">
        <span className="text-dim">{label}</span>
        <span className="text-foreground font-semibold">{value}/{max}</span>
      </div>
      <div className="h-2.5 bg-secondary rounded-full overflow-hidden relative">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.5, ease: [0.25, 0.46, 0.45, 0.94], delay }}
          className={`h-full rounded-full relative ${pct >= 80 ? "bg-gradient-to-r from-success to-success/80" : pct >= 50 ? "bg-gradient-to-r from-primary to-primary/80" : "bg-gradient-to-r from-destructive to-destructive/80"}`}
        >
          <div className="absolute right-0 top-0 h-full w-4 bg-gradient-to-r from-transparent to-white/20 rounded-full" />
        </motion.div>
      </div>
    </div>
  );
}

export function SlideOverview({ analysis, data }: { analysis: AnalysisResult; data: TimeframeData[] }) {
  const recColor = analysis.recommendation === "BUY" ? "text-bullish" : analysis.recommendation === "SELL" ? "text-bearish" : "text-gold";
  const recBg = analysis.recommendation === "BUY" ? "bg-gradient-to-r from-success to-success/80" : analysis.recommendation === "SELL" ? "bg-gradient-to-r from-destructive to-destructive/80" : "bg-gradient-to-r from-primary to-primary/80";

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="h-full flex flex-col gap-4 p-8"
    >
      {/* Risk Disclaimer */}
      <motion.div variants={fadeUp} className="bg-destructive/5 border border-destructive/20 rounded-lg px-4 py-2 flex items-center gap-2">
        <span className="text-bearish text-sm shrink-0">⚠</span>
        <p className="text-[10px] text-bearish font-data">
          <strong>RISK WARNING:</strong> Trading involves significant risk. This is AI-generated analysis, not a recommendation. Rely on your own analysis.
        </p>
      </motion.div>

      <motion.div variants={fadeUp} className="text-center">
        <h2 className="font-display text-xs tracking-[0.3em] text-dim mb-3">TRADING SIGNAL OVERVIEW</h2>
        <div className="flex items-center justify-center gap-6">
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.3 }}
            className={`${recBg} px-10 py-4 rounded-xl shadow-lg relative overflow-hidden`}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
            <span className="font-display text-4xl font-bold text-background relative z-10">
              {analysis.recommendation}
            </span>
          </motion.div>
          <div className="flex flex-col items-start">
            <span className="text-dim text-xs font-display tracking-wider">{analysis.tradeType}</span>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className={`font-display text-3xl font-bold ${recColor}`}
            >
              {analysis.score.total}/100
            </motion.span>
            <span className="text-gold text-sm font-display tracking-wider">{analysis.score.rating}</span>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-3 gap-5 flex-1">
        <motion.div variants={fadeUp} className="premium-card rounded-xl p-5">
          <h3 className="font-display text-[10px] tracking-[0.3em] text-gold mb-4">SCORING BREAKDOWN</h3>
          <div className="flex flex-col gap-4">
            <ScoreBar label="Layer 1 — Trend" value={analysis.score.layer1} max={40} delay={0.2} />
            <ScoreBar label="Layer 2 — Momentum" value={analysis.score.layer2} max={35} delay={0.4} />
            <ScoreBar label="Layer 3 — Entry" value={analysis.score.layer3} max={25} delay={0.6} />
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="premium-card rounded-xl p-5">
          <h3 className="font-display text-[10px] tracking-[0.3em] text-gold mb-4">TRADE SETUP</h3>
          <div className="flex flex-col gap-2.5 font-data text-sm">
            <Row label="Entry" value={analysis.entry.toFixed(2)} accent />
            <Row label="Stop Loss" value={analysis.stopLoss.toFixed(2)} bearish />
            <Row label="TP1 (40%)" value={analysis.tp1.toFixed(2)} bullish />
            <Row label="TP2 (30%)" value={analysis.tp2.toFixed(2)} bullish />
            <Row label="TP3 (30%)" value={analysis.tp3.toFixed(2)} bullish />
            <div className="border-t border-border/50 pt-2 mt-1">
              <Row label="Risk/Reward" value={`1:${analysis.riskReward.toFixed(1)}`} accent />
              <Row label="Lot Size" value="0.01 / $1,000" />
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="premium-card rounded-xl p-5">
          <h3 className="font-display text-[10px] tracking-[0.3em] text-gold mb-4">KEY LEVELS</h3>
          <div className="flex flex-col gap-2.5 font-data text-sm">
            {analysis.keyLevels?.strongResistance?.map((r: number, i: number) => (
              <Row key={`r${i}`} label={`Resistance ${i + 1}`} value={r.toFixed(2)} bearish />
            ))}
            <Row label="Daily Pivot" value={analysis.keyLevels?.dailyPivot?.toFixed(2) || "-"} accent />
            {analysis.keyLevels?.strongSupport?.map((s: number, i: number) => (
              <Row key={`s${i}`} label={`Support ${i + 1}`} value={s.toFixed(2)} bullish />
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-border/50">
            <h4 className="text-[10px] text-dim font-display tracking-wider mb-1">MARKET STATUS</h4>
            <p className="text-xs text-foreground">{analysis.timing?.marketStatus || "Active"}</p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function Row({ label, value, accent, bullish, bearish }: { label: string; value: string; accent?: boolean; bullish?: boolean; bearish?: boolean }) {
  const valClass = accent ? "text-gold" : bullish ? "text-bullish" : bearish ? "text-bearish" : "text-foreground";
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-dim text-xs">{label}</span>
      <span className={`font-semibold ${valClass}`}>{value}</span>
    </div>
  );
}
