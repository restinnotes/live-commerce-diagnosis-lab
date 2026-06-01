import { runBalancePipeline, parseCliOptions } from "../pipeline/run-balance-pipeline.js";
console.log(JSON.stringify(await runBalancePipeline(parseCliOptions()), null, 2));
