import { motion } from "framer-motion";
import type { TimeframeData } from "@/lib/parseData";

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const fadeUp = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export function SlideIchimoku({ data }: { data: TimeframeData[] }) {
  const d1 = data.find(d => d.timeframe.includes("D1"));
  const h4 = data.find(d => d.timeframe.includes("H4"));
  const h1 = data.find(d => d.timeframe.includes("H1"));
  const m30 = data.find(d => d.timeframe.includes("M30"));

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={stagger}
      className="h-full flex flex-col gap-4 p-8"
    >
      <motion.div variants={fadeUp}>
        <h2 className="font-display text-xs tracking-[0.3em] text-dim">ICHIMOKU CLOUD & ADVANCED INDICATORS</h2>
      </motion.div>

      <div className="grid grid-cols-4 gap-3 flex-1">
        {[{ tf: d1, name: "D1" }, { tf: h4, name: "H4" }, { tf: h1, name: "H1" }, { tf: m30, name: "M30" }].map(({ tf, name }) => tf && (
          <motion.div key={name} variants={fadeUp} className="premium-card rounded-xl p-4 flex flex-col gap-2">
            <h3 className="font-display text-[10px] tracking-[0.3em] text-gold">{name}</h3>

            <CloudBadge position={tf.cloudPosition} />

            <div className="flex flex-col gap-0.5 text-[10px] font-data">
              <Row label="Tenkan" value={tf.tenkanSen.toFixed(2)} color={tf.tenkanSen > tf.kijunSen ? "text-bullish" : "text-bearish"} />
              <Row label="Kijun" value={tf.kijunSen.toFixed(2)} />
              <Row label="Senkou A" value={tf.senkouA.toFixed(2)} />
              <Row label="Senkou B" value={tf.senkouB.toFixed(2)} />
              <Row label="Cloud Top" value={tf.cloudTop.toFixed(2)} color="text-bearish" />
              <Row label="Cloud Bot" value={tf.cloudBottom.toFixed(2)} color="text-bullish" />
            </div>

            <div className="border-t border-border/20 pt-2 mt-auto">
              <span className="text-dim text-[10px] block mb-1 font-display tracking-wider">ADVANCED</span>
              <Row label="Aroon" value={tf.aroonOscillator.toFixed(0)} color={tf.aroonOscillator > 0 ? "text-bullish" : "text-bearish"} />
              <Row label="Vortex" value={tf.vortexDiff.toFixed(4)} color={tf.vortexDiff > 0 ? "text-bullish" : "text-bearish"} />
              <Row label="TRIX" value={tf.trix.toFixed(4)} color={tf.trix > 0 ? "text-bullish" : "text-bearish"} />
              <Row label="ADXR" value={tf.adxr.toFixed(1)} />
              <Row label="TSI" value={tf.trendStrengthIndex.toFixed(1)} color={tf.trendStrengthIndex > 0 ? "text-bullish" : "text-bearish"} />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function CloudBadge({ position }: { position: string }) {
  const styles = position === "ABOVE_CLOUD"
    ? "bg-success/8 text-bullish border-success/20"
    : position === "BELOW_CLOUD"
    ? "bg-destructive/8 text-bearish border-destructive/20"
    : "bg-primary/8 text-gold border-primary/20";

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`text-center py-1.5 px-2 rounded-lg border text-[10px] font-display tracking-wider ${styles}`}
    >
      {position.replace("_", " ")}
    </motion.div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between py-0.5">
      <span className="text-dim">{label}</span>
      <span className={`font-semibold tabular-nums ${color || "text-foreground"}`}>{value}</span>
    </div>
  );
}
