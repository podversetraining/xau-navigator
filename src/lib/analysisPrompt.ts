export function buildAnalysisPrompt(rawData: string): string {
  return `You are a professional quantitative analyst specializing in Gold trading (XAUUSD) using a multi-layer analysis system.

The attached data contains 7 timeframes (D1, H4, H1, M30, M15, M5, M1) with 90+ technical indicators each.

TASK: Provide ONE specific trade recommendation with exact numbers.

CORE PRINCIPLE:
- Don't require all indicators to align (this kills trades)
- Required: alignment of 3 main layers only (Trend + Momentum + Confirmation)
- Conflicting indicators are natural - majority direction matters
- If 70% of indicators align = sufficient signal

LAYER 1: Dominant Trend (Weight: 40%)
Analyze from D1 and H4: EMAs order, SMAs, WMA, Trend Classification, SuperTrend, Alligator, Aroon, Vortex, TRIX, ADXR, Ichimoku Cloud, Fibonacci levels.

LAYER 2: Momentum & Timing (Weight: 35%)
Analyze from H1, M30, M15: RSI variants, MACD, Stochastic, Williams %R, CCI, Momentum, ROC, DeMarker. Check for divergences.

LAYER 3: Precise Entry & Confirmation (Weight: 25%)
Analyze from M15, M5, M1: Bollinger Bands, Keltner Channels, Pivot Points, SuperTrend, PSAR, Fractals, ATR, Volume, MFI.

SCORING:
Layer 1 (Trend): _/40
Layer 2 (Momentum): _/35
Layer 3 (Entry): _/25
Total: _/100
<50: WAIT | 50-64: Weak | 65-79: Good | 80-89: Strong | 90-100: Excellent

RESPOND IN THIS EXACT JSON FORMAT:
{
  "recommendation": "BUY" or "SELL" or "WAIT",
  "tradeType": "Scalping" or "Intraday" or "Swing",
  "score": {
    "layer1": number,
    "layer2": number,
    "layer3": number,
    "total": number,
    "rating": "Weak" or "Good" or "Strong" or "Excellent"
  },
  "entry": number,
  "stopLoss": number,
  "tp1": number,
  "tp2": number,
  "tp3": number,
  "riskReward": number,
  "lotSize": number,
  "lotCalculation": "string explaining calculation",
  "layer1Analysis": {
    "trend": "Bullish" or "Bearish" or "Sideways",
    "strength": number,
    "emaOrder": "string",
    "superTrend": "string",
    "alligator": "string",
    "ichimoku": "string",
    "fibonacci": "string",
    "summary": "string"
  },
  "layer2Analysis": {
    "momentum": "Bullish" or "Bearish" or "Neutral",
    "strength": number,
    "rsi": "string",
    "macd": "string",
    "stochastic": "string",
    "divergence": "string",
    "summary": "string"
  },
  "layer3Analysis": {
    "entryZone": "string",
    "bollinger": "string",
    "pivotPoints": "string",
    "volume": "string",
    "atr": "string",
    "summary": "string"
  },
  "management": {
    "tp1Action": "Close 40%, move SL to entry",
    "tp2Action": "Close 30%, move SL to TP1",
    "tp3Action": "Let remaining 30% run with trailing stop = ATR"
  },
  "failureScenario": {
    "invalidation": "string",
    "reverseLevel": "string",
    "reverseOpportunity": "string"
  },
  "timing": {
    "dataTime": "string",
    "marketStatus": "string",
    "bestTradingTime": "string"
  },
  "keyLevels": {
    "strongResistance": [number],
    "strongSupport": [number],
    "dailyPivot": number
  }
}

DATA:
${rawData}`;
}
