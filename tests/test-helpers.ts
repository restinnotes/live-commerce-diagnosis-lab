import { buildCanonicalWideTables } from '../packages/balance-engine/src/canonical-wide-tables.js';
import { buildFeatureRowsAsOf } from '../packages/balance-engine/src/features.js';
import type { MetricRow } from '../packages/balance-engine/src/types.js';

export function featuresFromSyntheticRows(rows: MetricRow[], dt = '2026-01-01') {
  return buildFeatureRowsAsOf(buildCanonicalWideTables(rows), dt);
}
