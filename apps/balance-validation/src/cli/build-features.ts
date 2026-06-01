import { buildFeatures } from '../pipeline/run-balance-pipeline.js';
import { getConfigPath, getOutDir } from './args.js';

const result = buildFeatures({ outDir: getOutDir(), configPath: getConfigPath() });
console.log(`wrote ${result.features.length} feature rows to ${result.featuresPath}`);
