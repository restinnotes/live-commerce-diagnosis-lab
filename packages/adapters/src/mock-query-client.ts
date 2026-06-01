import type { QueryClient } from "./query-client.js";
export class MockQueryClient implements QueryClient {
  constructor(private readonly tables: Record<string, unknown[]> = {}) {}
  async query<T = Record<string, unknown>>(sql: string): Promise<T[]> {
    const table = Object.keys(this.tables).find((name) => sql.includes(name));
    return (table ? this.tables[table] : []) as T[];
  }
}
