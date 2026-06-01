export interface QueryClient { query<T = Record<string, unknown>>(sql: string, params?: Record<string, unknown>): Promise<T[]>; }
/** Public repository stub only. Private deployments may implement Hue/Impala behind QueryClient without committing credentials or internal table names. */
export class HueQueryClientStub implements QueryClient { async query<T>(): Promise<T[]> { throw new Error("HueQueryClient is intentionally not implemented in the public repository."); } }
