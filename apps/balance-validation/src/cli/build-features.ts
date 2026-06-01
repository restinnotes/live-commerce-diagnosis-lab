import { buildFeatures, parseCliOptions } from "../pipeline/run-balance-pipeline.js";
console.log(JSON.stringify(await buildFeatures(parseCliOptions()), null, 2));
