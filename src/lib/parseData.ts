export interface TimeframeData {
  timeframe: string;
  pair: string;
  currentPrice: number;
  time: string;
  ema8: number;
  ema21: number;
  ema50: number;
  ema100: number;
  ema200: number;
  sma20: number;
  sma50: number;
  sma200: number;
  wma21: number;
  rsi: number;
  rsi21: number;
  rsi9: number;
  adxMain: number;
  adxPlus: number;
  adxMinus: number;
  macd: number;
  macdSignal: number;
  macdFast: number;
  macdFastSignal: number;
  macdHistogram: number;
  atr: number;
  atr21: number;
  bbUpper: number;
  bbMid: number;
  bbLower: number;
  bbWidth20: number;
  volume: number;
  volumeAvg20: number;
  relativeVolume: number;
  volumeRoc: number;
  currentCandle: { open: number; high: number; low: number; close: number; volume: number; time: string };
  lastCandle: { open: number; high: number; low: number; close: number; volume: number; time: string };
  r1: number; r2: number; r3: number;
  pivot: number;
  s1: number; s2: number; s3: number;
  stochK: number;
  stochD: number;
  williamsR: number;
  cci20: number;
  momentum14: number;
  demarker: number;
  psar: number;
  superTrendUpper: number;
  superTrendLower: number;
  superTrendValue: number;
  superTrendDirection: string;
  aroonUp: number;
  aroonDown: number;
  aroonOscillator: number;
  vortexPlus: number;
  vortexMinus: number;
  vortexDiff: number;
  trix: number;
  keltnerUpper: number;
  keltnerMiddle: number;
  keltnerLower: number;
  keltnerWidth: number;
  fractalUpSignal: boolean;
  fractalUpValue?: number;
  fractalDownSignal: boolean;
  fractalDownValue?: number;
  alligatorJaw: number;
  alligatorTeeth: number;
  alligatorLips: number;
  alligatorState: string;
  adxr: number;
  trendStrengthIndex: number;
  trendClassification: string;
  fibSwingHigh: number;
  fibSwingLow: number;
  fibRange: number;
  fibTrendDirection: string;
  fibLevels: Record<string, number>;
  fibExtLevels: Record<string, number>;
  pricePositionInRange: number;
  closestFibLevel: string;
  mfi14: number;
  tenkanSen: number;
  kijunSen: number;
  senkouA: number;
  senkouB: number;
  chikouSpan: number;
  cloudPosition: string;
  cloudTop: number;
  cloudBottom: number;
  roc12: number;
  channelHigh20: number;
  channelLow20: number;
  channelPosition: number;
  volatilityRatio: number;
  envelopesUpper: number;
}

function parseNum(val: string): number {
  return parseFloat(val.trim()) || 0;
}

function extractVal(lines: string[], key: string): string {
  for (const line of lines) {
    if (line.includes(key + ":")) {
      const parts = line.split(key + ":");
      if (parts[1]) {
        let v = parts[1].trim();
        // Handle values like "4564.15 (Distance: ...)"
        if (v.includes("(")) v = v.split("(")[0].trim();
        // Handle values like "4602.46 (Bars_Ago: 24)"
        return v;
      }
    }
  }
  return "0";
}

function extractCandle(lines: string[], startKey: string): { open: number; high: number; low: number; close: number; volume: number; time: string } {
  let idx = lines.findIndex(l => l.includes(startKey));
  if (idx === -1) return { open: 0, high: 0, low: 0, close: 0, volume: 0, time: "" };
  const block = lines.slice(idx, idx + 7);
  return {
    open: parseNum(extractVal(block, "open ")),
    high: parseNum(extractVal(block, "high ")),
    low: parseNum(extractVal(block, "low ")),
    close: parseNum(extractVal(block, "close ")),
    volume: parseNum(extractVal(block, "volume ")),
    time: extractVal(block, "time "),
  };
}

export function parseMarketData(text: string): TimeframeData[] {
  const timeframes: TimeframeData[] = [];
  const sections = text.split("--- Timeframe:");

  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const lines = section.split("\n");
    const tf = lines[0]?.trim().replace("---", "").trim() || "";

    const fibLevels: Record<string, number> = {};
    const fibExtLevels: Record<string, number> = {};

    // Parse fib levels
    for (const line of lines) {
      const fibMatch = line.match(/Fib_(\d+\.?\d*%):\s*([\d.]+)/);
      if (fibMatch && !line.includes("Ext_") && !line.includes("Time") && !line.includes("Fan")) {
        fibLevels[fibMatch[1]] = parseFloat(fibMatch[2]);
      }
      const fibExtMatch = line.match(/Fib_Ext_(\d+\.?\d*%):\s*([\d.]+)/);
      if (fibExtMatch) {
        fibExtLevels[fibExtMatch[1]] = parseFloat(fibExtMatch[2]);
      }
    }

    const data: TimeframeData = {
      timeframe: tf,
      pair: extractVal(lines, "Pair"),
      currentPrice: parseNum(extractVal(lines, "Current Price")),
      time: extractVal(lines, "Time"),
      ema8: parseNum(extractVal(lines, "EMA_8")),
      ema21: parseNum(extractVal(lines, "EMA_21")),
      ema50: parseNum(extractVal(lines, "EMA_50")),
      ema100: parseNum(extractVal(lines, "EMA_100")),
      ema200: parseNum(extractVal(lines, "EMA_200")),
      sma20: parseNum(extractVal(lines, "SMA_20")),
      sma50: parseNum(extractVal(lines, "SMA_50")),
      sma200: parseNum(extractVal(lines, "SMA_200")),
      wma21: parseNum(extractVal(lines, "WMA_21")),
      rsi: parseNum(extractVal(lines, "RSI")),
      rsi21: parseNum(extractVal(lines, "RSI_21")),
      rsi9: parseNum(extractVal(lines, "RSI_9")),
      adxMain: parseNum(extractVal(lines, "ADX_Main")),
      adxPlus: parseNum(extractVal(lines, "ADX_Plus")),
      adxMinus: parseNum(extractVal(lines, "ADX_Minus")),
      macd: parseNum(extractVal(lines, "MACD")),
      macdSignal: parseNum(extractVal(lines, "MACD_Signal")),
      macdFast: parseNum(extractVal(lines, "MACD_Fast")),
      macdFastSignal: parseNum(extractVal(lines, "MACD_Fast_Signal")),
      macdHistogram: parseNum(extractVal(lines, "MACD_Histogram")),
      atr: parseNum(extractVal(lines, "ATR")),
      atr21: parseNum(extractVal(lines, "ATR_21")),
      bbUpper: parseNum(extractVal(lines, "BB_UPPER")),
      bbMid: parseNum(extractVal(lines, "BB_MID")),
      bbLower: parseNum(extractVal(lines, "BB_LOWER")),
      bbWidth20: parseNum(extractVal(lines, "BB_Width_20")),
      volume: parseNum(extractVal(lines, "Volume")),
      volumeAvg20: parseNum(extractVal(lines, "Volume_Avg_20")),
      relativeVolume: parseNum(extractVal(lines, "Relative_Volume")),
      volumeRoc: parseNum(extractVal(lines, "Volume_ROC")),
      currentCandle: extractCandle(lines, "current candle:"),
      lastCandle: extractCandle(lines, "last complete candle:"),
      r1: parseNum(extractVal(lines, "Resistance 1 (R1)")),
      r2: parseNum(extractVal(lines, "Resistance 2 (R2)")),
      r3: parseNum(extractVal(lines, "Resistance 3 (R3)")),
      pivot: parseNum(extractVal(lines, "Pivot Point")),
      s1: parseNum(extractVal(lines, "Support 1 (S1)")),
      s2: parseNum(extractVal(lines, "Support 2 (S2)")),
      s3: parseNum(extractVal(lines, "Support 3 (S3)")),
      stochK: parseNum(extractVal(lines, "Stoch_K_14")),
      stochD: parseNum(extractVal(lines, "Stoch_D_14")),
      williamsR: parseNum(extractVal(lines, "Williams_R")),
      cci20: parseNum(extractVal(lines, "CCI_20")),
      momentum14: parseNum(extractVal(lines, "Momentum_14")),
      demarker: parseNum(extractVal(lines, "DeMarker")),
      psar: parseNum(extractVal(lines, "PSAR")),
      superTrendUpper: parseNum(extractVal(lines, "SuperTrend_Upper")),
      superTrendLower: parseNum(extractVal(lines, "SuperTrend_Lower")),
      superTrendValue: parseNum(extractVal(lines, "SuperTrend_Value")),
      superTrendDirection: extractVal(lines, "SuperTrend_Direction"),
      aroonUp: parseNum(extractVal(lines, "Aroon_Up")),
      aroonDown: parseNum(extractVal(lines, "Aroon_Down")),
      aroonOscillator: parseNum(extractVal(lines, "Aroon_Oscillator")),
      vortexPlus: parseNum(extractVal(lines, "Vortex_Plus")),
      vortexMinus: parseNum(extractVal(lines, "Vortex_Minus")),
      vortexDiff: parseNum(extractVal(lines, "Vortex_Diff")),
      trix: parseNum(extractVal(lines, "TRIX")),
      keltnerUpper: parseNum(extractVal(lines, "Keltner_Upper")),
      keltnerMiddle: parseNum(extractVal(lines, "Keltner_Middle")),
      keltnerLower: parseNum(extractVal(lines, "Keltner_Lower")),
      keltnerWidth: parseNum(extractVal(lines, "Keltner_Width")),
      fractalUpSignal: extractVal(lines, "Fractal_Up_Signal") === "TRUE",
      fractalUpValue: parseNum(extractVal(lines, "Fractal_Up_Value")),
      fractalDownSignal: extractVal(lines, "Fractal_Down_Signal") === "TRUE",
      fractalDownValue: parseNum(extractVal(lines, "Fractal_Down_Value")),
      alligatorJaw: parseNum(extractVal(lines, "Alligator_Jaw")),
      alligatorTeeth: parseNum(extractVal(lines, "Alligator_Teeth")),
      alligatorLips: parseNum(extractVal(lines, "Alligator_Lips")),
      alligatorState: extractVal(lines, "Alligator_State"),
      adxr: parseNum(extractVal(lines, "ADXR")),
      trendStrengthIndex: parseNum(extractVal(lines, "Trend_Strength_Index")),
      trendClassification: extractVal(lines, "Trend_Classification"),
      fibSwingHigh: parseNum(extractVal(lines, "Swing_High")),
      fibSwingLow: parseNum(extractVal(lines, "Swing_Low")),
      fibRange: parseNum(extractVal(lines, "Fib_Range")),
      fibTrendDirection: extractVal(lines, "Trend_Direction"),
      fibLevels,
      fibExtLevels,
      pricePositionInRange: parseNum(extractVal(lines, "Price_Position_in_Range")),
      closestFibLevel: extractVal(lines, "Closest_Fib_Level"),
      mfi14: parseNum(extractVal(lines, "MFI_14")),
      tenkanSen: parseNum(extractVal(lines, "Tenkan_Sen")),
      kijunSen: parseNum(extractVal(lines, "Kijun_Sen")),
      senkouA: parseNum(extractVal(lines, "Senkou_A")),
      senkouB: parseNum(extractVal(lines, "Senkou_B")),
      chikouSpan: parseNum(extractVal(lines, "Chikou_Span")),
      cloudPosition: extractVal(lines, "Cloud_Position"),
      cloudTop: parseNum(extractVal(lines, "Cloud_Top")),
      cloudBottom: parseNum(extractVal(lines, "Cloud_Bottom")),
      roc12: parseNum(extractVal(lines, "ROC_12")),
      channelHigh20: parseNum(extractVal(lines, "Channel_High_20")),
      channelLow20: parseNum(extractVal(lines, "Channel_Low_20")),
      channelPosition: parseNum(extractVal(lines, "Channel_Position")),
      volatilityRatio: parseNum(extractVal(lines, "Volatility_Ratio")),
      envelopesUpper: parseNum(extractVal(lines, "Envelopes_Upper")),
    };

    timeframes.push(data);
  }

  return timeframes;
}

export function getTimeframe(data: TimeframeData[], tf: string): TimeframeData | undefined {
  return data.find(d => d.timeframe.includes(tf));
}
