import type { BacktestResult } from "../../balance-engine/src/backtest-engine.js";
export function renderBacktestSummary(results: BacktestResult[]) { return { generatedAt: new Date().toISOString(), results }; }
