import { PGlite } from '@electric-sql/pglite';
import { beforeEach } from 'vitest';
import { setDb } from '../src/db/connection.js';
import { initializeSchema } from '../src/db/schema.js';

function createPgliteAdapter(pglite: PGlite) {
  return {
    async query(text: string, params?: any[]) {
      const result = await pglite.query(text, params);
      return {
        rows: result.rows,
        rowCount: result.affectedRows ?? result.rows.length,
      } as any;
    },
  };
}

beforeEach(async () => {
  const pglite = new PGlite();
  const adapter = createPgliteAdapter(pglite);
  setDb(adapter);
  await initializeSchema(adapter);
});
