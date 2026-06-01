export interface QueryResult<TRecord extends Record<string, unknown> = Record<string, unknown>> {
  rows: TRecord[];
  rowCount: number;
  source: 'mock' | 'csv-file' | 'json-file';
}

export interface QueryClient<TRecord extends Record<string, unknown> = Record<string, unknown>> {
  query(statement: string, parameters?: readonly unknown[]): Promise<QueryResult<TRecord>>;
}
