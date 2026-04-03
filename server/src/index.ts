import 'dotenv/config';
import app from './app.js';
import { config } from './config.js';
import { getDb } from './db/connection.js';
import { initializeSchema } from './db/schema.js';

async function start() {
  const db = getDb();
  await initializeSchema(db);

  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
