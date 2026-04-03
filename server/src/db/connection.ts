import { Pool, type QueryResult } from 'pg';

let pool: Pool | DbClient | undefined;

export interface DbClient {
  query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
}

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });
  }

  if (!(pool instanceof Pool)) {
    throw new Error('Database pool is not a pg Pool instance');
  }

  return pool;
}

export function getDb(): DbClient {
  if (!pool) {
    return getPool();
  }

  return pool;
}

export function setDb(newDb: DbClient): void {
  pool = newDb;
}

export async function closeDb(): Promise<void> {
  if (pool instanceof Pool) {
    await pool.end();
  }

  pool = undefined;
}

export async function execMultiple(db: DbClient, sql: string): Promise<void> {
  const statements = sql
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

  for (const statement of statements) {
    await db.query(statement);
  }
}
