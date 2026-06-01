import { runBalancePipeline } from '../pipeline/run-balance-pipeline.js';
import { getConfigPath, getOutDir } from './args.js';

const result = runBalancePipeline({ outDir: getOutDir(), configPath: getConfigPath() });
console.log(`wrote demo report to ${result.reportPath}`);
