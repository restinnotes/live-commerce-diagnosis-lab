import { generateReportStep, parseCliOptions } from "../pipeline/run-balance-pipeline.js";
console.log(JSON.stringify(await generateReportStep(parseCliOptions()), null, 2));
