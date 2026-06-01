import { generateSyntheticData } from "../../../../packages/balance-engine/src/synthetic-data.js";
import { buildWideTables } from "../../../../packages/balance-engine/src/build-wide-tables.js";
import { buildAllFeatureRows } from "../../../../packages/balance-engine/src/feature-builder.js";
console.log(JSON.stringify({ featureRows: buildAllFeatureRows(buildWideTables(generateSyntheticData())).length }, null, 2));
