export function rankDescending<T>(rows: T[], score: (row: T) => number): Array<T & { rank: number }> {
  return [...rows].sort((a, b) => score(b) - score(a)).map((row, i) => ({ ...row, rank: i + 1 }));
}
