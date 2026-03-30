import { motion } from "framer-motion";
import type { AnalysisResult } from "@/types/analysis";
import { isValidAiText } from "@/lib/sanitizeAi";

function isValidNumber(v: unknown): v is number {
  return typeof v === "number" && !isNaN(v) && v > 0;
}

export function SlideTradeSetup({ analysis }: { analysis: AnalysisResult }) {
  const isWait = analysis.recommendation === "WAIT";

  if (isWait) {
    return (
      <div className="h-full flex flex-col gap-6 p-8">
        <h2 className="font-display text-lg tracking-widest text-dim">TRADE EXECUTION PLAN</h2>
        <div className="flex-1 flex items-center justify-center">
          <div className="glass-panel rounded-lg p-12 gold-border-glow text-center max-w-lg">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="bg-gold px-8 py-4 rounded-lg inline-block mb-6"
            >
              <span className="font-display text-3xl font-bold text-background">AWAITING SIGNAL</span>
            </motion.div>
            <p className="text-foreground font-data text-sm mb-4">
              Current market conditions do not meet the minimum confidence threshold for a trade recommendation.
            </p>
            <p className="text-dim font-data text-xs">
              The AI system requires at least 50/100 confidence score across all three analysis layers before issuing a trade signal. Continue monitoring — conditions are updated every 5 minutes.
            </p>
          </div>
        </div>
        <div className="bg-bearish/5 border border-bearish/20 rounded-lg p-4 mt-auto">
          <div className="flex items-start gap-3">
            <span className="text-bearish text-lg shrink-0">⚠</span>
            <div className="text-xs text-dim font-data leading-relaxed">
              <p className="text-bearish font-semibold mb-1">RISK WARNING</p>
              <p>Trading involves significant risk of loss. This is an <strong className="text-foreground">AI-generated analysis</strong> — it may be accurate or inaccurate. Always rely on your own analysis and judgment.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isBuy = analysis.recommendation === "BUY";
  const isSell = analysis.recommendation === "SELL";
  const dirColor = isBuy ? "text-bullish" : isSell ? "text-bearish" : "text-gold";
  const dirBg = isBuy ? "bg-bullish/10 border-bullish/30" : isSell ? "bg-bearish/10 border-bearish/30" : "bg-gold/10 border-gold/30";

  const slPips = isValidNumber(analysis.entry) && isValidNumber(analysis.stopLoss) ? Math.abs(analysis.entry - analysis.stopLoss).toFixed(2) : null;
  const tp1Pips = isValidNumber(analysis.tp1) && isValidNumber(analysis.entry) ? Math.abs(analysis.tp1 - analysis.entry).toFixed(2) : null;
  const tp2Pips = isValidNumber(analysis.tp2) && isValidNumber(analysis.entry) ? Math.abs(analysis.tp2 - analysis.entry).toFixed(2) : null;
  const tp3Pips = isValidNumber(analysis.tp3) && isValidNumber(analysis.entry) ? Math.abs(analysis.tp3 - analysis.entry).toFixed(2) : null;

  return (
    <div className="h-full flex flex-col gap-4 p-8">
      <h2 className="font-display text-lg tracking-widest text-dim">TRADE EXECUTION PLAN</h2>

      <div className="grid grid-cols-2 gap-6 flex-1">
        {/* Visual Price Ladder */}
        <div className="glass-panel rounded-lg p-6 gold-border-glow flex flex-col">
          <h3 className="font-display text-xs tracking-widest text-gold mb-4">PRICE LADDER</h3>
          <div className="flex-1 flex flex-col justify-between relative">
            {isValidNumber(analysis.tp3) && tp3Pips && (
              <PriceLevel label="TP3 (30%)" price={analysis.tp3} pips={tp3Pips} color="text-bullish" bgColor="bg-bullish/5" />
            )}
            {isValidNumber(analysis.tp2) && tp2Pips && (
              <PriceLevel label="TP2 (30%)" price={analysis.tp2} pips={tp2Pips} color="text-bullish" bgColor="bg-bullish/5" />
            )}
            {isValidNumber(analysis.tp1) && tp1Pips && (
              <PriceLevel label="TP1 (40%)" price={analysis.tp1} pips={tp1Pips} color="text-bullish" bgColor="bg-bullish/5" />
            )}
            {isValidNumber(analysis.entry) && (
              <div className={`${dirBg} border rounded-lg p-4 flex justify-between items-center`}>
                <div>
                  <span className="text-dim text-xs font-data">ENTRY</span>
                  <span className={`font-display text-2xl font-bold ${dirColor} block`}>{analysis.entry.toFixed(2)}</span>
                </div>
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className={`${isBuy ? "bg-bullish" : "bg-bearish"} px-4 py-2 rounded-md`}
                >
                  <span className="font-display text-lg font-bold text-background">{analysis.recommendation}</span>
                </motion.div>
              </div>
            )}
            {isValidNumber(analysis.stopLoss) && slPips && (
              <PriceLevel label="STOP LOSS" price={analysis.stopLoss} pips={slPips} color="text-bearish" bgColor="bg-bearish/5" />
            )}
          </div>
        </div>

        {/* Management & Risk */}
        <div className="flex flex-col gap-4">
          <div className="glass-panel rounded-lg p-5 gold-border-glow">
            <h3 className="font-display text-xs tracking-widest text-gold mb-3">POSITION MANAGEMENT</h3>
            <div className="flex flex-col gap-3">
              <ManagementStep step={1} action={isValidStr(analysis.management?.tp1Action) ? analysis.management.tp1Action : "At TP1: Close 40%, move SL to entry"} />
              <ManagementStep step={2} action={isValidStr(analysis.management?.tp2Action) ? analysis.management.tp2Action : "At TP2: Close 30%, move SL to TP1"} />
              <ManagementStep step={3} action={isValidStr(analysis.management?.tp3Action) ? analysis.management.tp3Action : "TP3: Trail with ATR stop"} />
            </div>
          </div>

          <div className="glass-panel rounded-lg p-5 gold-border-glow">
            <h3 className="font-display text-xs tracking-widest text-gold mb-3">RISK METRICS</h3>
            <div className="grid grid-cols-2 gap-3">
              {isValidNumber(analysis.riskReward) && <MetricBox label="Risk/Reward" value={`1:${analysis.riskReward.toFixed(1)}`} />}
              <MetricBox label="Lot Size" value="0.01 / $1,000" />
              <MetricBox label="Max Loss" value="$20.00" />
              <MetricBox label="Trade Type" value={analysis.tradeType || "Intraday"} />
            </div>
            <p className="text-xs text-dim mt-3 font-data">Lot calculation: 0.01 lot per $1,000 account balance (fixed risk management rule)</p>
          </div>

          {(isValidStr(analysis.failureScenario?.invalidation) || isValidStr(analysis.failureScenario?.reverseLevel)) && (
            <div className="glass-panel rounded-lg p-5 gold-border-glow">
              <h3 className="font-display text-xs tracking-widest text-bearish mb-3">⚠ FAILURE SCENARIO</h3>
              <div className="flex flex-col gap-2 text-sm font-data">
                {isValidStr(analysis.failureScenario?.invalidation) && (
                  <div><span className="text-dim">Invalidation: </span><span className="text-foreground">{analysis.failureScenario.invalidation}</span></div>
                )}
                {isValidStr(analysis.failureScenario?.reverseLevel) && (
                  <div><span className="text-dim">Reverse Level: </span><span className="text-foreground">{analysis.failureScenario.reverseLevel}</span></div>
                )}
                {isValidStr(analysis.failureScenario?.reverseOpportunity) && (
                  <div><span className="text-dim">Reverse Trade: </span><span className="text-foreground">{analysis.failureScenario.reverseOpportunity}</span></div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-bearish/5 border border-bearish/20 rounded-lg p-4 mt-auto">
        <div className="flex items-start gap-3">
          <span className="text-bearish text-lg shrink-0">⚠</span>
          <div className="text-xs text-dim font-data leading-relaxed">
            <p className="text-bearish font-semibold mb-1">RISK WARNING</p>
            <p>Trading involves significant risk of loss. This is an <strong className="text-foreground">AI-generated analysis</strong> — it may be accurate or inaccurate. Always rely on your own analysis and judgment.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PriceLevel({ label, price, pips, color, bgColor }: { label: string; price: number; pips: string; color: string; bgColor: string }) {
  return (
    <div className={`${bgColor} rounded-lg p-3 flex justify-between items-center`}>
      <div>
        <span className="text-dim text-xs font-data">{label}</span>
        <span className={`font-data text-lg font-bold ${color} block`}>{price.toFixed(2)}</span>
      </div>
      <span className="text-dim text-xs font-data">{pips} pts</span>
    </div>
  );
}

function ManagementStep({ step, action }: { step: number; action: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center text-gold text-xs font-bold shrink-0">{step}</span>
      <span className="text-sm text-foreground font-data">{action}</span>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-secondary rounded-md p-3 text-center">
      <span className="text-dim text-xs font-data block">{label}</span>
      <span className="text-gold font-display text-lg font-bold">{value}</span>
    </div>
  );
}
