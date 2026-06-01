import { generateReportStep } from '../pipeline/run-balance-pipeline.js';
import { getConfigPath, getOutDir } from './args.js';

const result = generateReportStep({ outDir: getOutDir(), configPath: getConfigPath() });
console.log(`wrote report to ${result.reportPath}`);
