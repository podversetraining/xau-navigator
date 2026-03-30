import { motion } from "framer-motion";
import type { AnalysisResult } from "@/types/analysis";
import { AlertTriangle, Target, Shield, ArrowUpDown } from "lucide-react";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export function SlideTradeSetup({ analysis }: { analysis: AnalysisResult }) {
  const isBuy = analysis.recommendation === "BUY";
  const isSell = analysis.recommendation === "SELL";
  const dirColor = isBuy ? "text-bullish" : isSell ? "text-bearish" : "text-gold";
  const dirBg = isBuy ? "bg-success/10 border-success/25" : isSell ? "bg-destructive/10 border-destructive/25" : "bg-primary/10 border-primary/25";

  const slPips = Math.abs(analysis.entry - analysis.stopLoss).toFixed(2);
  const tp1Pips = Math.abs(analysis.tp1 - analysis.entry).toFixed(2);
  const tp2Pips = Math.abs(analysis.tp2 - analysis.entry).toFixed(2);
  const tp3Pips = Math.abs(analysis.tp3 - analysis.entry).toFixed(2);

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="h-full flex flex-col gap-4 p-8"
    >
      <motion.div variants={fadeUp}>
        <h2 className="font-display text-xs tracking-[0.3em] text-dim">TRADE EXECUTION PLAN</h2>
      </motion.div>

      <div className="grid grid-cols-2 gap-5 flex-1">
        <motion.div variants={fadeUp} className="premium-card rounded-xl p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-gold" />
            <h3 className="font-display text-[10px] tracking-[0.3em] text-gold">PRICE LADDER</h3>
          </div>
          <div className="flex-1 flex flex-col justify-between relative gap-2">
            <PriceLevel label="TP3 (30%)" price={analysis.tp3} pips={tp3Pips} color="text-bullish" bgColor="hsla(142,72%,45%,0.04)" borderColor="hsla(142,72%,45%,0.15)" />
            <PriceLevel label="TP2 (30%)" price={analysis.tp2} pips={tp2Pips} color="text-bullish" bgColor="hsla(142,72%,45%,0.04)" borderColor="hsla(142,72%,45%,0.15)" />
            <PriceLevel label="TP1 (40%)" price={analysis.tp1} pips={tp1Pips} color="text-bullish" bgColor="hsla(142,72%,45%,0.04)" borderColor="hsla(142,72%,45%,0.15)" />
            
            <motion.div
              className={`${dirBg} border rounded-xl p-4 flex justify-between items-center`}
              animate={{ boxShadow: ['0 0 0px hsla(43,96%,56%,0)', '0 0 15px hsla(43,96%,56%,0.15)', '0 0 0px hsla(43,96%,56%,0)'] }}
              transition={{ repeat: Infinity, duration: 3 }}
            >
              <div>
                <span className="text-dim text-[10px] font-display tracking-wider">ENTRY</span>
                <span className={`font-display text-2xl font-bold ${dirColor} block`}>{analysis.entry.toFixed(2)}</span>
              </div>
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 2.5 }}
                className={`${isBuy ? "bg-gradient-to-r from-success to-success/80" : isSell ? "bg-gradient-to-r from-destructive to-destructive/80" : "bg-gradient-to-r from-primary to-primary/80"} px-5 py-2.5 rounded-lg shadow-lg`}
              >
                <span className="font-display text-base font-bold text-background">{analysis.recommendation}</span>
              </motion.div>
            </motion.div>
            
            <PriceLevel label="STOP LOSS" price={analysis.stopLoss} pips={slPips} color="text-bearish" bgColor="hsla(0,72%,51%,0.04)" borderColor="hsla(0,72%,51%,0.15)" />
          </div>
        </motion.div>

        <div className="flex flex-col gap-4">
          <motion.div variants={fadeUp} className="premium-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <ArrowUpDown className="w-3.5 h-3.5 text-gold" />
              <h3 className="font-display text-[10px] tracking-[0.3em] text-gold">POSITION MANAGEMENT</h3>
            </div>
            <div className="flex flex-col gap-3">
              <ManagementStep step={1} action={analysis.management?.tp1Action || "At TP1: Close 40%, move SL to entry"} />
              <ManagementStep step={2} action={analysis.management?.tp2Action || "At TP2: Close 30%, move SL to TP1"} />
              <ManagementStep step={3} action={analysis.management?.tp3Action || "TP3: Trail with ATR stop"} />
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="premium-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-3.5 h-3.5 text-gold" />
              <h3 className="font-display text-[10px] tracking-[0.3em] text-gold">RISK METRICS</h3>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <MetricBox label="Risk/Reward" value={`1:${analysis.riskReward?.toFixed(1) || "—"}`} />
              <MetricBox label="Lot Size" value="0.01 / $1K" />
              <MetricBox label="Max Loss" value="$20.00" />
              <MetricBox label="Trade Type" value={analysis.tradeType} />
            </div>
            <p className="text-[10px] text-dim mt-3 font-data">0.01 lot per $1,000 account balance (fixed risk rule)</p>
          </motion.div>

          <motion.div variants={fadeUp} className="premium-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-3.5 h-3.5 text-bearish" />
              <h3 className="font-display text-[10px] tracking-[0.3em] text-bearish">FAILURE SCENARIO</h3>
            </div>
            <div className="flex flex-col gap-2 text-xs font-data">
              <div><span className="text-dim">Invalidation: </span><span className="text-foreground">{analysis.failureScenario?.invalidation || "—"}</span></div>
              <div><span className="text-dim">Reverse Level: </span><span className="text-foreground">{analysis.failureScenario?.reverseLevel || "—"}</span></div>
              <div><span className="text-dim">Reverse Trade: </span><span className="text-foreground">{analysis.failureScenario?.reverseOpportunity || "—"}</span></div>
            </div>
          </motion.div>
        </div>
      </div>

      <motion.div variants={fadeUp} className="bg-destructive/5 border border-destructive/15 rounded-xl p-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-bearish shrink-0" />
          <p className="text-[10px] text-dim font-data">
            <span className="text-bearish font-semibold">RISK WARNING: </span>
            This is AI-generated analysis, not a recommendation. Trading involves significant risk. Rely on your own analysis.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function PriceLevel({ label, price, pips, color, bgColor, borderColor }: { label: string; price: number; pips: string; color: string; bgColor: string; borderColor: string }) {
  return (
    <div className="rounded-lg p-3 flex justify-between items-center border" style={{ background: bgColor, borderColor }}>
      <div>
        <span className="text-dim text-[10px] font-display tracking-wider">{label}</span>
        <span className={`font-data text-base font-bold ${color} block tabular-nums`}>{price.toFixed(2)}</span>
      </div>
      <span className="text-dim text-[10px] font-data tabular-nums">{pips} pts</span>
    </div>
  );
}

function ManagementStep({ step, action }: { step: number; action: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-gold text-[10px] font-bold shrink-0">{step}</span>
      <span className="text-xs text-foreground font-data leading-relaxed">{action}</span>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg p-3 text-center" style={{ background: 'hsla(220,15%,12%,0.6)' }}>
      <span className="text-dim text-[10px] font-data block">{label}</span>
      <span className="text-gold font-display text-sm font-bold">{value}</span>
    </div>
  );
}
