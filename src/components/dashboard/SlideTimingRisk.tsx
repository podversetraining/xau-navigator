import { motion } from "framer-motion";
import type { AnalysisResult } from "@/types/analysis";
import { Clock, Briefcase, AlertTriangle } from "lucide-react";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export function SlideTimingRisk({ analysis }: { analysis: AnalysisResult }) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="h-full flex flex-col gap-5 p-8"
    >
      <motion.div variants={fadeUp}>
        <h2 className="font-display text-xs tracking-[0.3em] text-dim">TIMING & RISK MANAGEMENT</h2>
      </motion.div>

      <div className="grid grid-cols-2 gap-5 flex-1">
        <motion.div variants={fadeUp} className="premium-card rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-gold" />
            <h3 className="font-display text-[10px] tracking-[0.3em] text-gold">MARKET TIMING</h3>
          </div>
          <div className="flex flex-col gap-4">
            <InfoBlock label="Data Timestamp" value={analysis.timing?.dataTime || "—"} />
            <InfoBlock label="Market Status" value={analysis.timing?.marketStatus || "Active"} />
            <InfoBlock label="Best Trading Window" value={analysis.timing?.bestTradingTime || "London & NY overlap (15:00-19:00 Gulf Time)"} />

            <div className="rounded-xl p-4 mt-2" style={{ background: 'hsla(220,15%,12%,0.6)' }}>
              <h4 className="text-[10px] text-gold font-display tracking-[0.2em] mb-3">TRADING SESSIONS (GULF TIME)</h4>
              <div className="flex flex-col gap-2.5 text-xs font-data">
                <SessionRow name="Sydney" time="01:00 - 09:00" active={false} />
                <SessionRow name="Tokyo" time="04:00 - 12:00" active={false} />
                <SessionRow name="London" time="10:00 - 19:00" active />
                <SessionRow name="New York" time="15:00 - 00:00" active />
              </div>
            </div>
          </div>
        </motion.div>

        <div className="flex flex-col gap-4">
          <motion.div variants={fadeUp} className="premium-card rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-4 h-4 text-gold" />
              <h3 className="font-display text-[10px] tracking-[0.3em] text-gold">POSITION SIZING</h3>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <StatBox label="Account Capital" value="$1,000" />
              <StatBox label="Risk Per Trade" value="2% ($20)" />
              <StatBox label="Lot Size" value={analysis.lotSize?.toFixed(2) || "—"} />
              <StatBox label="Risk/Reward" value={`1:${analysis.riskReward?.toFixed(1) || "—"}`} />
            </div>
            <p className="text-[10px] text-dim font-data mt-3 leading-relaxed">{analysis.lotCalculation}</p>
          </motion.div>

          <motion.div variants={fadeUp} className="premium-card rounded-xl p-6 flex-1">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-bearish" />
              <h3 className="font-display text-[10px] tracking-[0.3em] text-bearish">INVALIDATION SCENARIOS</h3>
            </div>
            <div className="flex flex-col gap-3">
              <div className="bg-destructive/5 border border-destructive/15 rounded-lg p-3">
                <span className="text-dim text-[10px] font-data block">What Invalidates This Analysis?</span>
                <span className="text-foreground text-xs font-data">{analysis.failureScenario?.invalidation || "—"}</span>
              </div>
              <div className="bg-destructive/5 border border-destructive/15 rounded-lg p-3">
                <span className="text-dim text-[10px] font-data block">Reversal Level</span>
                <span className="text-foreground text-xs font-data">{analysis.failureScenario?.reverseLevel || "—"}</span>
              </div>
              <div className="bg-primary/5 border border-primary/15 rounded-lg p-3">
                <span className="text-dim text-[10px] font-data block">Reverse Trade Opportunity</span>
                <span className="text-foreground text-xs font-data">{analysis.failureScenario?.reverseOpportunity || "—"}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-dim text-[10px] font-display tracking-wider block">{label}</span>
      <span className="text-foreground text-sm font-data font-semibold">{value}</span>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg p-3 text-center" style={{ background: 'hsla(220,15%,12%,0.6)' }}>
      <span className="text-dim text-[10px] font-data block">{label}</span>
      <span className="text-gold font-display text-sm font-bold">{value}</span>
    </div>
  );
}

function SessionRow({ name, time, active }: { name: string; time: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {active ? (
          <motion.span
            className="w-2 h-2 rounded-full bg-bullish"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
        ) : (
          <span className="w-2 h-2 rounded-full bg-muted" />
        )}
        <span className={active ? "text-foreground font-semibold" : "text-dim"}>{name}</span>
      </div>
      <span className="text-dim tabular-nums">{time}</span>
    </div>
  );
}
