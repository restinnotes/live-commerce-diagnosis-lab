# Public adapters

This package intentionally contains only a generic `QueryClient` contract plus public-safe mock/file adapters.

- `query-client.ts` defines the interface used by public pipeline code.
- `mock-query-client.ts` supports deterministic unit tests and demos.
- `csv-file-adapter.ts` and `json-file-adapter.ts` load local synthetic/mock rows.

Real Hue/Impala connectivity, credentials, private endpoints, and private table names must live in a private adapter outside this repository. Public modules should depend on `QueryClient` instead of importing private connector code directly.
