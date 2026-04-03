import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import app from './app.js';
import { getDb } from './db/connection.js';
import { initializeSchema } from './db/schema.js';

const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/todo.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = getDb();
initializeSchema(db);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
