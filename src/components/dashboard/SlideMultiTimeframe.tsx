import type { TimeframeData } from "@/lib/parseData";

export function SlideMultiTimeframe({ data }: { data: TimeframeData[] }) {
  const timeframes = ["D1", "H4", "H1", "M30", "M15", "M5", "M1"];

  return (
    <div className="h-full flex flex-col gap-4 p-8">
      <h2 className="font-display text-lg tracking-widest text-dim">MULTI-TIMEFRAME MATRIX</h2>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs font-data">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-gold py-2 px-2 font-display text-xs tracking-wider">INDICATOR</th>
              {timeframes.map(tf => (
                <th key={tf} className="text-center text-gold py-2 px-2 font-display text-xs tracking-wider">{tf}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <MatrixRow label="RSI (14)" data={data} timeframes={timeframes} getter={d => d.rsi} format={v => v.toFixed(1)} colorFn={v => v > 70 ? "text-bearish" : v < 30 ? "text-bullish" : "text-foreground"} />
            <MatrixRow label="MACD" data={data} timeframes={timeframes} getter={d => d.macd} format={v => v.toFixed(2)} colorFn={v => v > 0 ? "text-bullish" : "text-bearish"} />
            <MatrixRow label="MACD Hist" data={data} timeframes={timeframes} getter={d => d.macdHistogram} format={v => v.toFixed(2)} colorFn={v => v > 0 ? "text-bullish" : "text-bearish"} />
            <MatrixRow label="ADX" data={data} timeframes={timeframes} getter={d => d.adxMain} format={v => v.toFixed(1)} colorFn={v => v > 25 ? "text-gold" : "text-dim"} />
            <MatrixRow label="Stoch K" data={data} timeframes={timeframes} getter={d => d.stochK} format={v => v.toFixed(1)} colorFn={v => v > 80 ? "text-bearish" : v < 20 ? "text-bullish" : "text-foreground"} />
            <MatrixRow label="Williams %R" data={data} timeframes={timeframes} getter={d => d.williamsR} format={v => v.toFixed(1)} colorFn={v => v > -20 ? "text-bearish" : v < -80 ? "text-bullish" : "text-foreground"} />
            <MatrixRow label="CCI" data={data} timeframes={timeframes} getter={d => d.cci20} format={v => v.toFixed(0)} colorFn={v => v > 100 ? "text-bearish" : v < -100 ? "text-bullish" : "text-foreground"} />
            <MatrixRow label="MFI" data={data} timeframes={timeframes} getter={d => d.mfi14} format={v => v.toFixed(1)} colorFn={v => v > 80 ? "text-bearish" : v < 20 ? "text-bullish" : "text-foreground"} />
            <MatrixRow label="SuperTrend" data={data} timeframes={timeframes} getter={d => d.superTrendDirection === "UP" ? 1 : 0} format={v => v === 1 ? "UP" : "DOWN"} colorFn={v => v === 1 ? "text-bullish" : "text-bearish"} />
            <MatrixRow label="Cloud" data={data} timeframes={timeframes} getter={d => d.cloudPosition === "ABOVE_CLOUD" ? 2 : d.cloudPosition === "INSIDE_CLOUD" ? 1 : 0} format={v => v === 2 ? "ABOVE" : v === 1 ? "INSIDE" : "BELOW"} colorFn={v => v === 2 ? "text-bullish" : v === 0 ? "text-bearish" : "text-gold"} />
            <MatrixRow label="Alligator" data={data} timeframes={timeframes} getter={d => d.alligatorState.includes("UP") ? 2 : d.alligatorState.includes("DOWN") ? 0 : 1} format={v => v === 2 ? "EAT UP" : v === 0 ? "EAT DN" : "SLEEP"} colorFn={v => v === 2 ? "text-bullish" : v === 0 ? "text-bearish" : "text-gold"} />
            <MatrixRow label="Trend" data={data} timeframes={timeframes} getter={d => d.trendClassification.includes("UP") ? 2 : d.trendClassification.includes("DOWN") ? 0 : 1} format={v => v === 2 ? "UP" : v === 0 ? "DOWN" : "SIDE"} colorFn={v => v === 2 ? "text-bullish" : v === 0 ? "text-bearish" : "text-gold"} />
            <MatrixRow label="Aroon Osc" data={data} timeframes={timeframes} getter={d => d.aroonOscillator} format={v => v.toFixed(0)} colorFn={v => v > 0 ? "text-bullish" : "text-bearish"} />
            <MatrixRow label="ATR" data={data} timeframes={timeframes} getter={d => d.atr} format={v => v.toFixed(2)} colorFn={() => "text-foreground"} />
            <MatrixRow label="Vol Ratio" data={data} timeframes={timeframes} getter={d => d.volatilityRatio} format={v => v.toFixed(2)} colorFn={v => v > 1 ? "text-bearish" : "text-bullish"} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MatrixRow({ label, data, timeframes, getter, format, colorFn }: {
  label: string;
  data: TimeframeData[];
  timeframes: string[];
  getter: (d: TimeframeData) => number;
  format: (v: number) => string;
  colorFn: (v: number) => string;
}) {
  return (
    <tr className="border-b border-border/30 hover:bg-secondary/50">
      <td className="text-dim py-1.5 px-2 font-semibold">{label}</td>
      {timeframes.map(tf => {
        const d = data.find(x => x.timeframe.includes(tf));
        if (!d) return <td key={tf} className="text-center text-dim py-1.5 px-2">—</td>;
        const val = getter(d);
        return (
          <td key={tf} className={`text-center py-1.5 px-2 font-semibold ${colorFn(val)}`}>
            {format(val)}
          </td>
        );
      })}
    </tr>
  );
}
