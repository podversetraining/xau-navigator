import { motion, AnimatePresence } from "framer-motion";
import type { AnalysisResult } from "@/types/analysis";
import type { TimeframeData } from "@/lib/parseData";

function ScoreBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = (value / max) * 100;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-sm font-data">
        <span className="text-dim">{label}</span>
        <span className={color}>{value}/{max}</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className={`h-full rounded-full ${pct >= 80 ? "bg-bullish" : pct >= 50 ? "bg-gold" : "bg-bearish"}`}
        />
      </div>
    </div>
  );
}

export function SlideOverview({ analysis, data }: { analysis: AnalysisResult; data: TimeframeData[] }) {
  const d1 = data.find(d => d.timeframe.includes("D1"));
  const recColor = analysis.recommendation === "BUY" ? "text-bullish" : analysis.recommendation === "SELL" ? "text-bearish" : "text-gold";
  const recBg = analysis.recommendation === "BUY" ? "bg-bullish" : analysis.recommendation === "SELL" ? "bg-bearish" : "bg-gold";

  return (
    <div className="h-full flex flex-col gap-4 p-8">
      {/* Risk Disclaimer */}
      <div className="bg-bearish/10 border border-bearish/30 rounded-lg px-4 py-2 flex items-center gap-2">
        <span className="text-bearish text-sm shrink-0">⚠</span>
        <p className="text-xs text-bearish font-data">
          <strong>RISK WARNING:</strong> Trading involves significant risk. This is AI-generated analysis, not a recommendation. Rely on your own analysis.
        </p>
      </div>
      <div className="text-center">
        <h2 className="font-display text-lg tracking-widest text-dim mb-2">TRADING SIGNAL OVERVIEW</h2>
        <div className="flex items-center justify-center gap-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`${recBg} px-8 py-3 rounded-lg`}
          >
            <span className="font-display text-4xl font-bold text-background">
              {analysis.recommendation}
            </span>
          </motion.div>
          <div className="flex flex-col items-start">
            <span className="text-dim text-sm font-data">{analysis.tradeType}</span>
            <span className={`font-display text-2xl font-bold ${recColor}`}>
              {analysis.score.total}/100
            </span>
            <span className="text-gold text-sm">{analysis.score.rating}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 flex-1">
        <div className="glass-panel rounded-lg p-5 gold-border-glow">
          <h3 className="font-display text-xs tracking-widest text-gold mb-4">SCORING</h3>
          <div className="flex flex-col gap-4">
            <ScoreBar label="Layer 1 — Trend" value={analysis.score.layer1} max={40} color="text-foreground" />
            <ScoreBar label="Layer 2 — Momentum" value={analysis.score.layer2} max={35} color="text-foreground" />
            <ScoreBar label="Layer 3 — Entry" value={analysis.score.layer3} max={25} color="text-foreground" />
          </div>
        </div>

        <div className="glass-panel rounded-lg p-5 gold-border-glow">
          <h3 className="font-display text-xs tracking-widest text-gold mb-4">TRADE SETUP</h3>
          <div className="flex flex-col gap-3 font-data text-sm">
            <Row label="Entry" value={analysis.entry.toFixed(2)} accent />
            <Row label="Stop Loss" value={analysis.stopLoss.toFixed(2)} bearish />
            <Row label="TP1 (40%)" value={analysis.tp1.toFixed(2)} bullish />
            <Row label="TP2 (30%)" value={analysis.tp2.toFixed(2)} bullish />
            <Row label="TP3 (30%)" value={analysis.tp3.toFixed(2)} bullish />
            <div className="border-t border-border pt-2 mt-1">
              <Row label="Risk/Reward" value={`1:${analysis.riskReward.toFixed(1)}`} accent />
              <Row label="Lot Size" value={analysis.lotSize.toFixed(2)} />
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-lg p-5 gold-border-glow">
          <h3 className="font-display text-xs tracking-widest text-gold mb-4">KEY LEVELS</h3>
          <div className="flex flex-col gap-3 font-data text-sm">
            {analysis.keyLevels?.strongResistance?.map((r, i) => (
              <Row key={`r${i}`} label={`Resistance ${i + 1}`} value={r.toFixed(2)} bearish />
            ))}
            <Row label="Daily Pivot" value={analysis.keyLevels?.dailyPivot?.toFixed(2) || "-"} accent />
            {analysis.keyLevels?.strongSupport?.map((s, i) => (
              <Row key={`s${i}`} label={`Support ${i + 1}`} value={s.toFixed(2)} bullish />
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-border">
            <h4 className="text-xs text-dim mb-2">MARKET STATUS</h4>
            <p className="text-xs text-foreground">{analysis.timing?.marketStatus || "Active"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, accent, bullish, bearish }: { label: string; value: string; accent?: boolean; bullish?: boolean; bearish?: boolean }) {
  const valClass = accent ? "text-gold" : bullish ? "text-bullish" : bearish ? "text-bearish" : "text-foreground";
  return (
    <div className="flex justify-between">
      <span className="text-dim">{label}</span>
      <span className={`font-semibold ${valClass}`}>{value}</span>
    </div>
  );
}
