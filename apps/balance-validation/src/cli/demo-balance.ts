import { runBalancePipeline } from "../pipeline/run-balance-pipeline.js";
const result = await runBalancePipeline();
console.log(JSON.stringify(result, null, 2));
