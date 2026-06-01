import type { QueryClient, QueryResult } from './query-client.js';

export class MockQueryClient<TRecord extends Record<string, unknown> = Record<string, unknown>> implements QueryClient<TRecord> {
  constructor(private readonly fixtures: Record<string, TRecord[]> = {}) {}

  async query(statement: string): Promise<QueryResult<TRecord>> {
    const rows = this.fixtures[statement] ?? [];
    return { rows, rowCount: rows.length, source: 'mock' };
  }
}
