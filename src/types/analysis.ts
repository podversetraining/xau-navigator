export interface AnalysisResult {
  recommendation: "BUY" | "SELL" | "WAIT";
  tradeType: string;
  score: {
    layer1: number;
    layer2: number;
    layer3: number;
    total: number;
    rating: string;
  };
  entry: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  tp3: number;
  riskReward: number;
  lotSize: number;
  lotCalculation: string;
  layer1Analysis: {
    trend: string;
    strength: number;
    emaOrder: string;
    superTrend: string;
    alligator: string;
    ichimoku: string;
    fibonacci: string;
    summary: string;
  };
  layer2Analysis: {
    momentum: string;
    strength: number;
    rsi: string;
    macd: string;
    stochastic: string;
    divergence: string;
    summary: string;
  };
  layer3Analysis: {
    entryZone: string;
    bollinger: string;
    pivotPoints: string;
    volume: string;
    atr: string;
    summary: string;
  };
  management: {
    tp1Action: string;
    tp2Action: string;
    tp3Action: string;
  };
  failureScenario: {
    invalidation: string;
    reverseLevel: string;
    reverseOpportunity: string;
  };
  timing: {
    dataTime: string;
    marketStatus: string;
    bestTradingTime: string;
  };
  keyLevels: {
    strongResistance: number[];
    strongSupport: number[];
    dailyPivot: number;
  };
}
