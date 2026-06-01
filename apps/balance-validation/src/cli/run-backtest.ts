import { runBalancePipeline } from "../pipeline/run-balance-pipeline.js";
console.log(JSON.stringify(await runBalancePipeline(), null, 2));
