import fs from 'node:fs/promises';
import type { QueryClient, QueryResult } from './query-client.js';

function parseCell(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed === '') return '';
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) ? numeric : trimmed;
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

export class CsvFileAdapter<TRecord extends Record<string, unknown> = Record<string, unknown>> implements QueryClient<TRecord> {
  constructor(private readonly filePath: string) {}

  async query(_statement = ''): Promise<QueryResult<TRecord>> {
    const lines = (await fs.readFile(this.filePath, 'utf8')).trim().split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return { rows: [], rowCount: 0, source: 'csv-file' };
    const headers = splitCsvLine(lines[0]!);
    const rows = lines.slice(1).map((line) => Object.fromEntries(splitCsvLine(line).map((cell, index) => [headers[index]!, parseCell(cell)])) as TRecord);
    return { rows, rowCount: rows.length, source: 'csv-file' };
  }
}
