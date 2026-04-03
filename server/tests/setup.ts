import { beforeEach } from 'vitest';
import { createTestDb, setDb } from '../src/db/connection.js';
import { initializeSchema } from '../src/db/schema.js';

beforeEach(() => {
  const db = createTestDb();
  initializeSchema(db);
  setDb(db);
});
