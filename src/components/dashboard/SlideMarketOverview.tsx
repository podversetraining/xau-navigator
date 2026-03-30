import { motion } from "framer-motion";
import type { AnalysisResult, TimeframeSummary } from "@/types/analysis";
import type { TimeframeData } from "@/lib/parseData";

function TfCard({ tf, parsed }: { tf: TimeframeSummary; parsed?: TimeframeData }) {
  const trendColor = tf.trend === "Bullish" ? "text-bullish" : tf.trend === "Bearish" ? "text-bearish" : "text-gold";
  const momColor = tf.momentum === "Bullish" ? "text-bullish" : tf.momentum === "Bearish" ? "text-bearish" : "text-gold";
  const barColor = tf.strength >= 60 ? "bg-bullish" : tf.strength >= 40 ? "bg-gold" : "bg-bearish";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-lg p-3 gold-border-glow flex flex-col gap-2"
    >
      <div className="flex items-center justify-between">
        <span className="font-display text-sm tracking-widest text-gold">{tf.timeframe}</span>
        <span className={`font-display text-xs font-bold ${trendColor}`}>{tf.trend.toUpperCase()}</span>
      </div>
      
      {/* Strength bar */}
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${tf.strength}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
      <div className="flex justify-between text-xs font-data">
        <span className="text-dim">Strength</span>
        <span className="text-foreground">{tf.strength}%</span>
      </div>

      <div className="flex justify-between text-xs font-data">
        <span className="text-dim">Momentum</span>
        <span className={momColor}>{tf.momentum}</span>
      </div>

      {parsed && (
        <div className="border-t border-border pt-2 flex flex-col gap-1 text-xs font-data">
          <div className="flex justify-between">
            <span className="text-dim">RSI</span>
            <span className={parsed.rsi > 70 ? "text-bearish" : parsed.rsi < 30 ? "text-bullish" : "text-foreground"}>
              {parsed.rsi.toFixed(1)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-dim">MACD</span>
            <span className={parsed.macd > parsed.macdSignal ? "text-bullish" : "text-bearish"}>
              {parsed.macdHistogram > 0 ? "+" : ""}{parsed.macdHistogram.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      <p className="text-xs text-dim font-data mt-auto leading-tight">{tf.keySignal}</p>
    </motion.div>
  );
}

export function SlideMarketOverview({ analysis, data }: { analysis: AnalysisResult; data: TimeframeData[] }) {
  const overview = analysis.marketOverview;
  const biasColor = overview?.overallBias === "Bullish" ? "text-bullish" : overview?.overallBias === "Bearish" ? "text-bearish" : "text-gold";

  const tfOrder = ["D1", "H4", "H1", "M30", "M15", "M5", "M1"];
  const timeframes = overview?.timeframes?.length
    ? tfOrder.map(name => overview.timeframes.find(t => t.timeframe === name)).filter(Boolean) as TimeframeSummary[]
    : tfOrder.map(name => ({
        timeframe: name,
        trend: "Sideways" as const,
        momentum: "Neutral" as const,
        strength: 0,
        keySignal: "Awaiting analysis",
      }));

  const findParsed = (tf: string) => {
    const map: Record<string, string> = { D1: "D1", H4: "H4", H1: "H1", M30: "M30", M15: "M15", M5: "M5", M1: "M1" };
    return data.find(d => d.timeframe.includes(map[tf] || tf));
  };

  return (
    <div className="h-full flex flex-col gap-4 p-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg tracking-widest text-dim">MARKET OVERVIEW — ALL TIMEFRAMES</h2>
        <div className="flex items-center gap-3">
          <span className="text-dim text-sm font-data">Overall Bias:</span>
          <span className={`font-display text-2xl font-bold ${biasColor}`}>
            {overview?.overallBias?.toUpperCase() || "NEUTRAL"}
          </span>
        </div>
      </div>

      {overview?.summary && (
        <div className="glass-panel rounded-lg p-4 gold-border-glow">
          <p className="text-sm text-foreground font-data leading-relaxed">{overview.summary}</p>
        </div>
      )}

      <div className="grid grid-cols-7 gap-3 flex-1">
        {timeframes.map((tf) => (
          <TfCard key={tf.timeframe} tf={tf} parsed={findParsed(tf.timeframe)} />
        ))}
      </div>
    </div>
  );
}
