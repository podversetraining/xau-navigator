import type { AnalysisResult } from "@/types/analysis";
import type { TimeframeData } from "@/lib/parseData";
import { isValidAiText } from "@/lib/sanitizeAi";

function LevelRow({ label, value, current, type }: { label: string; value: number; current: number; type: "resistance" | "support" | "neutral" }) {
  const dist = value - current;
  const distPct = ((dist / current) * 100).toFixed(2);
  const color = type === "resistance" ? "text-bearish" : type === "support" ? "text-bullish" : "text-gold";

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-dim text-xs font-data">{label}</span>
      <div className="flex items-center gap-4">
        <span className={`font-data text-sm font-semibold ${color}`}>{value.toFixed(2)}</span>
        <span className="text-dim text-xs font-data w-20 text-right">{dist > 0 ? "+" : ""}{distPct}%</span>
      </div>
    </div>
  );
}

export function SlideEntryPoint({ analysis, data }: { analysis: AnalysisResult; data: TimeframeData[] }) {
  const m15 = data.find(d => d.timeframe.includes("M15"));
  const m5 = data.find(d => d.timeframe.includes("M5"));
  const m1 = data.find(d => d.timeframe.includes("M1"));
  const layer = analysis.layer3Analysis;
  const price = m5?.currentPrice || 0;

  return (
    <div className="h-full flex flex-col gap-4 p-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg tracking-widest text-dim">LAYER 3 — ENTRY ZONE & CONFIRMATION</h2>
        <span className="text-gold font-display text-xl">{analysis.score.layer3}/25</span>
      </div>

      <div className="grid grid-cols-3 gap-4 flex-1">
        {/* Pivot Points */}
        <div className="glass-panel rounded-lg p-4 gold-border-glow">
          <h3 className="font-display text-xs tracking-widest text-gold mb-3">PIVOT POINTS — M15</h3>
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
        </div>

        {/* Bands & Channels */}
        <div className="glass-panel rounded-lg p-4 gold-border-glow">
          <h3 className="font-display text-xs tracking-widest text-gold mb-3">BANDS & CHANNELS</h3>
          {m5 && (
            <div className="flex flex-col gap-3">
              <div>
                <span className="text-dim text-xs font-data block mb-1">BOLLINGER BANDS (M5)</span>
                <LevelRow label="Upper" value={m5.bbUpper} current={price} type="resistance" />
                <LevelRow label="Middle" value={m5.bbMid} current={price} type="neutral" />
                <LevelRow label="Lower" value={m5.bbLower} current={price} type="support" />
                <div className="flex justify-between mt-1">
                  <span className="text-dim text-xs">BB Width</span>
                  <span className="text-gold text-xs font-bold">{m5.bbWidth20.toFixed(2)}</span>
                </div>
              </div>
              <div className="border-t border-border pt-2">
                <span className="text-dim text-xs font-data block mb-1">KELTNER CHANNEL (M5)</span>
                <LevelRow label="Upper" value={m5.keltnerUpper} current={price} type="resistance" />
                <LevelRow label="Middle" value={m5.keltnerMiddle} current={price} type="neutral" />
                <LevelRow label="Lower" value={m5.keltnerLower} current={price} type="support" />
              </div>
              <div className="border-t border-border pt-2">
                <div className="flex justify-between">
                  <span className="text-dim text-xs">Channel Position</span>
                  <span className="text-gold text-xs font-bold">{m5.channelPosition.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Volume & Volatility */}
        <div className="glass-panel rounded-lg p-4 gold-border-glow">
          <h3 className="font-display text-xs tracking-widest text-gold mb-3">VOLUME & VOLATILITY</h3>
          {m5 && (
            <div className="flex flex-col gap-3">
              <div className="bg-secondary rounded-md p-3">
                <span className="text-dim text-xs block">ATR (M5)</span>
                <span className="text-foreground text-lg font-bold font-data">{m5.atr.toFixed(3)}</span>
              </div>
              <div className="bg-secondary rounded-md p-3">
                <span className="text-dim text-xs block">Volatility Ratio</span>
                <span className={`text-lg font-bold font-data ${m5.volatilityRatio > 1 ? "text-bearish" : "text-bullish"}`}>
                  {m5.volatilityRatio.toFixed(2)}
                </span>
              </div>
              <div className="bg-secondary rounded-md p-3">
                <span className="text-dim text-xs block">Relative Volume</span>
                <span className={`text-lg font-bold font-data ${m5.relativeVolume > 1.5 ? "text-bullish" : "text-dim"}`}>
                  {m5.relativeVolume.toFixed(2)}
                </span>
              </div>
              <div className="bg-secondary rounded-md p-3">
                <span className="text-dim text-xs block">MFI (14)</span>
                <span className={`text-lg font-bold font-data ${m5.mfi14 > 80 ? "text-bearish" : m5.mfi14 < 20 ? "text-bullish" : "text-gold"}`}>
                  {m5.mfi14.toFixed(1)}
                </span>
              </div>
              <div className="bg-secondary rounded-md p-3">
                <span className="text-dim text-xs block">PSAR</span>
                <span className={`text-sm font-bold font-data ${m5.psar < price ? "text-bullish" : "text-bearish"}`}>
                  {m5.psar.toFixed(2)} ({m5.psar < price ? "Below" : "Above"})
                </span>
              </div>
            </div>
          )}
          {isValidAiText(layer.summary) && <p className="text-xs text-dim mt-3 font-data">{layer.summary}</p>}
        </div>
      </div>
    </div>
  );
}
