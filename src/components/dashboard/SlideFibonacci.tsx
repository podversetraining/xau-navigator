import { motion } from "framer-motion";
import type { TimeframeData } from "@/lib/parseData";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export function SlideFibonacci({ data }: { data: TimeframeData[] }) {
  const d1 = data.find(d => d.timeframe.includes("D1"));
  const h4 = data.find(d => d.timeframe.includes("H4"));
  const h1 = data.find(d => d.timeframe.includes("H1"));

  if (!d1) return null;
  const price = d1.currentPrice;

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="h-full flex flex-col gap-4 p-8"
    >
      <motion.div variants={fadeUp}>
        <h2 className="font-display text-xs tracking-[0.3em] text-dim">FIBONACCI GOLDEN RATIO ANALYSIS</h2>
      </motion.div>

      <div className="grid grid-cols-3 gap-4 flex-1">
        {[{ tf: d1, name: "D1" }, { tf: h4, name: "H4" }, { tf: h1, name: "H1" }].map(({ tf, name }) => tf && (
          <motion.div key={name} variants={fadeUp} className="premium-card rounded-xl p-4 flex flex-col">
            <h3 className="font-display text-[10px] tracking-[0.3em] text-gold mb-2">{name} FIBONACCI</h3>
            <div className="flex justify-between text-[10px] font-data mb-3">
              <span className="text-dim">High: <span className="text-bearish font-semibold">{tf.fibSwingHigh.toFixed(2)}</span></span>
              <span className="text-dim">Low: <span className="text-bullish font-semibold">{tf.fibSwingLow.toFixed(2)}</span></span>
            </div>
            <div className={`text-center mb-3 px-3 py-1.5 rounded-lg border text-[10px] font-display tracking-wider ${
              tf.fibTrendDirection === "UPTREND"
                ? "bg-success/8 text-bullish border-success/20"
                : "bg-destructive/8 text-bearish border-destructive/20"
            }`}>
              {tf.fibTrendDirection}
            </div>

            <div className="flex flex-col gap-0.5 mb-3">
              <span className="text-dim text-[10px] mb-1 font-display tracking-wider">RETRACEMENT LEVELS</span>
              {Object.entries(tf.fibLevels).map(([level, val]) => (
                <FibRow key={level} level={level} value={val} price={price} />
              ))}
            </div>

            <div className="mt-auto pt-3 border-t border-border/20">
              <div className="flex justify-between text-[10px] font-data">
                <span className="text-dim">Position in Range</span>
                <span className="text-gold font-bold">{tf.pricePositionInRange.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-[10px] font-data mt-1">
                <span className="text-dim">Closest Level</span>
                <span className="text-gold font-bold">{tf.closestFibLevel}</span>
              </div>
              <div className="mt-2 h-2 bg-secondary/50 rounded-full overflow-hidden relative">
                <motion.div
                  className="absolute h-full bg-gradient-to-r from-destructive/30 to-success/30 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1 }}
                />
                <motion.div
                  className="absolute h-full w-1.5 bg-gold rounded-full shadow-lg"
                  initial={{ left: 0 }}
                  animate={{ left: `${tf.pricePositionInRange}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  style={{ boxShadow: '0 0 6px hsla(43,96%,56%,0.5)' }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function FibRow({ level, value, price }: { level: string; value: number; price: number }) {
  const isAbove = value > price;
  const dist = Math.abs(value - price);
  const color = isAbove ? "text-bearish" : "text-bullish";

  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-gold-dim text-[10px] font-data w-12">{level}</span>
      <span className={`text-[10px] font-data font-semibold ${color} tabular-nums`}>{value.toFixed(2)}</span>
      <span className="text-dim text-[10px] font-data w-14 text-right tabular-nums">{dist.toFixed(1)}p</span>
    </div>
  );
}
