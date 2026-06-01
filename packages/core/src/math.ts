export function safeDivide(numerator: number, denominator: number): number | null {
  return denominator === 0 || !Number.isFinite(denominator) ? null : numerator / denominator;
}

export function percentileRank(values: number[], value: number): number {
  const clean = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (clean.length === 0 || !Number.isFinite(value)) return 50;
  const below = clean.filter((v) => v < value).length;
  const equal = clean.filter((v) => v === value).length;
  return ((below + 0.5 * equal) / clean.length) * 100;
}

export function clipOutliersByWinsorization(values: number[], lowerPct: number, upperPct: number): number[] {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return values;
  const at = (pct: number) => sorted[Math.max(0, Math.min(sorted.length - 1, Math.floor((pct / 100) * (sorted.length - 1))))];
  const lo = at(lowerPct);
  const hi = at(upperPct);
  return values.map((v) => (Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : v));
}

export function mean(values: number[]): number {
  const clean = values.filter(Number.isFinite);
  return clean.length ? clean.reduce((a, b) => a + b, 0) / clean.length : 0;
}

export function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}
