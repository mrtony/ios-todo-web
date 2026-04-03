# SQLite → PostgreSQL (Neon) 遷移計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將資料庫從 SQLite (better-sqlite3) 遷移到 PostgreSQL (Neon 免費方案)，使應用可部署到 Render 免費方案（無需持久化磁碟）。

**Architecture:** 使用 `pg` 套件連接 Neon PostgreSQL。所有同步 DB 呼叫改為 async/await。測試使用 `pglite`（PGlite — 嵌入式 PostgreSQL，不需外部資料庫）。

**Tech Stack:** pg, @electric-sql/pglite (測試用), PostgreSQL (Neon)

**重要：** 此遷移僅涉及 server/ 目錄。client/ 不需任何修改。

---

## 遷移摘要

| 項目 | SQLite (before) | PostgreSQL (after) |
|---|---|---|
| 驅動 | better-sqlite3 (sync) | pg Pool (async) |
| 參數佔位 | `?` | `$1, $2, $3` |
| 時間預設值 | `datetime('now')` | `NOW()` |
| 布林型別 | INTEGER (0/1) | INTEGER (0/1)（保持不變，避免前端改動） |
| 交易 | `db.transaction(fn)()` | `pool.query('BEGIN')` ... `pool.query('COMMIT')` |
| 回傳變更數 | `result.changes` | `result.rowCount` |
| UNIQUE 錯誤 | `UNIQUE constraint failed` | `duplicate key value violates unique constraint` |
| 測試 DB | in-memory SQLite | PGlite (嵌入式 PostgreSQL) |
| 連線字串 | `DB_PATH` env var | `DATABASE_URL` env var |

---

## Task 1: 更新依賴

**Files:**
- Modify: `server/package.json`

- [ ] **Step 1: 移除 SQLite 依賴，新增 PostgreSQL 依賴**

Run:
```bash
cd server
npm uninstall better-sqlite3 @types/better-sqlite3
npm install pg
npm install -D @types/pg @electric-sql/pglite
```

- [ ] **Step 2: 驗證 package.json**

確認 `better-sqlite3` 和 `@types/better-sqlite3` 已移除，`pg`、`@types/pg`、`@electric-sql/pglite` 已加入。

- [ ] **Step 3: Commit**

```bash
git add server/package.json server/package-lock.json
git commit -m "chore: replace better-sqlite3 with pg and pglite for PostgreSQL migration"
```

---

## Task 2: 重寫資料庫連線層

**Files:**
- Rewrite: `server/src/db/connection.ts`

- [ ] **Step 1: 重寫 connection.ts**

```ts
import { Pool, type PoolClient, type QueryResult } from 'pg';

let pool: Pool;

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
  return pool;
}

export function getDb(): DbClient {
  return getPool();
}

export function setDb(newDb: DbClient): void {
  (pool as any) = newDb;
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
  }
}

// Helper: execute multiple statements (for schema init)
export async function execMultiple(db: DbClient, sql: string): Promise<void> {
  // Split by semicolons, filter empty, execute sequentially
  const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
  for (const stmt of statements) {
    await db.query(stmt);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/db/connection.ts
git commit -m "refactor: rewrite db connection for PostgreSQL with pg Pool"
```

---

## Task 3: 重寫 Schema

**Files:**
- Rewrite: `server/src/db/schema.ts`

- [ ] **Step 1: 重寫 schema.ts 使用 PostgreSQL 語法**

```ts
import type { DbClient } from './connection.js';

export async function initializeSchema(db: DbClient): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      last_login_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS lists (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#3b82f6',
      icon TEXT NOT NULL DEFAULT 'list',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, name)
    )
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_lists_user_sort ON lists(user_id, sort_order)
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
      parent_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      completed_at TIMESTAMPTZ,
      flagged INTEGER NOT NULL DEFAULT 0,
      due_date TIMESTAMPTZ,
      priority INTEGER NOT NULL DEFAULT 0 CHECK(priority BETWEEN 0 AND 3),
      recurrence TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`CREATE INDEX IF NOT EXISTS idx_tasks_list_sort ON tasks(list_id, sort_order)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_tasks_list_completed_due ON tasks(list_id, completed_at, due_date)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id)`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)`);

  await db.query(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6b7280',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, name)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS task_tags (
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY(task_id, tag_id)
    )
  `);

  await db.query(`CREATE INDEX IF NOT EXISTS idx_task_tags_reverse ON task_tags(tag_id, task_id)`);
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/db/schema.ts
git commit -m "refactor: rewrite schema for PostgreSQL syntax"
```

---

## Task 4: 重寫 auth.service.ts

**Files:**
- Modify: `server/src/services/auth.service.ts`

- [ ] **Step 1: 改為 async + PostgreSQL 參數語法**

所有 DB 呼叫需要：
1. 加 `await`
2. `?` 改為 `$1, $2, $3...`
3. `.get(params)` 改為 `.query(sql, [params])` 然後取 `result.rows[0]`
4. `.run(params)` 改為 `.query(sql, [params])`

完整重寫 `server/src/services/auth.service.ts`：

```ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db/connection.js';
import { AppError } from '../middleware/error-handler.js';
import { config } from '../config.js';
import type { User } from '../types.js';

const { jwtSecret: JWT_SECRET, jwtRefreshSecret: JWT_REFRESH_SECRET, bcryptRounds: BCRYPT_ROUNDS } = config;

function generateTokens(userId: string) {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

export async function register(email: string, password: string, name: string) {
  const db = getDb();
  const normalizedEmail = email.toLowerCase();

  const existing = await db.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (existing.rows[0]) {
    throw new AppError(409, 'CONFLICT', 'Email already registered');
  }

  const id = uuid();
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const now = new Date().toISOString();

  await db.query(
    'INSERT INTO users (id, email, password_hash, name, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
    [id, normalizedEmail, passwordHash, name, now, now],
  );

  const tokens = generateTokens(id);
  return { user: { id, email: normalizedEmail, name }, ...tokens };
}

export async function login(email: string, password: string) {
  const db = getDb();
  const normalizedEmail = email.toLowerCase();

  const result = await db.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
  const user = result.rows[0] as User | undefined;
  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const now = new Date().toISOString();
  await db.query('UPDATE users SET last_login_at = $1, updated_at = $2 WHERE id = $3', [now, now, user.id]);

  const tokens = generateTokens(user.id);
  return { user: { id: user.id, email: user.email, name: user.name }, ...tokens };
}

export async function refresh(refreshToken: string) {
  try {
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string };
    const db = getDb();
    const result = await db.query('SELECT id, email, name FROM users WHERE id = $1', [payload.userId]);
    const user = result.rows[0];

    if (!user) {
      throw new AppError(401, 'INVALID_TOKEN', 'User not found');
    }

    const tokens = generateTokens(user.id);
    return { user, ...tokens };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(401, 'INVALID_TOKEN', 'Invalid or expired refresh token');
  }
}

export async function getMe(userId: string) {
  const db = getDb();
  const result = await db.query('SELECT id, email, name, created_at FROM users WHERE id = $1', [userId]);
  const user = result.rows[0];

  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }

  return user;
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/services/auth.service.ts
git commit -m "refactor: migrate auth.service to async PostgreSQL queries"
```

---

## Task 5: 重寫 list.service.ts

**Files:**
- Modify: `server/src/services/list.service.ts`

- [ ] **Step 1: 改為 async + PostgreSQL 語法**

完整重寫。關鍵改動：
- 所有函數加 `async`
- `db.prepare(sql).all(params)` → `(await db.query(sql, [params])).rows`
- `db.prepare(sql).get(params)` → `(await db.query(sql, [params])).rows[0]`
- `db.prepare(sql).run(params)` → `await db.query(sql, [params])`
- `?` → `$1, $2, ...`
- `result.changes` → `result.rowCount`
- `db.transaction(fn)` → 使用 `await db.query('BEGIN')` / `COMMIT` / `ROLLBACK`
- UNIQUE 錯誤訊息匹配改為 `duplicate key value`
- `err.message?.includes('UNIQUE constraint failed')` → `(err as any).code === '23505'`（PostgreSQL unique violation error code）

```ts
import { v4 as uuid } from 'uuid';
import { getDb } from '../db/connection.js';
import { AppError } from '../middleware/error-handler.js';
import type { List } from '../types.js';

export async function getAll(userId: string): Promise<List[]> {
  const db = getDb();
  const result = await db.query('SELECT * FROM lists WHERE user_id = $1 ORDER BY sort_order ASC', [userId]);
  return result.rows;
}

export async function getById(userId: string, listId: string): Promise<List> {
  const db = getDb();
  const result = await db.query('SELECT * FROM lists WHERE id = $1 AND user_id = $2', [listId, userId]);
  if (!result.rows[0]) {
    throw new AppError(404, 'NOT_FOUND', 'List not found');
  }
  return result.rows[0];
}

export async function create(userId: string, data: { name: string; color?: string; icon?: string }): Promise<List> {
  const db = getDb();
  const id = uuid();
  const now = new Date().toISOString();

  const maxOrder = await db.query('SELECT MAX(sort_order) as max FROM lists WHERE user_id = $1', [userId]);
  const sortOrder = (maxOrder.rows[0]?.max ?? -1) + 1;

  try {
    await db.query(
      'INSERT INTO lists (id, user_id, name, color, icon, sort_order, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, userId, data.name, data.color || '#3b82f6', data.icon || 'list', sortOrder, now, now],
    );
  } catch (err: any) {
    if (err.code === '23505') {
      throw new AppError(409, 'CONFLICT', 'A list with this name already exists');
    }
    throw err;
  }

  return getById(userId, id);
}

export async function update(userId: string, listId: string, data: { name?: string; color?: string; icon?: string }): Promise<List> {
  const db = getDb();
  const existing = await getById(userId, listId);
  const now = new Date().toISOString();

  try {
    await db.query(
      'UPDATE lists SET name = $1, color = $2, icon = $3, updated_at = $4 WHERE id = $5 AND user_id = $6',
      [data.name ?? existing.name, data.color ?? existing.color, data.icon ?? existing.icon, now, listId, userId],
    );
  } catch (err: any) {
    if (err.code === '23505') {
      throw new AppError(409, 'CONFLICT', 'A list with this name already exists');
    }
    throw err;
  }

  return getById(userId, listId);
}

export async function remove(userId: string, listId: string): Promise<void> {
  const db = getDb();
  const result = await db.query('DELETE FROM lists WHERE id = $1 AND user_id = $2', [listId, userId]);
  if (result.rowCount === 0) {
    throw new AppError(404, 'NOT_FOUND', 'List not found');
  }
}

export async function reorder(userId: string, orderedIds: string[]): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();

  await db.query('BEGIN');
  try {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.query(
        'UPDATE lists SET sort_order = $1, updated_at = $2 WHERE id = $3 AND user_id = $4',
        [i, now, orderedIds[i], userId],
      );
    }
    await db.query('COMMIT');
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/services/list.service.ts
git commit -m "refactor: migrate list.service to async PostgreSQL queries"
```

---

## Task 6: 重寫 task.service.ts

**Files:**
- Modify: `server/src/services/task.service.ts`

- [ ] **Step 1: 改為 async + PostgreSQL 語法**

與 list.service.ts 同樣的改動模式。關鍵注意事項：

1. 所有函數加 `async`，回傳 `Promise<T>`
2. `?` → `$1, $2, ...`（每個函數需要重新編號）
3. 動態 IN 子句：`taskIds.map(() => '?').join(',')` → `taskIds.map((_, i) => '$' + (i + 1)).join(',')`
4. spread 參數 `...taskIds` → 直接傳 `taskIds` 陣列
5. `result.changes` → `result.rowCount`
6. `db.transaction()` → `BEGIN` / `COMMIT` / `ROLLBACK`

這是最大的檔案，包含 `verifyListOwnership`、`verifyTaskOwnership`、`getByList`、`getByListWithSubtasks`、`getAllForUser`、`create`、`update`、`remove`、`complete`、`uncomplete`、`reorder`、`getSubtasks`、`createSubtask`、`getNextDueDate`、`parseRecurrence`。

每個函數都需要：
- 加 `async`
- DB 呼叫加 `await`
- 參數語法改為 `$N`
- `.rows[0]` 取代 `.get()` 回傳
- `.rows` 取代 `.all()` 回傳

完整重寫此檔案，保持所有商業邏輯不變，僅改 DB 存取層。

- [ ] **Step 2: Commit**

```bash
git add server/src/services/task.service.ts
git commit -m "refactor: migrate task.service to async PostgreSQL queries"
```

---

## Task 7: 重寫 tag.service.ts

**Files:**
- Modify: `server/src/services/tag.service.ts`

- [ ] **Step 1: 改為 async + PostgreSQL 語法**

同樣的模式。`err.message?.includes('UNIQUE constraint failed')` → `err.code === '23505'`。

所有函數加 `async`，所有 DB 呼叫加 `await`，`?` → `$N`。

- [ ] **Step 2: Commit**

```bash
git add server/src/services/tag.service.ts
git commit -m "refactor: migrate tag.service to async PostgreSQL queries"
```

---

## Task 8: 更新路由（所有 handler 改為 async）

**Files:**
- Modify: `server/src/routes/auth.ts`
- Modify: `server/src/routes/lists.ts`
- Modify: `server/src/routes/tasks.ts`
- Modify: `server/src/routes/tags.ts`

- [ ] **Step 1: 更新所有路由 handler**

Service 函數現在都是 async，所以路由 handler 的 try/catch 中需要 `await`。

例如 `lists.ts`：
```ts
router.get('/', async (req, res, next) => {
  try {
    const lists = await listService.getAll(req.userId!);
    res.json(lists);
  } catch (err) { next(err); }
});
```

**注意：** `auth.ts` 中的 `refresh` 路由也需要改為 async（`refresh` 現在是 async 函數）。`getMe` 也是。

對所有四個路由檔案的所有 handler：
1. 加 `async` 到 handler 函數
2. 在 service 呼叫前加 `await`

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/
git commit -m "refactor: make all route handlers async for PostgreSQL migration"
```

---

## Task 9: 更新 index.ts 和 config.ts

**Files:**
- Modify: `server/src/index.ts`
- Modify: `server/src/config.ts`
- Modify: `.env.example`

- [ ] **Step 1: 更新 config.ts**

```ts
import 'dotenv/config';

export const config = {
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
  bcryptRounds: 12,
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/todo_dev',
};
```

- [ ] **Step 2: 更新 index.ts**

移除 SQLite 相關的 `fs`/`path` 邏輯和 `DB_PATH`，改為：

```ts
import 'dotenv/config';
import app from './app.js';
import { getDb } from './db/connection.js';
import { initializeSchema } from './db/schema.js';
import { config } from './config.js';

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
```

- [ ] **Step 3: 更新 .env.example**

```
JWT_SECRET=change-me-to-a-random-string
JWT_REFRESH_SECRET=change-me-to-another-random-string
PORT=3000
DATABASE_URL=postgresql://localhost:5432/todo_dev
```

- [ ] **Step 4: 更新 .gitignore**

移除 `*.db` 和 `*.sqlite`（不再需要），保留其他。

- [ ] **Step 5: Commit**

```bash
git add server/src/index.ts server/src/config.ts .env.example .gitignore
git commit -m "refactor: update config and startup for PostgreSQL"
```

---

## Task 10: 重寫測試基礎設施

**Files:**
- Rewrite: `server/tests/setup.ts`
- Modify: `server/tests/helpers.ts`
- Modify: `server/vitest.config.ts`

- [ ] **Step 1: 重寫 setup.ts 使用 PGlite**

PGlite 是嵌入式 PostgreSQL，可以在 Node.js 中跑，不需要外部資料庫。

```ts
import { PGlite } from '@electric-sql/pglite';
import { setDb } from '../src/db/connection.js';
import { initializeSchema } from '../src/db/schema.js';
import { beforeEach } from 'vitest';

// PGlite adapter to match our DbClient interface
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
```

- [ ] **Step 2: 更新 helpers.ts**

`createTestUser` 的 DB 呼叫需要改為 async + `$N` 參數：

```ts
import { getDb } from '../src/db/connection.js';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import request from 'supertest';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export async function createTestUser(overrides: Partial<{ email: string; name: string; password: string }> = {}) {
  const db = getDb();
  const id = uuid();
  const email = overrides.email || `test-${id.slice(0, 8)}@example.com`;
  const name = overrides.name || 'Test User';
  const password = overrides.password || 'password123';
  const passwordHash = await bcrypt.hash(password, 4);

  await db.query(
    'INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4)',
    [id, email.toLowerCase(), passwordHash, name],
  );

  return { id, email: email.toLowerCase(), name, password };
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '15m' });
}

export function authRequest(method: 'get' | 'post' | 'patch' | 'delete', url: string, token: string) {
  return (request(app) as any)[method](url).set('Authorization', `Bearer ${token}`);
}
```

- [ ] **Step 3: Commit**

```bash
git add server/tests/setup.ts server/tests/helpers.ts
git commit -m "refactor: rewrite test setup with PGlite for embedded PostgreSQL testing"
```

---

## Task 11: 更新測試檔案

**Files:**
- Modify: `server/tests/db.test.ts`
- Modify: 其他測試檔案（如有需要）

- [ ] **Step 1: 更新 db.test.ts**

SQLite 用 `sqlite_master` 查表名，PostgreSQL 用 `information_schema.tables`：

```ts
import { describe, it, expect } from 'vitest';
import { getDb } from '../src/db/connection.js';

describe('Database Schema', () => {
  it('should create all tables', async () => {
    const db = getDb();
    const result = await db.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name
    `);

    const tableNames = result.rows.map((r: any) => r.table_name);
    expect(tableNames).toContain('users');
    expect(tableNames).toContain('lists');
    expect(tableNames).toContain('tasks');
    expect(tableNames).toContain('tags');
    expect(tableNames).toContain('task_tags');
  });

  it('should enforce foreign keys', async () => {
    const db = getDb();
    await expect(
      db.query("INSERT INTO lists (id, user_id, name) VALUES ('l1', 'nonexistent', 'Test')")
    ).rejects.toThrow();
  });

  it('should enforce priority check constraint', async () => {
    const db = getDb();
    await db.query("INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4)", ['u1', 'a@b.com', 'hash', 'A']);
    await db.query("INSERT INTO lists (id, user_id, name) VALUES ($1, $2, $3)", ['l1', 'u1', 'My List']);

    await expect(
      db.query("INSERT INTO tasks (id, list_id, title, priority) VALUES ($1, $2, $3, $4)", ['t1', 'l1', 'Task', 5])
    ).rejects.toThrow();
  });

  it('should cascade delete lists when user is deleted', async () => {
    const db = getDb();
    await db.query("INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4)", ['u1', 'a@b.com', 'hash', 'A']);
    await db.query("INSERT INTO lists (id, user_id, name) VALUES ($1, $2, $3)", ['l1', 'u1', 'My List']);
    await db.query("DELETE FROM users WHERE id = $1", ['u1']);

    const result = await db.query("SELECT * FROM lists WHERE id = $1", ['l1']);
    expect(result.rows[0]).toBeUndefined();
  });

  it('should cascade delete tasks when list is deleted', async () => {
    const db = getDb();
    await db.query("INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4)", ['u1', 'a@b.com', 'hash', 'A']);
    await db.query("INSERT INTO lists (id, user_id, name) VALUES ($1, $2, $3)", ['l1', 'u1', 'My List']);
    await db.query("INSERT INTO tasks (id, list_id, title) VALUES ($1, $2, $3)", ['t1', 'l1', 'Task 1']);
    await db.query("DELETE FROM lists WHERE id = $1", ['l1']);

    const result = await db.query("SELECT * FROM tasks WHERE id = $1", ['t1']);
    expect(result.rows[0]).toBeUndefined();
  });
});
```

- [ ] **Step 2: 檢查其他測試檔案**

其他測試檔案（auth.test.ts, lists.test.ts, tasks.test.ts, subtasks.test.ts, tags.test.ts, recurrence.test.ts, tasks-all.test.ts）使用 supertest 透過 API 操作，**不直接呼叫 DB**，所以不需要改語法。但注意：

- 如果任何測試直接使用 `getDb()` 呼叫（只有 db.test.ts 和 helpers.ts 這樣做），需要更新
- API 回傳的時間格式可能從 ISO string 變為 PostgreSQL timestamptz 格式，需注意斷言
- PGlite 的行為可能與 SQLite 略有不同（例如 `BOOLEAN` vs `INTEGER`），如測試失敗需調整

- [ ] **Step 3: 執行測試**

Run: `cd server && npx vitest run`

如果有失敗，根據錯誤訊息修正。常見問題：
- PGlite 的 `affectedRows` 屬性名稱可能不同
- 時間格式差異
- 錯誤碼不匹配

- [ ] **Step 4: Commit**

```bash
git add server/tests/
git commit -m "refactor: update tests for PostgreSQL with PGlite"
```

---

## Task 12: 更新 render.yaml

**Files:**
- Modify: `render.yaml`

- [ ] **Step 1: 移除 disk，新增 DATABASE_URL**

```yaml
services:
  - type: web
    name: todo-app
    runtime: node
    plan: free
    buildCommand: npm install && cd server && npm install && npm run build && cd ../client && npm install && npm run build
    startCommand: cd server && node dist/index.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: JWT_SECRET
        generateValue: true
      - key: JWT_REFRESH_SECRET
        generateValue: true
      - key: DATABASE_URL
        sync: false
```

`DATABASE_URL` 設為 `sync: false` 表示需要手動在 Render Dashboard 中填入 Neon 連線字串。

- [ ] **Step 2: Commit**

```bash
git add render.yaml
git commit -m "refactor: update render.yaml for PostgreSQL (remove disk, add DATABASE_URL)"
```

---

## Task 13: 更新設計規格

**Files:**
- Modify: `docs/superpowers/specs/2026-04-03-todo-webapp-design.md`

- [ ] **Step 1: 更新技術棧表格**

將「資料庫」從 `SQLite` 改為 `PostgreSQL (Neon 免費方案)`。
將「部署」從 `Render（免費方案，持久化磁碟）` 改為 `Render（免費方案）+ Neon PostgreSQL`。

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-04-03-todo-webapp-design.md
git commit -m "docs: update spec to reflect PostgreSQL migration"
```

---

## Task 14: 刪除 SQLite 殘留

**Files:**
- Delete: `server/data/` directory (if exists)

- [ ] **Step 1: 清理**

```bash
rm -rf server/data
```

確認 `server/src/types.ts` 不需要修改（型別定義不涉及 DB 驅動）。

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove SQLite artifacts"
```

---

## Task 15: 最終驗證

- [ ] **Step 1: 執行所有後端測試**

Run: `cd server && npx vitest run`
Expected: 全部 PASS

- [ ] **Step 2: TypeScript 編譯檢查**

Run: `cd server && npx tsc --noEmit`
Expected: 無錯誤

- [ ] **Step 3: 前端 build**

Run: `cd client && npm run build`
Expected: 成功

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: PostgreSQL migration verified"
```
