import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CsvFileAdapter } from '../packages/adapters/src/csv-file-adapter.js';
import { JsonFileAdapter } from '../packages/adapters/src/json-file-adapter.js';
import { MockQueryClient } from '../packages/adapters/src/mock-query-client.js';


describe('public-safe adapters', () => {
  it('returns deterministic rows from the mock query client', async () => {
    const client = new MockQueryClient({ synthetic: [{ entityId: 'mock_1', gmv: 100 }] });
    await expect(client.query('synthetic')).resolves.toMatchObject({ rowCount: 1, source: 'mock' });
  });

  it('reads synthetic rows from JSON and CSV files without private connectors', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'adapters-'));
    const jsonPath = path.join(dir, 'rows.json');
    const csvPath = path.join(dir, 'rows.csv');
    fs.writeFileSync(jsonPath, JSON.stringify([{ entityId: 'mock_json', gmv: 12 }]));
    fs.writeFileSync(csvPath, 'entityId,gmv\nmock_csv,13\n');
    await expect(new JsonFileAdapter(jsonPath).query('ignored')).resolves.toMatchObject({ rowCount: 1, source: 'json-file' });
    const csv = await new CsvFileAdapter(csvPath).query('ignored');
    expect(csv.rows[0]).toMatchObject({ entityId: 'mock_csv', gmv: 13 });
  });
});
