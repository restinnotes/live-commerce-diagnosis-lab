export function safeDivide(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
  return numerator / denominator;
}

export function percentileRank(value: number, population: number[]): number {
  const finite = population.filter(Number.isFinite).sort((a, b) => a - b);
  if (finite.length === 0 || !Number.isFinite(value)) return 0;
  const belowOrEqual = finite.filter((candidate) => candidate <= value).length;
  return belowOrEqual / finite.length;
}

export function median(values: number[]): number {
  const finite = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (finite.length === 0) return 0;
  const mid = Math.floor(finite.length / 2);
  return finite.length % 2 === 0 ? (finite[mid - 1]! + finite[mid]!) / 2 : finite[mid]!;
}
