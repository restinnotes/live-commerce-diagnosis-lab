import { runBacktestStep } from '../pipeline/run-balance-pipeline.js';
import { getConfigPath, getOutDir } from './args.js';

const result = runBacktestStep({ outDir: getOutDir(), configPath: getConfigPath() });
console.log(`wrote ${result.backtests.length} backtest rows to ${result.backtestPath}`);
