import { percentileRank } from './math.js';

export interface RankInput<T> {
  row: T;
  value: (row: T) => number;
  population: T[];
}

export function rankWithin<T>({ row, value, population }: RankInput<T>): number {
  return percentileRank(value(row), population.map(value));
}
