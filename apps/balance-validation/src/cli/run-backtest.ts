import { runBacktestStep, parseCliOptions } from "../pipeline/run-balance-pipeline.js";
console.log(JSON.stringify(await runBacktestStep(parseCliOptions()), null, 2));
