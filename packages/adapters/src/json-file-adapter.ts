import fs from 'node:fs/promises';
import type { QueryClient, QueryResult } from './query-client.js';

export class JsonFileAdapter<TRecord extends Record<string, unknown> = Record<string, unknown>> implements QueryClient<TRecord> {
  constructor(private readonly filePath: string) {}

  async query(_statement = ''): Promise<QueryResult<TRecord>> {
    const parsed = JSON.parse(await fs.readFile(this.filePath, 'utf8')) as TRecord[] | { rows: TRecord[] };
    const rows = Array.isArray(parsed) ? parsed : parsed.rows;
    return { rows, rowCount: rows.length, source: 'json-file' };
  }
}
