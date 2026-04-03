# iOS 風格待辦事項 WebApp 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立一個類似 Apple iOS 待辦事項的全端 WebApp，含 JWT 認證、清單/任務/標籤 CRUD、子任務、智慧清單、亮暗主題。

**Architecture:** Monorepo 架構，Express 後端提供 REST API + 靜態檔案服務，SQLite 資料庫。前端使用 Vite + React + shadcn/ui + TanStack Query。開發時 Vite proxy 到 Express；生產環境 Express 同時服務 API 和靜態檔。

**Tech Stack:** Vite, React, TypeScript, shadcn/ui, TanStack Query, axios, Express, better-sqlite3, bcrypt, jsonwebtoken, zod, Vitest, Supertest, Testing Library

---

## File Structure

### Server

```
server/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── index.ts                  # 生產環境入口，啟動 server
│   ├── app.ts                    # Express app 設定（middleware, routes, 靜態檔案）
│   ├── db/
│   │   ├── connection.ts         # SQLite 連線管理（支援 in-memory 測試）
│   │   └── schema.ts             # CREATE TABLE SQL + 初始化函數
│   ├── middleware/
│   │   ├── auth.ts               # JWT 驗證 middleware
│   │   ├── error-handler.ts      # 全域錯誤處理
│   │   └── validate.ts           # zod schema 驗證 middleware
│   ├── routes/
│   │   ├── auth.ts               # POST register/login/refresh, GET me
│   │   ├── lists.ts              # CRUD + reorder
│   │   ├── tasks.ts              # CRUD + complete/uncomplete + reorder + subtasks
│   │   └── tags.ts               # CRUD + task-tag 關聯
│   ├── services/
│   │   ├── auth.service.ts       # 註冊/登入/token 邏輯
│   │   ├── list.service.ts       # 清單 CRUD 邏輯
│   │   ├── task.service.ts       # 任務 CRUD + 子任務 + 完成邏輯
│   │   └── tag.service.ts        # 標籤 CRUD + task-tag 關聯邏輯
│   ├── validators/
│   │   ├── auth.ts               # 註冊/登入 zod schemas
│   │   ├── list.ts               # 清單 zod schemas
│   │   ├── task.ts               # 任務 zod schemas
│   │   └── tag.ts                # 標籤 zod schemas
│   └── types.ts                  # 共用 TypeScript 型別
└── tests/
    ├── setup.ts                  # in-memory SQLite 測試設定
    ├── helpers.ts                # 測試用 helper（建立用戶、取得 token）
    ├── auth.test.ts
    ├── lists.test.ts
    ├── tasks.test.ts
    ├── subtasks.test.ts
    └── tags.test.ts
```

### Client

```
client/
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── index.html
├── components.json               # shadcn/ui 設定
├── src/
│   ├── main.tsx                  # React 入口
│   ├── App.tsx                   # 路由設定
│   ├── lib/
│   │   ├── api.ts                # axios instance + interceptor
│   │   ├── query-client.ts       # TanStack Query client
│   │   └── utils.ts              # cn() utility (shadcn/ui)
│   ├── hooks/
│   │   ├── use-auth.ts           # 認證相關 mutations
│   │   ├── use-lists.ts          # 清單 queries + mutations
│   │   ├── use-tasks.ts          # 任務 queries + mutations
│   │   └── use-tags.ts           # 標籤 queries + mutations
│   ├── context/
│   │   ├── auth-context.tsx      # JWT 狀態 + refresh 邏輯
│   │   └── theme-context.tsx     # 亮/暗主題
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── HomePage.tsx
│   │   ├── ListDetailPage.tsx
│   │   └── SettingsPage.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── MainLayout.tsx
│   │   │   └── Header.tsx
│   │   ├── auth/
│   │   │   └── AuthForm.tsx
│   │   ├── lists/
│   │   │   ├── SmartListGrid.tsx
│   │   │   ├── ListGroup.tsx
│   │   │   ├── ListItem.tsx
│   │   │   └── AddListDialog.tsx
│   │   ├── tasks/
│   │   │   ├── TaskList.tsx
│   │   │   ├── TaskItem.tsx
│   │   │   ├── SubtaskItem.tsx
│   │   │   ├── AddTaskButton.tsx
│   │   │   └── TaskDetailSheet.tsx
│   │   └── settings/
│   │       ├── ProfileSection.tsx
│   │       └── ThemeToggle.tsx
│   └── components/ui/            # shadcn/ui 自動產生
```

### Root

```
package.json                      # workspace scripts: dev, build, start
render.yaml                       # Render 部署設定
.github/workflows/ci.yml          # GitHub Actions CI
.gitignore
.env.example
```

---

## Task 1: Monorepo 專案骨架

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/vitest.config.ts`
- Create: `server/src/index.ts`
- Create: `server/src/app.ts`
- Create: `client/package.json`  (via `npm create vite`)

- [ ] **Step 1: 建立根層 package.json**

```json
{
  "name": "todo-app",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "cd server && npm run dev",
    "dev:client": "cd client && npm run dev",
    "build": "cd client && npm run build",
    "start": "cd server && npm start",
    "test": "cd server && npm test",
    "test:client": "cd client && npm test"
  },
  "devDependencies": {
    "concurrently": "^9.1.2"
  }
}
```

- [ ] **Step 2: 建立 .gitignore**

```
node_modules/
dist/
.env
*.db
*.sqlite
```

- [ ] **Step 3: 建立 .env.example**

```
JWT_SECRET=change-me-to-a-random-string
JWT_REFRESH_SECRET=change-me-to-another-random-string
PORT=3000
DB_PATH=./data/todo.db
```

- [ ] **Step 4: 建立 server/package.json**

```json
{
  "name": "todo-server",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "express": "^5.1.0",
    "better-sqlite3": "^11.8.1",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "uuid": "^11.1.0",
    "zod": "^3.24.3",
    "dotenv": "^16.5.0",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "@types/express": "^5.0.2",
    "@types/better-sqlite3": "^7.6.13",
    "@types/bcrypt": "^5.0.2",
    "@types/jsonwebtoken": "^9.0.9",
    "@types/uuid": "^10.0.0",
    "@types/cors": "^2.8.17",
    "tsx": "^4.19.4",
    "typescript": "^5.8.3",
    "vitest": "^3.1.1",
    "supertest": "^7.1.0",
    "@types/supertest": "^6.0.2"
  }
}
```

- [ ] **Step 5: 建立 server/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 6: 建立 server/vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
});
```

- [ ] **Step 7: 建立 server/src/app.ts（最小版本）**

```ts
import express from 'express';
import path from 'path';

const app = express();

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// 生產環境：提供前端靜態檔案
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

export default app;
```

- [ ] **Step 8: 建立 server/src/index.ts**

```ts
import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

- [ ] **Step 9: 用 Vite 建立 client 專案**

Run:
```bash
cd /path/to/todo-app
npm create vite@latest client -- --template react-ts
cd client && npm install
```

- [ ] **Step 10: 設定 client/vite.config.ts 加入 proxy**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 11: 安裝根層依賴並驗證**

Run:
```bash
cd /path/to/todo-app
npm install
cd server && npm install
cd ../client && npm install
```

- [ ] **Step 12: 驗證 server 啟動**

Run:
```bash
cd server && npx tsx src/index.ts &
curl http://localhost:3000/api/health
kill %1
```

Expected: `{"status":"ok"}`

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: scaffold monorepo with server and client projects"
```

---

## Task 2: 資料庫 Schema 與連線

**Files:**
- Create: `server/src/db/connection.ts`
- Create: `server/src/db/schema.ts`
- Create: `server/src/types.ts`
- Create: `server/tests/setup.ts`
- Create: `server/tests/helpers.ts`
- Create: `server/tests/db.test.ts`

- [ ] **Step 1: 建立共用型別 server/src/types.ts**

```ts
export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface List {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  list_id: string;
  parent_id: string | null;
  title: string;
  notes: string;
  completed_at: string | null;
  flagged: number;
  due_date: string | null;
  priority: number;
  recurrence: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface TaskTag {
  task_id: string;
  tag_id: string;
}
```

- [ ] **Step 2: 建立 server/src/db/connection.ts**

```ts
import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/todo.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function createTestDb(): Database.Database {
  const testDb = new Database(':memory:');
  testDb.pragma('foreign_keys = ON');
  return testDb;
}

export function setDb(newDb: Database.Database): void {
  db = newDb;
}

export function closeDb(): void {
  if (db) {
    db.close();
  }
}
```

- [ ] **Step 3: 建立 server/src/db/schema.ts**

```ts
import type Database from 'better-sqlite3';

export function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      last_login_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS lists (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#3b82f6',
      icon TEXT NOT NULL DEFAULT 'list',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, name)
    );

    CREATE INDEX IF NOT EXISTS idx_lists_user_sort
      ON lists(user_id, sort_order);

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
      parent_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      completed_at TEXT,
      flagged INTEGER NOT NULL DEFAULT 0,
      due_date TEXT,
      priority INTEGER NOT NULL DEFAULT 0 CHECK(priority BETWEEN 0 AND 3),
      recurrence TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_list_sort
      ON tasks(list_id, sort_order);
    CREATE INDEX IF NOT EXISTS idx_tasks_list_completed_due
      ON tasks(list_id, completed_at, due_date);
    CREATE INDEX IF NOT EXISTS idx_tasks_parent
      ON tasks(parent_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_due_date
      ON tasks(due_date);

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6b7280',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, name)
    );

    CREATE TABLE IF NOT EXISTS task_tags (
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY(task_id, tag_id)
    );

    CREATE INDEX IF NOT EXISTS idx_task_tags_reverse
      ON task_tags(tag_id, task_id);
  `);
}
```

- [ ] **Step 4: 建立 server/tests/setup.ts**

```ts
import { createTestDb, setDb } from '../src/db/connection.js';
import { initializeSchema } from '../src/db/schema.js';
import { beforeEach } from 'vitest';

beforeEach(() => {
  const db = createTestDb();
  initializeSchema(db);
  setDb(db);
});
```

- [ ] **Step 5: 建立 server/tests/helpers.ts**

```ts
import { getDb } from '../src/db/connection.js';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import request from 'supertest';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

export async function createTestUser(overrides: Partial<{ email: string; name: string; password: string }> = {}) {
  const db = getDb();
  const id = uuid();
  const email = overrides.email || `test-${id.slice(0, 8)}@example.com`;
  const name = overrides.name || 'Test User';
  const password = overrides.password || 'password123';
  const passwordHash = await bcrypt.hash(password, 4); // low cost for speed in tests

  db.prepare(`
    INSERT INTO users (id, email, password_hash, name)
    VALUES (?, ?, ?, ?)
  `).run(id, email.toLowerCase(), passwordHash, name);

  return { id, email: email.toLowerCase(), name, password };
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '15m' });
}

export function authRequest(method: 'get' | 'post' | 'patch' | 'delete', url: string, token: string) {
  return (request(app) as any)[method](url).set('Authorization', `Bearer ${token}`);
}
```

- [ ] **Step 6: 寫資料庫測試 server/tests/db.test.ts**

```ts
import { describe, it, expect } from 'vitest';
import { getDb } from '../src/db/connection.js';

describe('Database Schema', () => {
  it('should create all tables', () => {
    const db = getDb();
    const tables = db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
    `).all() as { name: string }[];

    const tableNames = tables.map(t => t.name);
    expect(tableNames).toContain('users');
    expect(tableNames).toContain('lists');
    expect(tableNames).toContain('tasks');
    expect(tableNames).toContain('tags');
    expect(tableNames).toContain('task_tags');
  });

  it('should enforce foreign keys', () => {
    const db = getDb();
    expect(() => {
      db.prepare(`
        INSERT INTO lists (id, user_id, name) VALUES ('l1', 'nonexistent', 'Test')
      `).run();
    }).toThrow();
  });

  it('should enforce priority check constraint', () => {
    const db = getDb();
    const userId = 'u1';
    const listId = 'l1';
    db.prepare(`INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)`).run(userId, 'a@b.com', 'hash', 'A');
    db.prepare(`INSERT INTO lists (id, user_id, name) VALUES (?, ?, ?)`).run(listId, userId, 'My List');

    expect(() => {
      db.prepare(`
        INSERT INTO tasks (id, list_id, title, priority) VALUES ('t1', ?, 'Task', 5)
      `).run(listId);
    }).toThrow();
  });

  it('should cascade delete lists when user is deleted', () => {
    const db = getDb();
    db.prepare(`INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)`).run('u1', 'a@b.com', 'hash', 'A');
    db.prepare(`INSERT INTO lists (id, user_id, name) VALUES (?, ?, ?)`).run('l1', 'u1', 'My List');
    db.prepare(`DELETE FROM users WHERE id = ?`).run('u1');

    const list = db.prepare(`SELECT * FROM lists WHERE id = ?`).get('l1');
    expect(list).toBeUndefined();
  });

  it('should cascade delete tasks when list is deleted', () => {
    const db = getDb();
    db.prepare(`INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)`).run('u1', 'a@b.com', 'hash', 'A');
    db.prepare(`INSERT INTO lists (id, user_id, name) VALUES (?, ?, ?)`).run('l1', 'u1', 'My List');
    db.prepare(`INSERT INTO tasks (id, list_id, title) VALUES (?, ?, ?)`).run('t1', 'l1', 'Task 1');
    db.prepare(`DELETE FROM lists WHERE id = ?`).run('l1');

    const task = db.prepare(`SELECT * FROM tasks WHERE id = ?`).get('t1');
    expect(task).toBeUndefined();
  });
});
```

- [ ] **Step 7: 執行測試**

Run: `cd server && npx vitest run tests/db.test.ts`
Expected: 全部 PASS

- [ ] **Step 8: Commit**

```bash
git add server/src/db/ server/src/types.ts server/tests/
git commit -m "feat: add database schema, connection, and types with tests"
```

---

## Task 3: 錯誤處理與驗證 Middleware

**Files:**
- Create: `server/src/middleware/error-handler.ts`
- Create: `server/src/middleware/validate.ts`

- [ ] **Step 1: 建立 server/src/middleware/error-handler.ts**

```ts
import type { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
    return;
  }

  console.error('Unexpected error:', err);
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  });
}
```

- [ ] **Step 2: 建立 server/src/middleware/validate.ts**

```ts
import type { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const message = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        next({ statusCode: 400, code: 'VALIDATION_ERROR', message, name: 'AppError' });
        return;
      }
      next(err);
    }
  };
}
```

修正 `validate` 中的錯誤拋出，改用 `AppError`：

```ts
import type { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from './error-handler.js';

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const message = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        next(new AppError(400, 'VALIDATION_ERROR', message));
        return;
      }
      next(err);
    }
  };
}
```

- [ ] **Step 3: 在 app.ts 中掛載 errorHandler**

更新 `server/src/app.ts`，在所有 routes 之後加上：

```ts
import express from 'express';
import path from 'path';
import { errorHandler } from './middleware/error-handler.js';

const app = express();

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// 生產環境：提供前端靜態檔案
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(errorHandler);

export default app;
```

- [ ] **Step 4: Commit**

```bash
git add server/src/middleware/ server/src/app.ts
git commit -m "feat: add error handler and validation middleware"
```

---

## Task 4: 認證 — Validators 與 Service

**Files:**
- Create: `server/src/validators/auth.ts`
- Create: `server/src/services/auth.service.ts`

- [ ] **Step 1: 建立 server/src/validators/auth.ts**

```ts
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required').max(100),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});
```

- [ ] **Step 2: 建立 server/src/services/auth.service.ts**

```ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db/connection.js';
import { AppError } from '../middleware/error-handler.js';
import type { User } from '../types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
const BCRYPT_ROUNDS = 12;

function generateTokens(userId: string) {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

export async function register(email: string, password: string, name: string) {
  const db = getDb();
  const normalizedEmail = email.toLowerCase();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) {
    throw new AppError(409, 'CONFLICT', 'Email already registered');
  }

  const id = uuid();
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, normalizedEmail, passwordHash, name, now, now);

  const tokens = generateTokens(id);
  return { user: { id, email: normalizedEmail, name }, ...tokens };
}

export async function login(email: string, password: string) {
  const db = getDb();
  const normalizedEmail = email.toLowerCase();

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail) as User | undefined;
  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?').run(now, now, user.id);

  const tokens = generateTokens(user.id);
  return { user: { id: user.id, email: user.email, name: user.name }, ...tokens };
}

export function refresh(refreshToken: string) {
  try {
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string };
    const db = getDb();
    const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(payload.userId) as Pick<User, 'id' | 'email' | 'name'> | undefined;

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

export function getMe(userId: string) {
  const db = getDb();
  const user = db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?').get(userId) as Pick<User, 'id' | 'email' | 'name' | 'created_at'> | undefined;

  if (!user) {
    throw new AppError(404, 'NOT_FOUND', 'User not found');
  }

  return user;
}
```

- [ ] **Step 3: Commit**

```bash
git add server/src/validators/auth.ts server/src/services/auth.service.ts
git commit -m "feat: add auth validators and service (register, login, refresh, me)"
```

---

## Task 5: 認證 — Middleware 與路由

**Files:**
- Create: `server/src/middleware/auth.ts`
- Create: `server/src/routes/auth.ts`
- Modify: `server/src/app.ts` — 掛載 auth routes
- Create: `server/tests/auth.test.ts`

- [ ] **Step 1: 建立 server/src/middleware/auth.ts**

```ts
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './error-handler.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next(new AppError(401, 'UNAUTHORIZED', 'Missing or invalid authorization header'));
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    next(new AppError(401, 'UNAUTHORIZED', 'Invalid or expired token'));
  }
}
```

- [ ] **Step 2: 建立 server/src/routes/auth.ts**

```ts
import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { registerSchema, loginSchema, refreshSchema } from '../validators/auth.js';
import * as authService from '../services/auth.service.js';

const router = Router();

router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const result = await authService.register(req.body.email, req.body.password, req.body.name);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const result = await authService.login(req.body.email, req.body.password);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', validate(refreshSchema), (req, res, next) => {
  try {
    const result = authService.refresh(req.body.refreshToken);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, (req, res, next) => {
  try {
    const user = authService.getMe(req.userId!);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
```

- [ ] **Step 3: 更新 server/src/app.ts 掛載 auth 路由**

```ts
import express from 'express';
import path from 'path';
import { errorHandler } from './middleware/error-handler.js';
import authRoutes from './routes/auth.js';

const app = express();

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);

// 生產環境：提供前端靜態檔案
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(errorHandler);

export default app;
```

- [ ] **Step 4: 寫認證測試 server/tests/auth.test.ts**

```ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { createTestUser } from './helpers.js';

describe('POST /api/auth/register', () => {
  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'new@example.com', password: 'password123', name: 'New User' });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('new@example.com');
    expect(res.body.user.name).toBe('New User');
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.password_hash).toBeUndefined();
  });

  it('should normalize email to lowercase', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'Test@Example.COM', password: 'password123', name: 'Test' });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('test@example.com');
  });

  it('should reject duplicate email', async () => {
    await createTestUser({ email: 'dup@example.com' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'dup@example.com', password: 'password123', name: 'Dup' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('should reject invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'password123', name: 'Bad' });

    expect(res.status).toBe(400);
  });

  it('should reject short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'a@b.com', password: '123', name: 'Short' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('should login with valid credentials', async () => {
    const user = await createTestUser({ email: 'login@example.com', password: 'mypassword' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@example.com', password: 'mypassword' });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('login@example.com');
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it('should login with case-insensitive email', async () => {
    await createTestUser({ email: 'case@example.com', password: 'mypassword' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'CASE@Example.com', password: 'mypassword' });

    expect(res.status).toBe(200);
  });

  it('should reject wrong password', async () => {
    await createTestUser({ email: 'wrong@example.com', password: 'correct' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'wrong@example.com', password: 'incorrect' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('should reject non-existent user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@example.com', password: 'whatever' });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/refresh', () => {
  it('should return new tokens with valid refresh token', async () => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'refresh@example.com', password: 'password123', name: 'R' });

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: registerRes.body.refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
  });

  it('should reject invalid refresh token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'invalid-token' });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('should return current user with valid token', async () => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'me@example.com', password: 'password123', name: 'Me' });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${registerRes.body.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('me@example.com');
    expect(res.body.name).toBe('Me');
  });

  it('should reject request without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('should reject request with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
  });
});
```

- [ ] **Step 5: 執行測試**

Run: `cd server && npx vitest run tests/auth.test.ts`
Expected: 全部 PASS

- [ ] **Step 6: Commit**

```bash
git add server/src/middleware/auth.ts server/src/routes/auth.ts server/src/app.ts server/tests/auth.test.ts
git commit -m "feat: add auth routes with JWT (register, login, refresh, me)"
```

---

## Task 6: 清單 CRUD API

**Files:**
- Create: `server/src/validators/list.ts`
- Create: `server/src/services/list.service.ts`
- Create: `server/src/routes/lists.ts`
- Modify: `server/src/app.ts` — 掛載 lists routes
- Create: `server/tests/lists.test.ts`

- [ ] **Step 1: 建立 server/src/validators/list.ts**

```ts
import { z } from 'zod';

const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

const VALID_ICONS = ['list', 'cart', 'home', 'briefcase', 'heart', 'star', 'flag', 'bookmark'] as const;

export const createListSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  color: z.string().regex(hexColorRegex, 'Invalid hex color').optional(),
  icon: z.enum(VALID_ICONS).optional(),
});

export const updateListSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(hexColorRegex, 'Invalid hex color').optional(),
  icon: z.enum(VALID_ICONS).optional(),
});

export const reorderListsSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});
```

- [ ] **Step 2: 建立 server/src/services/list.service.ts**

```ts
import { v4 as uuid } from 'uuid';
import { getDb } from '../db/connection.js';
import { AppError } from '../middleware/error-handler.js';
import type { List } from '../types.js';

export function getAll(userId: string): List[] {
  const db = getDb();
  return db.prepare('SELECT * FROM lists WHERE user_id = ? ORDER BY sort_order ASC').all(userId) as List[];
}

export function getById(userId: string, listId: string): List {
  const db = getDb();
  const list = db.prepare('SELECT * FROM lists WHERE id = ? AND user_id = ?').get(listId, userId) as List | undefined;
  if (!list) {
    throw new AppError(404, 'NOT_FOUND', 'List not found');
  }
  return list;
}

export function create(userId: string, data: { name: string; color?: string; icon?: string }): List {
  const db = getDb();
  const id = uuid();
  const now = new Date().toISOString();

  const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM lists WHERE user_id = ?').get(userId) as { max: number | null };
  const sortOrder = (maxOrder.max ?? -1) + 1;

  try {
    db.prepare(`
      INSERT INTO lists (id, user_id, name, color, icon, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, data.name, data.color || '#3b82f6', data.icon || 'list', sortOrder, now, now);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      throw new AppError(409, 'CONFLICT', 'A list with this name already exists');
    }
    throw err;
  }

  return getById(userId, id);
}

export function update(userId: string, listId: string, data: { name?: string; color?: string; icon?: string }): List {
  const db = getDb();
  const existing = getById(userId, listId);
  const now = new Date().toISOString();

  try {
    db.prepare(`
      UPDATE lists SET name = ?, color = ?, icon = ?, updated_at = ? WHERE id = ? AND user_id = ?
    `).run(
      data.name ?? existing.name,
      data.color ?? existing.color,
      data.icon ?? existing.icon,
      now,
      listId,
      userId,
    );
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      throw new AppError(409, 'CONFLICT', 'A list with this name already exists');
    }
    throw err;
  }

  return getById(userId, listId);
}

export function remove(userId: string, listId: string): void {
  const db = getDb();
  const result = db.prepare('DELETE FROM lists WHERE id = ? AND user_id = ?').run(listId, userId);
  if (result.changes === 0) {
    throw new AppError(404, 'NOT_FOUND', 'List not found');
  }
}

export function reorder(userId: string, orderedIds: string[]): void {
  const db = getDb();
  const updateStmt = db.prepare('UPDATE lists SET sort_order = ?, updated_at = ? WHERE id = ? AND user_id = ?');
  const now = new Date().toISOString();

  const transaction = db.transaction(() => {
    orderedIds.forEach((id, index) => {
      updateStmt.run(index, now, id, userId);
    });
  });

  transaction();
}
```

- [ ] **Step 3: 建立 server/src/routes/lists.ts**

```ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createListSchema, updateListSchema, reorderListsSchema } from '../validators/list.js';
import * as listService from '../services/list.service.js';

const router = Router();

router.use(requireAuth);

router.get('/', (req, res, next) => {
  try {
    const lists = listService.getAll(req.userId!);
    res.json(lists);
  } catch (err) { next(err); }
});

router.post('/', validate(createListSchema), (req, res, next) => {
  try {
    const list = listService.create(req.userId!, req.body);
    res.status(201).json(list);
  } catch (err) { next(err); }
});

router.patch('/reorder', validate(reorderListsSchema), (req, res, next) => {
  try {
    listService.reorder(req.userId!, req.body.orderedIds);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.patch('/:id', validate(updateListSchema), (req, res, next) => {
  try {
    const list = listService.update(req.userId!, req.params.id, req.body);
    res.json(list);
  } catch (err) { next(err); }
});

router.delete('/:id', (req, res, next) => {
  try {
    listService.remove(req.userId!, req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
```

- [ ] **Step 4: 更新 app.ts 掛載 lists 路由**

在 `server/src/app.ts` 中 `app.use('/api/auth', authRoutes);` 之後加入：

```ts
import listsRoutes from './routes/lists.js';
// ...
app.use('/api/lists', listsRoutes);
```

- [ ] **Step 5: 寫清單測試 server/tests/lists.test.ts**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { createTestUser, generateToken, authRequest } from './helpers.js';

let token: string;
let userId: string;

beforeEach(async () => {
  const user = await createTestUser();
  userId = user.id;
  token = generateToken(user.id);
});

describe('POST /api/lists', () => {
  it('should create a list', async () => {
    const res = await authRequest('post', '/api/lists', token)
      .send({ name: 'Work' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Work');
    expect(res.body.user_id).toBe(userId);
    expect(res.body.color).toBe('#3b82f6');
    expect(res.body.sort_order).toBe(0);
  });

  it('should auto-increment sort_order', async () => {
    await authRequest('post', '/api/lists', token).send({ name: 'First' });
    const res = await authRequest('post', '/api/lists', token).send({ name: 'Second' });

    expect(res.body.sort_order).toBe(1);
  });

  it('should reject duplicate name for same user', async () => {
    await authRequest('post', '/api/lists', token).send({ name: 'Dup' });
    const res = await authRequest('post', '/api/lists', token).send({ name: 'Dup' });

    expect(res.status).toBe(409);
  });

  it('should reject without auth', async () => {
    const res = await request(app).post('/api/lists').send({ name: 'No Auth' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/lists', () => {
  it('should return all lists for user ordered by sort_order', async () => {
    await authRequest('post', '/api/lists', token).send({ name: 'B' });
    await authRequest('post', '/api/lists', token).send({ name: 'A' });

    const res = await authRequest('get', '/api/lists', token);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].name).toBe('B');
    expect(res.body[1].name).toBe('A');
  });

  it('should not return other users lists', async () => {
    const other = await createTestUser({ email: 'other@example.com' });
    const otherToken = generateToken(other.id);
    await authRequest('post', '/api/lists', otherToken).send({ name: 'Other List' });

    const res = await authRequest('get', '/api/lists', token);
    expect(res.body).toHaveLength(0);
  });
});

describe('PATCH /api/lists/:id', () => {
  it('should update a list', async () => {
    const created = await authRequest('post', '/api/lists', token).send({ name: 'Old' });
    const res = await authRequest('patch', `/api/lists/${created.body.id}`, token)
      .send({ name: 'New', color: '#ff0000' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New');
    expect(res.body.color).toBe('#ff0000');
  });

  it('should reject updating other users list', async () => {
    const other = await createTestUser({ email: 'other2@example.com' });
    const otherToken = generateToken(other.id);
    const created = await authRequest('post', '/api/lists', otherToken).send({ name: 'Theirs' });

    const res = await authRequest('patch', `/api/lists/${created.body.id}`, token)
      .send({ name: 'Mine Now' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/lists/:id', () => {
  it('should delete a list', async () => {
    const created = await authRequest('post', '/api/lists', token).send({ name: 'Delete Me' });
    const res = await authRequest('delete', `/api/lists/${created.body.id}`, token);

    expect(res.status).toBe(204);

    const getRes = await authRequest('get', '/api/lists', token);
    expect(getRes.body).toHaveLength(0);
  });

  it('should return 404 for non-existent list', async () => {
    const res = await authRequest('delete', '/api/lists/non-existent-id', token);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/lists/reorder', () => {
  it('should reorder lists', async () => {
    const a = await authRequest('post', '/api/lists', token).send({ name: 'A' });
    const b = await authRequest('post', '/api/lists', token).send({ name: 'B' });

    await authRequest('patch', '/api/lists/reorder', token)
      .send({ orderedIds: [b.body.id, a.body.id] });

    const res = await authRequest('get', '/api/lists', token);
    expect(res.body[0].name).toBe('B');
    expect(res.body[1].name).toBe('A');
  });
});
```

- [ ] **Step 6: 執行測試**

Run: `cd server && npx vitest run tests/lists.test.ts`
Expected: 全部 PASS

- [ ] **Step 7: Commit**

```bash
git add server/src/validators/list.ts server/src/services/list.service.ts server/src/routes/lists.ts server/src/app.ts server/tests/lists.test.ts
git commit -m "feat: add lists CRUD API with reorder"
```

---

## Task 7: 任務 CRUD API

**Files:**
- Create: `server/src/validators/task.ts`
- Create: `server/src/services/task.service.ts`
- Create: `server/src/routes/tasks.ts`
- Modify: `server/src/app.ts`
- Create: `server/tests/tasks.test.ts`

- [ ] **Step 1: 建立 server/src/validators/task.ts**

```ts
import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  notes: z.string().max(5000).optional(),
  due_date: z.string().datetime().nullable().optional(),
  priority: z.number().int().min(0).max(3).optional(),
  flagged: z.boolean().optional(),
  recurrence: z.string().max(500).nullable().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  notes: z.string().max(5000).optional(),
  due_date: z.string().datetime().nullable().optional(),
  priority: z.number().int().min(0).max(3).optional(),
  flagged: z.boolean().optional(),
  recurrence: z.string().max(500).nullable().optional(),
  list_id: z.string().optional(),
});

export const reorderTasksSchema = z.object({
  orderedIds: z.array(z.string()).min(1),
});
```

- [ ] **Step 2: 建立 server/src/services/task.service.ts**

```ts
import { v4 as uuid } from 'uuid';
import { getDb } from '../db/connection.js';
import { AppError } from '../middleware/error-handler.js';
import type { Task } from '../types.js';

function verifyListOwnership(userId: string, listId: string): void {
  const db = getDb();
  const list = db.prepare('SELECT id FROM lists WHERE id = ? AND user_id = ?').get(listId, userId);
  if (!list) {
    throw new AppError(404, 'NOT_FOUND', 'List not found');
  }
}

function verifyTaskOwnership(userId: string, taskId: string): Task {
  const db = getDb();
  const task = db.prepare(`
    SELECT t.* FROM tasks t
    JOIN lists l ON t.list_id = l.id
    WHERE t.id = ? AND l.user_id = ?
  `).get(taskId, userId) as Task | undefined;

  if (!task) {
    throw new AppError(404, 'NOT_FOUND', 'Task not found');
  }
  return task;
}

export function getByList(userId: string, listId: string): Task[] {
  verifyListOwnership(userId, listId);
  const db = getDb();
  return db.prepare(`
    SELECT * FROM tasks WHERE list_id = ? AND parent_id IS NULL ORDER BY sort_order ASC
  `).all(listId) as Task[];
}

export function create(userId: string, listId: string, data: {
  title: string; notes?: string; due_date?: string | null;
  priority?: number; flagged?: boolean; recurrence?: string | null;
}): Task {
  verifyListOwnership(userId, listId);
  const db = getDb();
  const id = uuid();
  const now = new Date().toISOString();

  const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM tasks WHERE list_id = ? AND parent_id IS NULL').get(listId) as { max: number | null };
  const sortOrder = (maxOrder.max ?? -1) + 1;

  db.prepare(`
    INSERT INTO tasks (id, list_id, title, notes, due_date, priority, flagged, recurrence, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, listId, data.title, data.notes || '', data.due_date || null,
    data.priority ?? 0, data.flagged ? 1 : 0, data.recurrence || null,
    sortOrder, now, now,
  );

  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task;
}

export function update(userId: string, taskId: string, data: {
  title?: string; notes?: string; due_date?: string | null;
  priority?: number; flagged?: boolean; recurrence?: string | null; list_id?: string;
}): Task {
  const existing = verifyTaskOwnership(userId, taskId);

  if (data.list_id && data.list_id !== existing.list_id) {
    verifyListOwnership(userId, data.list_id);
    if (existing.parent_id) {
      throw new AppError(400, 'INVALID_OPERATION', 'Cannot move a subtask to a different list');
    }
  }

  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE tasks SET
      title = ?, notes = ?, due_date = ?, priority = ?, flagged = ?,
      recurrence = ?, list_id = ?, updated_at = ?
    WHERE id = ?
  `).run(
    data.title ?? existing.title,
    data.notes ?? existing.notes,
    data.due_date !== undefined ? data.due_date : existing.due_date,
    data.priority ?? existing.priority,
    data.flagged !== undefined ? (data.flagged ? 1 : 0) : existing.flagged,
    data.recurrence !== undefined ? data.recurrence : existing.recurrence,
    data.list_id ?? existing.list_id,
    now,
    taskId,
  );

  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as Task;
}

export function remove(userId: string, taskId: string): void {
  verifyTaskOwnership(userId, taskId);
  const db = getDb();
  db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
}

export function complete(userId: string, taskId: string): Task {
  verifyTaskOwnership(userId, taskId);
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare('UPDATE tasks SET completed_at = ?, updated_at = ? WHERE id = ?').run(now, now, taskId);
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as Task;
}

export function uncomplete(userId: string, taskId: string): Task {
  verifyTaskOwnership(userId, taskId);
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare('UPDATE tasks SET completed_at = NULL, updated_at = ? WHERE id = ?').run(now, taskId);
  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as Task;
}

export function reorder(userId: string, listId: string, orderedIds: string[]): void {
  verifyListOwnership(userId, listId);
  const db = getDb();
  const now = new Date().toISOString();
  const stmt = db.prepare('UPDATE tasks SET sort_order = ?, updated_at = ? WHERE id = ? AND list_id = ?');

  const transaction = db.transaction(() => {
    orderedIds.forEach((id, index) => {
      stmt.run(index, now, id, listId);
    });
  });
  transaction();
}

// --- Subtasks ---

export function getSubtasks(userId: string, parentId: string): Task[] {
  verifyTaskOwnership(userId, parentId);
  const db = getDb();
  return db.prepare('SELECT * FROM tasks WHERE parent_id = ? ORDER BY sort_order ASC').all(parentId) as Task[];
}

export function createSubtask(userId: string, parentId: string, data: {
  title: string; notes?: string; due_date?: string | null;
  priority?: number; flagged?: boolean;
}): Task {
  const parent = verifyTaskOwnership(userId, parentId);

  if (parent.parent_id) {
    throw new AppError(400, 'INVALID_OPERATION', 'Cannot create subtask of a subtask (only one level allowed)');
  }

  const db = getDb();
  const id = uuid();
  const now = new Date().toISOString();

  const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM tasks WHERE parent_id = ?').get(parentId) as { max: number | null };
  const sortOrder = (maxOrder.max ?? -1) + 1;

  db.prepare(`
    INSERT INTO tasks (id, list_id, parent_id, title, notes, due_date, priority, flagged, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, parent.list_id, parentId, data.title, data.notes || '', data.due_date || null,
    data.priority ?? 0, data.flagged ? 1 : 0, sortOrder, now, now,
  );

  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task;
}
```

- [ ] **Step 3: 建立 server/src/routes/tasks.ts**

```ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createTaskSchema, updateTaskSchema, reorderTasksSchema } from '../validators/task.js';
import * as taskService from '../services/task.service.js';

const router = Router();

router.use(requireAuth);

// Tasks under a list
router.get('/lists/:listId/tasks', (req, res, next) => {
  try {
    const tasks = taskService.getByList(req.userId!, req.params.listId);
    res.json(tasks);
  } catch (err) { next(err); }
});

router.post('/lists/:listId/tasks', validate(createTaskSchema), (req, res, next) => {
  try {
    const task = taskService.create(req.userId!, req.params.listId, req.body);
    res.status(201).json(task);
  } catch (err) { next(err); }
});

router.patch('/lists/:listId/tasks/reorder', validate(reorderTasksSchema), (req, res, next) => {
  try {
    taskService.reorder(req.userId!, req.params.listId, req.body.orderedIds);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// Single task operations
router.patch('/tasks/:id', validate(updateTaskSchema), (req, res, next) => {
  try {
    const task = taskService.update(req.userId!, req.params.id, req.body);
    res.json(task);
  } catch (err) { next(err); }
});

router.delete('/tasks/:id', (req, res, next) => {
  try {
    taskService.remove(req.userId!, req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
});

router.patch('/tasks/:id/complete', (req, res, next) => {
  try {
    const task = taskService.complete(req.userId!, req.params.id);
    res.json(task);
  } catch (err) { next(err); }
});

router.patch('/tasks/:id/uncomplete', (req, res, next) => {
  try {
    const task = taskService.uncomplete(req.userId!, req.params.id);
    res.json(task);
  } catch (err) { next(err); }
});

// Subtasks
router.get('/tasks/:parentId/subtasks', (req, res, next) => {
  try {
    const subtasks = taskService.getSubtasks(req.userId!, req.params.parentId);
    res.json(subtasks);
  } catch (err) { next(err); }
});

router.post('/tasks/:parentId/subtasks', validate(createTaskSchema), (req, res, next) => {
  try {
    const subtask = taskService.createSubtask(req.userId!, req.params.parentId, req.body);
    res.status(201).json(subtask);
  } catch (err) { next(err); }
});

export default router;
```

- [ ] **Step 4: 更新 app.ts 掛載 tasks 路由**

注意：tasks 路由有兩種前綴（`/api/lists/:listId/tasks` 和 `/api/tasks/:id`），所以直接掛在 `/api` 下：

```ts
import tasksRoutes from './routes/tasks.js';
// ...
app.use('/api', tasksRoutes);
```

- [ ] **Step 5: 寫任務測試 server/tests/tasks.test.ts**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/app.js';
import { createTestUser, generateToken, authRequest } from './helpers.js';

let token: string;
let listId: string;

beforeEach(async () => {
  const user = await createTestUser();
  token = generateToken(user.id);
  const listRes = await authRequest('post', '/api/lists', token).send({ name: 'Test List' });
  listId = listRes.body.id;
});

describe('POST /api/lists/:listId/tasks', () => {
  it('should create a task', async () => {
    const res = await authRequest('post', `/api/lists/${listId}/tasks`, token)
      .send({ title: 'Buy groceries' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Buy groceries');
    expect(res.body.list_id).toBe(listId);
    expect(res.body.completed_at).toBeNull();
    expect(res.body.priority).toBe(0);
  });

  it('should create task with all fields', async () => {
    const res = await authRequest('post', `/api/lists/${listId}/tasks`, token)
      .send({
        title: 'Important task',
        notes: 'Some notes',
        due_date: '2026-04-10T09:00:00.000Z',
        priority: 3,
        flagged: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.priority).toBe(3);
    expect(res.body.flagged).toBe(1);
    expect(res.body.due_date).toBe('2026-04-10T09:00:00.000Z');
  });

  it('should reject empty title', async () => {
    const res = await authRequest('post', `/api/lists/${listId}/tasks`, token)
      .send({ title: '' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/lists/:listId/tasks', () => {
  it('should return tasks ordered by sort_order', async () => {
    await authRequest('post', `/api/lists/${listId}/tasks`, token).send({ title: 'First' });
    await authRequest('post', `/api/lists/${listId}/tasks`, token).send({ title: 'Second' });

    const res = await authRequest('get', `/api/lists/${listId}/tasks`, token);

    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe('First');
    expect(res.body[1].title).toBe('Second');
  });

  it('should not include subtasks in top-level list', async () => {
    const parent = await authRequest('post', `/api/lists/${listId}/tasks`, token).send({ title: 'Parent' });
    await authRequest('post', `/api/tasks/${parent.body.id}/subtasks`, token).send({ title: 'Child' });

    const res = await authRequest('get', `/api/lists/${listId}/tasks`, token);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Parent');
  });
});

describe('PATCH /api/tasks/:id', () => {
  it('should update a task', async () => {
    const created = await authRequest('post', `/api/lists/${listId}/tasks`, token).send({ title: 'Old' });
    const res = await authRequest('patch', `/api/tasks/${created.body.id}`, token)
      .send({ title: 'New', priority: 2 });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('New');
    expect(res.body.priority).toBe(2);
  });
});

describe('DELETE /api/tasks/:id', () => {
  it('should delete a task', async () => {
    const created = await authRequest('post', `/api/lists/${listId}/tasks`, token).send({ title: 'Delete me' });
    const res = await authRequest('delete', `/api/tasks/${created.body.id}`, token);
    expect(res.status).toBe(204);
  });
});

describe('PATCH /api/tasks/:id/complete & uncomplete', () => {
  it('should mark task as completed', async () => {
    const created = await authRequest('post', `/api/lists/${listId}/tasks`, token).send({ title: 'Do it' });
    const res = await authRequest('patch', `/api/tasks/${created.body.id}/complete`, token);

    expect(res.status).toBe(200);
    expect(res.body.completed_at).not.toBeNull();
  });

  it('should uncomplete a task', async () => {
    const created = await authRequest('post', `/api/lists/${listId}/tasks`, token).send({ title: 'Undo' });
    await authRequest('patch', `/api/tasks/${created.body.id}/complete`, token);
    const res = await authRequest('patch', `/api/tasks/${created.body.id}/uncomplete`, token);

    expect(res.status).toBe(200);
    expect(res.body.completed_at).toBeNull();
  });
});

describe('PATCH /api/lists/:listId/tasks/reorder', () => {
  it('should reorder tasks', async () => {
    const a = await authRequest('post', `/api/lists/${listId}/tasks`, token).send({ title: 'A' });
    const b = await authRequest('post', `/api/lists/${listId}/tasks`, token).send({ title: 'B' });

    await authRequest('patch', `/api/lists/${listId}/tasks/reorder`, token)
      .send({ orderedIds: [b.body.id, a.body.id] });

    const res = await authRequest('get', `/api/lists/${listId}/tasks`, token);
    expect(res.body[0].title).toBe('B');
    expect(res.body[1].title).toBe('A');
  });
});
```

- [ ] **Step 6: 寫子任務測試 server/tests/subtasks.test.ts**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestUser, generateToken, authRequest } from './helpers.js';

let token: string;
let listId: string;
let parentId: string;

beforeEach(async () => {
  const user = await createTestUser();
  token = generateToken(user.id);
  const listRes = await authRequest('post', '/api/lists', token).send({ name: 'Test List' });
  listId = listRes.body.id;
  const parentRes = await authRequest('post', `/api/lists/${listId}/tasks`, token).send({ title: 'Parent Task' });
  parentId = parentRes.body.id;
});

describe('POST /api/tasks/:parentId/subtasks', () => {
  it('should create a subtask', async () => {
    const res = await authRequest('post', `/api/tasks/${parentId}/subtasks`, token)
      .send({ title: 'Subtask 1' });

    expect(res.status).toBe(201);
    expect(res.body.parent_id).toBe(parentId);
    expect(res.body.list_id).toBe(listId);
  });

  it('should not allow subtask of subtask', async () => {
    const sub = await authRequest('post', `/api/tasks/${parentId}/subtasks`, token)
      .send({ title: 'Subtask' });

    const res = await authRequest('post', `/api/tasks/${sub.body.id}/subtasks`, token)
      .send({ title: 'Sub-subtask' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_OPERATION');
  });
});

describe('GET /api/tasks/:parentId/subtasks', () => {
  it('should return subtasks', async () => {
    await authRequest('post', `/api/tasks/${parentId}/subtasks`, token).send({ title: 'Sub A' });
    await authRequest('post', `/api/tasks/${parentId}/subtasks`, token).send({ title: 'Sub B' });

    const res = await authRequest('get', `/api/tasks/${parentId}/subtasks`, token);

    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe('Sub A');
  });
});

describe('Cascade delete', () => {
  it('should delete subtasks when parent is deleted', async () => {
    const sub = await authRequest('post', `/api/tasks/${parentId}/subtasks`, token)
      .send({ title: 'Will be gone' });

    await authRequest('delete', `/api/tasks/${parentId}`, token);

    const res = await authRequest('get', `/api/tasks/${sub.body.id}/subtasks`, token);
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 7: 執行測試**

Run: `cd server && npx vitest run tests/tasks.test.ts tests/subtasks.test.ts`
Expected: 全部 PASS

- [ ] **Step 8: Commit**

```bash
git add server/src/validators/task.ts server/src/services/task.service.ts server/src/routes/tasks.ts server/src/app.ts server/tests/tasks.test.ts server/tests/subtasks.test.ts
git commit -m "feat: add tasks and subtasks CRUD API with complete/uncomplete"
```

---

## Task 8: 標籤 CRUD + 任務標籤 API

**Files:**
- Create: `server/src/validators/tag.ts`
- Create: `server/src/services/tag.service.ts`
- Create: `server/src/routes/tags.ts`
- Modify: `server/src/app.ts`
- Create: `server/tests/tags.test.ts`

- [ ] **Step 1: 建立 server/src/validators/tag.ts**

```ts
import { z } from 'zod';

const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

export const createTagSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  color: z.string().regex(hexColorRegex, 'Invalid hex color').optional(),
});

export const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(hexColorRegex, 'Invalid hex color').optional(),
});

export const addTaskTagSchema = z.object({
  tagId: z.string().min(1, 'Tag ID is required'),
});
```

- [ ] **Step 2: 建立 server/src/services/tag.service.ts**

```ts
import { v4 as uuid } from 'uuid';
import { getDb } from '../db/connection.js';
import { AppError } from '../middleware/error-handler.js';
import type { Tag } from '../types.js';

export function getAll(userId: string): Tag[] {
  const db = getDb();
  return db.prepare('SELECT * FROM tags WHERE user_id = ? ORDER BY name ASC').all(userId) as Tag[];
}

export function create(userId: string, data: { name: string; color?: string }): Tag {
  const db = getDb();
  const id = uuid();
  const now = new Date().toISOString();

  try {
    db.prepare(`
      INSERT INTO tags (id, user_id, name, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userId, data.name, data.color || '#6b7280', now, now);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      throw new AppError(409, 'CONFLICT', 'A tag with this name already exists');
    }
    throw err;
  }

  return db.prepare('SELECT * FROM tags WHERE id = ?').get(id) as Tag;
}

export function update(userId: string, tagId: string, data: { name?: string; color?: string }): Tag {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM tags WHERE id = ? AND user_id = ?').get(tagId, userId) as Tag | undefined;
  if (!existing) {
    throw new AppError(404, 'NOT_FOUND', 'Tag not found');
  }

  const now = new Date().toISOString();
  try {
    db.prepare('UPDATE tags SET name = ?, color = ?, updated_at = ? WHERE id = ?').run(
      data.name ?? existing.name,
      data.color ?? existing.color,
      now,
      tagId,
    );
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      throw new AppError(409, 'CONFLICT', 'A tag with this name already exists');
    }
    throw err;
  }

  return db.prepare('SELECT * FROM tags WHERE id = ?').get(tagId) as Tag;
}

export function remove(userId: string, tagId: string): void {
  const db = getDb();
  const result = db.prepare('DELETE FROM tags WHERE id = ? AND user_id = ?').run(tagId, userId);
  if (result.changes === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Tag not found');
  }
}

// --- Task Tags ---

export function addTagToTask(userId: string, taskId: string, tagId: string): void {
  const db = getDb();

  // Verify task ownership
  const task = db.prepare(`
    SELECT t.id FROM tasks t JOIN lists l ON t.list_id = l.id WHERE t.id = ? AND l.user_id = ?
  `).get(taskId, userId);
  if (!task) {
    throw new AppError(404, 'NOT_FOUND', 'Task not found');
  }

  // Verify tag ownership
  const tag = db.prepare('SELECT id FROM tags WHERE id = ? AND user_id = ?').get(tagId, userId);
  if (!tag) {
    throw new AppError(404, 'NOT_FOUND', 'Tag not found');
  }

  try {
    db.prepare('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)').run(taskId, tagId);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint') || err.message?.includes('PRIMARY KEY')) {
      throw new AppError(409, 'CONFLICT', 'Tag already assigned to this task');
    }
    throw err;
  }
}

export function removeTagFromTask(userId: string, taskId: string, tagId: string): void {
  const db = getDb();

  // Verify task ownership
  const task = db.prepare(`
    SELECT t.id FROM tasks t JOIN lists l ON t.list_id = l.id WHERE t.id = ? AND l.user_id = ?
  `).get(taskId, userId);
  if (!task) {
    throw new AppError(404, 'NOT_FOUND', 'Task not found');
  }

  const result = db.prepare('DELETE FROM task_tags WHERE task_id = ? AND tag_id = ?').run(taskId, tagId);
  if (result.changes === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Tag not assigned to this task');
  }
}

export function getTagsForTask(userId: string, taskId: string): Tag[] {
  const db = getDb();
  return db.prepare(`
    SELECT t.* FROM tags t
    JOIN task_tags tt ON t.id = tt.tag_id
    WHERE tt.task_id = ? AND t.user_id = ?
    ORDER BY t.name ASC
  `).all(taskId, userId) as Tag[];
}
```

- [ ] **Step 3: 建立 server/src/routes/tags.ts**

```ts
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createTagSchema, updateTagSchema, addTaskTagSchema } from '../validators/tag.js';
import * as tagService from '../services/tag.service.js';

const router = Router();

router.use(requireAuth);

// Tag CRUD
router.get('/tags', (req, res, next) => {
  try {
    const tags = tagService.getAll(req.userId!);
    res.json(tags);
  } catch (err) { next(err); }
});

router.post('/tags', validate(createTagSchema), (req, res, next) => {
  try {
    const tag = tagService.create(req.userId!, req.body);
    res.status(201).json(tag);
  } catch (err) { next(err); }
});

router.patch('/tags/:id', validate(updateTagSchema), (req, res, next) => {
  try {
    const tag = tagService.update(req.userId!, req.params.id, req.body);
    res.json(tag);
  } catch (err) { next(err); }
});

router.delete('/tags/:id', (req, res, next) => {
  try {
    tagService.remove(req.userId!, req.params.id);
    res.status(204).send();
  } catch (err) { next(err); }
});

// Task Tags
router.post('/tasks/:id/tags', validate(addTaskTagSchema), (req, res, next) => {
  try {
    tagService.addTagToTask(req.userId!, req.params.id, req.body.tagId);
    res.status(201).json({ success: true });
  } catch (err) { next(err); }
});

router.delete('/tasks/:id/tags/:tagId', (req, res, next) => {
  try {
    tagService.removeTagFromTask(req.userId!, req.params.id, req.params.tagId);
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
```

- [ ] **Step 4: 更新 app.ts 掛載 tags 路由**

```ts
import tagsRoutes from './routes/tags.js';
// ...
app.use('/api', tagsRoutes);
```

- [ ] **Step 5: 寫標籤測試 server/tests/tags.test.ts**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestUser, generateToken, authRequest } from './helpers.js';

let token: string;

beforeEach(async () => {
  const user = await createTestUser();
  token = generateToken(user.id);
});

describe('Tag CRUD', () => {
  it('should create a tag', async () => {
    const res = await authRequest('post', '/api/tags', token)
      .send({ name: 'urgent', color: '#ef4444' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('urgent');
    expect(res.body.color).toBe('#ef4444');
  });

  it('should list all tags', async () => {
    await authRequest('post', '/api/tags', token).send({ name: 'b-tag' });
    await authRequest('post', '/api/tags', token).send({ name: 'a-tag' });

    const res = await authRequest('get', '/api/tags', token);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].name).toBe('a-tag');
  });

  it('should update a tag', async () => {
    const created = await authRequest('post', '/api/tags', token).send({ name: 'old' });
    const res = await authRequest('patch', `/api/tags/${created.body.id}`, token)
      .send({ name: 'new' });

    expect(res.body.name).toBe('new');
  });

  it('should delete a tag', async () => {
    const created = await authRequest('post', '/api/tags', token).send({ name: 'bye' });
    const res = await authRequest('delete', `/api/tags/${created.body.id}`, token);
    expect(res.status).toBe(204);
  });

  it('should reject duplicate tag name', async () => {
    await authRequest('post', '/api/tags', token).send({ name: 'dup' });
    const res = await authRequest('post', '/api/tags', token).send({ name: 'dup' });
    expect(res.status).toBe(409);
  });
});

describe('Task Tags', () => {
  let listId: string;
  let taskId: string;
  let tagId: string;

  beforeEach(async () => {
    const listRes = await authRequest('post', '/api/lists', token).send({ name: 'List' });
    listId = listRes.body.id;
    const taskRes = await authRequest('post', `/api/lists/${listId}/tasks`, token).send({ title: 'Task' });
    taskId = taskRes.body.id;
    const tagRes = await authRequest('post', '/api/tags', token).send({ name: 'work' });
    tagId = tagRes.body.id;
  });

  it('should add tag to task', async () => {
    const res = await authRequest('post', `/api/tasks/${taskId}/tags`, token)
      .send({ tagId });
    expect(res.status).toBe(201);
  });

  it('should reject duplicate tag assignment', async () => {
    await authRequest('post', `/api/tasks/${taskId}/tags`, token).send({ tagId });
    const res = await authRequest('post', `/api/tasks/${taskId}/tags`, token).send({ tagId });
    expect(res.status).toBe(409);
  });

  it('should remove tag from task', async () => {
    await authRequest('post', `/api/tasks/${taskId}/tags`, token).send({ tagId });
    const res = await authRequest('delete', `/api/tasks/${taskId}/tags/${tagId}`, token);
    expect(res.status).toBe(204);
  });

  it('should not allow adding another users tag', async () => {
    const other = await createTestUser({ email: 'other@example.com' });
    const otherToken = generateToken(other.id);
    const otherTag = await authRequest('post', '/api/tags', otherToken).send({ name: 'foreign' });

    const res = await authRequest('post', `/api/tasks/${taskId}/tags`, token)
      .send({ tagId: otherTag.body.id });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 6: 執行所有後端測試**

Run: `cd server && npx vitest run`
Expected: 全部 PASS

- [ ] **Step 7: Commit**

```bash
git add server/src/validators/tag.ts server/src/services/tag.service.ts server/src/routes/tags.ts server/src/app.ts server/tests/tags.test.ts
git commit -m "feat: add tags CRUD and task-tag association API"
```

---

## Task 9: 前端專案設定 (shadcn/ui + 路由 + API 層)

**Files:**
- Modify: `client/package.json` — 新增依賴
- Create: `client/components.json`
- Create: `client/src/lib/utils.ts`
- Create: `client/src/lib/api.ts`
- Create: `client/src/lib/query-client.ts`
- Create: `client/src/context/auth-context.tsx`
- Create: `client/src/context/theme-context.tsx`
- Modify: `client/src/App.tsx`
- Modify: `client/src/main.tsx`

- [ ] **Step 1: 安裝前端依賴**

Run:
```bash
cd client
npm install @tanstack/react-query axios react-router-dom
npm install -D tailwindcss @tailwindcss/vite class-variance-authority clsx tailwind-merge lucide-react
```

- [ ] **Step 2: 初始化 shadcn/ui**

Run:
```bash
cd client
npx shadcn@latest init
```

選擇 Default style, CSS variables for colors. 這會建立 `components.json` 和配置 Tailwind。

- [ ] **Step 3: 安裝需要的 shadcn/ui 元件**

Run:
```bash
cd client
npx shadcn@latest add button input label card sheet dialog dropdown-menu separator badge checkbox
```

- [ ] **Step 4: 建立 client/src/lib/api.ts**

```ts
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (refreshToken) {
        try {
          const res = await axios.post('/api/auth/refresh', { refreshToken });
          localStorage.setItem('accessToken', res.data.accessToken);
          localStorage.setItem('refreshToken', res.data.refreshToken);
          originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      } else {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);

export default api;
```

- [ ] **Step 5: 建立 client/src/lib/query-client.ts**

```ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});
```

- [ ] **Step 6: 建立 client/src/context/auth-context.tsx**

```tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      api.get('/auth/me')
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', res.data.accessToken);
    localStorage.setItem('refreshToken', res.data.refreshToken);
    setUser(res.data.user);
  };

  const register = async (email: string, password: string, name: string) => {
    const res = await api.post('/auth/register', { email, password, name });
    localStorage.setItem('accessToken', res.data.accessToken);
    localStorage.setItem('refreshToken', res.data.refreshToken);
    setUser(res.data.user);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

- [ ] **Step 7: 建立 client/src/context/theme-context.tsx**

```tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme | null;
    return saved || 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```

- [ ] **Step 8: 建立 client/src/App.tsx（路由骨架）**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/auth-context';
import LoginPage from '@/pages/LoginPage';
import HomePage from '@/pages/HomePage';
import ListDetailPage from '@/pages/ListDetailPage';
import SettingsPage from '@/pages/SettingsPage';
import MainLayout from '@/components/layout/MainLayout';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<HomePage />} />
          <Route path="/lists/:id" element={<ListDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

- [ ] **Step 9: 更新 client/src/main.tsx**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { AuthProvider } from '@/context/auth-context';
import { ThemeProvider } from '@/context/theme-context';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
```

- [ ] **Step 10: 建立佔位頁面**

建立以下檔案作為佔位：

`client/src/pages/LoginPage.tsx`:
```tsx
export default function LoginPage() {
  return <div>Login Page</div>;
}
```

`client/src/pages/HomePage.tsx`:
```tsx
export default function HomePage() {
  return <div>Home Page</div>;
}
```

`client/src/pages/ListDetailPage.tsx`:
```tsx
export default function ListDetailPage() {
  return <div>List Detail Page</div>;
}
```

`client/src/pages/SettingsPage.tsx`:
```tsx
export default function SettingsPage() {
  return <div>Settings Page</div>;
}
```

`client/src/components/layout/MainLayout.tsx`:
```tsx
import { Outlet } from 'react-router-dom';

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Outlet />
    </div>
  );
}
```

- [ ] **Step 11: 驗證前端啟動**

Run: `cd client && npm run dev`
Expected: Vite dev server 在 http://localhost:5173 啟動，瀏覽器顯示 "Login Page"

- [ ] **Step 12: Commit**

```bash
git add client/ package.json
git commit -m "feat: setup client with React, shadcn/ui, routing, auth and theme context"
```

---

## Task 10: 前端 TanStack Query Hooks

**Files:**
- Create: `client/src/hooks/use-lists.ts`
- Create: `client/src/hooks/use-tasks.ts`
- Create: `client/src/hooks/use-tags.ts`

- [ ] **Step 1: 建立 client/src/hooks/use-lists.ts**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

interface List {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useLists() {
  return useQuery<List[]>({
    queryKey: ['lists'],
    queryFn: () => api.get('/lists').then((res) => res.data),
  });
}

export function useCreateList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; color?: string; icon?: string }) =>
      api.post('/lists', data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lists'] }),
  });
}

export function useUpdateList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; color?: string; icon?: string }) =>
      api.patch(`/lists/${id}`, data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lists'] }),
  });
}

export function useDeleteList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/lists/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lists'] }),
  });
}

export function useReorderLists() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) =>
      api.patch('/lists/reorder', { orderedIds }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['lists'] }),
  });
}
```

- [ ] **Step 2: 建立 client/src/hooks/use-tasks.ts**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

interface Task {
  id: string;
  list_id: string;
  parent_id: string | null;
  title: string;
  notes: string;
  completed_at: string | null;
  flagged: number;
  due_date: string | null;
  priority: number;
  recurrence: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useTasks(listId: string) {
  return useQuery<Task[]>({
    queryKey: ['tasks', listId],
    queryFn: () => api.get(`/lists/${listId}/tasks`).then((res) => res.data),
    enabled: !!listId,
  });
}

export function useSubtasks(parentId: string) {
  return useQuery<Task[]>({
    queryKey: ['subtasks', parentId],
    queryFn: () => api.get(`/tasks/${parentId}/subtasks`).then((res) => res.data),
    enabled: !!parentId,
  });
}

export function useCreateTask(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; notes?: string; due_date?: string | null; priority?: number; flagged?: boolean }) =>
      api.post(`/lists/${listId}/tasks`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', listId] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });
}

export function useCreateSubtask(parentId: string, listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string }) =>
      api.post(`/tasks/${parentId}/subtasks`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', parentId] });
      queryClient.invalidateQueries({ queryKey: ['tasks', listId] });
    },
  });
}

export function useUpdateTask(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; title?: string; notes?: string; due_date?: string | null; priority?: number; flagged?: boolean }) =>
      api.patch(`/tasks/${id}`, data).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', listId] });
    },
  });
}

export function useDeleteTask(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', listId] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });
}

export function useCompleteTask(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/tasks/${id}/complete`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', listId] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });
}

export function useUncompleteTask(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/tasks/${id}/uncomplete`).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', listId] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });
}

export function useReorderTasks(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) =>
      api.patch(`/lists/${listId}/tasks/reorder`, { orderedIds }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks', listId] }),
  });
}
```

- [ ] **Step 3: 建立 client/src/hooks/use-tags.ts**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export function useTags() {
  return useQuery<Tag[]>({
    queryKey: ['tags'],
    queryFn: () => api.get('/tags').then((res) => res.data),
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; color?: string }) =>
      api.post('/tags', data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tags'] }),
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; color?: string }) =>
      api.patch(`/tags/${id}`, data).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tags'] }),
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tags/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tags'] }),
  });
}

export function useAddTagToTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, tagId }: { taskId: string; tagId: string }) =>
      api.post(`/tasks/${taskId}/tags`, { tagId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });
}

export function useRemoveTagFromTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, tagId }: { taskId: string; tagId: string }) =>
      api.delete(`/tasks/${taskId}/tags/${tagId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/hooks/
git commit -m "feat: add TanStack Query hooks for lists, tasks, and tags"
```

---

## Task 11: 登入 / 註冊頁面

**Files:**
- Create: `client/src/components/auth/AuthForm.tsx`
- Modify: `client/src/pages/LoginPage.tsx`

- [ ] **Step 1: 建立 client/src/components/auth/AuthForm.tsx**

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/auth-context';

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{isLogin ? '登入' : '註冊'}</CardTitle>
        <CardDescription>
          {isLogin ? '登入你的待辦事項帳號' : '建立新帳號'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="name">名稱</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="你的名稱"
                required={!isLogin}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">密碼</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 個字元"
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? '處理中...' : isLogin ? '登入' : '註冊'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? '還沒有帳號？' : '已有帳號？'}
            <button
              type="button"
              className="ml-1 underline"
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
            >
              {isLogin ? '註冊' : '登入'}
            </button>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: 更新 client/src/pages/LoginPage.tsx**

```tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/auth-context';
import AuthForm from '@/components/auth/AuthForm';

export default function LoginPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;
  if (user) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <AuthForm />
    </div>
  );
}
```

- [ ] **Step 3: 驗證**

Run: `npm run dev`（前後端同時啟動）
Expected: 瀏覽器 localhost:5173 顯示登入表單，可以註冊並自動跳轉到首頁

- [ ] **Step 4: Commit**

```bash
git add client/src/components/auth/ client/src/pages/LoginPage.tsx
git commit -m "feat: add login/register page with auth form"
```

---

## Task 12: 主頁 — 智慧清單 + 清單列表

**Files:**
- Create: `client/src/components/layout/Header.tsx`
- Modify: `client/src/components/layout/MainLayout.tsx`
- Create: `client/src/components/lists/SmartListGrid.tsx`
- Create: `client/src/components/lists/ListGroup.tsx`
- Create: `client/src/components/lists/ListItem.tsx`
- Create: `client/src/components/lists/AddListDialog.tsx`
- Modify: `client/src/pages/HomePage.tsx`

- [ ] **Step 1: 建立 client/src/components/layout/Header.tsx**

```tsx
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between border-b px-6 py-4">
      <h1 className="text-2xl font-bold">我的清單</h1>
      <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
        <Settings className="h-5 w-5" />
      </Button>
    </header>
  );
}
```

- [ ] **Step 2: 更新 MainLayout.tsx**

```tsx
import { Outlet } from 'react-router-dom';
import Header from './Header';

export default function MainLayout() {
  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-background">
      <Header />
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 3: 建立 SmartListGrid.tsx**

```tsx
import { useNavigate } from 'react-router-dom';
import { Calendar, CalendarDays, Inbox, Flag } from 'lucide-react';

interface SmartListProps {
  todayCount: number;
  scheduledCount: number;
  allCount: number;
  flaggedCount: number;
}

const smartLists = [
  { key: 'today', label: '今天', icon: Calendar, color: 'bg-blue-500' },
  { key: 'scheduled', label: '已排程', icon: CalendarDays, color: 'bg-orange-500' },
  { key: 'all', label: '全部', icon: Inbox, color: 'bg-purple-500' },
  { key: 'flagged', label: '已標記', icon: Flag, color: 'bg-red-500' },
] as const;

export default function SmartListGrid({ todayCount, scheduledCount, allCount, flaggedCount }: SmartListProps) {
  const counts: Record<string, number> = {
    today: todayCount,
    scheduled: scheduledCount,
    all: allCount,
    flagged: flaggedCount,
  };

  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      {smartLists.map(({ key, label, icon: Icon, color }) => (
        <div
          key={key}
          className={`${color} rounded-xl p-4 text-white cursor-pointer hover:opacity-90 transition-opacity`}
        >
          <div className="text-3xl font-bold">{counts[key]}</div>
          <div className="text-sm opacity-90 flex items-center gap-1">
            <Icon className="h-4 w-4" />
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: 建立 ListItem.tsx**

```tsx
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface ListItemProps {
  id: string;
  name: string;
  color: string;
  taskCount: number;
}

export default function ListItem({ id, name, color, taskCount }: ListItemProps) {
  const navigate = useNavigate();

  return (
    <div
      className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-accent cursor-pointer transition-colors"
      onClick={() => navigate(`/lists/${id}`)}
    >
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full text-white text-sm"
        style={{ backgroundColor: color }}
      >
        ●
      </div>
      <span className="flex-1 font-medium">{name}</span>
      <span className="text-sm text-muted-foreground">{taskCount}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}
```

- [ ] **Step 5: 建立 ListGroup.tsx**

```tsx
import ListItem from './ListItem';

interface List {
  id: string;
  name: string;
  color: string;
}

interface ListGroupProps {
  lists: List[];
  taskCounts: Record<string, number>;
}

export default function ListGroup({ lists, taskCounts }: ListGroupProps) {
  return (
    <div>
      <h2 className="mb-2 text-lg font-semibold">我的清單</h2>
      <div className="divide-y rounded-lg border">
        {lists.map((list) => (
          <ListItem
            key={list.id}
            id={list.id}
            name={list.name}
            color={list.color}
            taskCount={taskCounts[list.id] || 0}
          />
        ))}
        {lists.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground">
            還沒有清單，點擊下方按鈕新增
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: 建立 AddListDialog.tsx**

```tsx
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCreateList } from '@/hooks/use-lists';

const COLORS = ['#3b82f6', '#22c55e', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b'];

export default function AddListDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const createList = useCreateList();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createList.mutate(
      { name: name.trim(), color },
      {
        onSuccess: () => {
          setName('');
          setColor(COLORS[0]);
          setOpen(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="w-full mt-4 text-primary">
          <Plus className="mr-2 h-4 w-4" />
          新增清單
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增清單</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="list-name">名稱</Label>
            <Input
              id="list-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="清單名稱"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>顏色</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`h-8 w-8 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-2 ring-primary' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={createList.isPending}>
            {createList.isPending ? '建立中...' : '建立'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 7: 更新 HomePage.tsx**

```tsx
import { useLists } from '@/hooks/use-lists';
import SmartListGrid from '@/components/lists/SmartListGrid';
import ListGroup from '@/components/lists/ListGroup';
import AddListDialog from '@/components/lists/AddListDialog';

export default function HomePage() {
  const { data: lists = [], isLoading } = useLists();

  // TODO: 智慧清單計數需要取得所有任務資料，目前先用 0 佔位
  // 後續 Task 會完善此邏輯

  if (isLoading) {
    return <div className="flex justify-center p-8 text-muted-foreground">載入中...</div>;
  }

  return (
    <div>
      <SmartListGrid todayCount={0} scheduledCount={0} allCount={0} flaggedCount={0} />
      <ListGroup lists={lists} taskCounts={{}} />
      <AddListDialog />
    </div>
  );
}
```

- [ ] **Step 8: 驗證**

Run: `npm run dev`
Expected: 登入後看到智慧清單卡片 + 空清單列表 + 新增清單按鈕，可以新增清單

- [ ] **Step 9: Commit**

```bash
git add client/src/components/ client/src/pages/HomePage.tsx
git commit -m "feat: add home page with smart list grid, list group, and add list dialog"
```

---

## Task 13: 清單詳情頁 — 任務列表

**Files:**
- Create: `client/src/components/tasks/TaskItem.tsx`
- Create: `client/src/components/tasks/SubtaskItem.tsx`
- Create: `client/src/components/tasks/TaskList.tsx`
- Create: `client/src/components/tasks/AddTaskButton.tsx`
- Modify: `client/src/pages/ListDetailPage.tsx`

- [ ] **Step 1: 建立 TaskItem.tsx**

```tsx
import { Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TaskItemProps {
  id: string;
  title: string;
  completed: boolean;
  priority: number;
  dueDate: string | null;
  flagged: boolean;
  color: string;
  onToggleComplete: (id: string) => void;
  onClick: (id: string) => void;
}

const priorityLabels: Record<number, { label: string; className: string }> = {
  1: { label: '低', className: 'bg-blue-100 text-blue-700' },
  2: { label: '中', className: 'bg-yellow-100 text-yellow-700' },
  3: { label: '高', className: 'bg-red-100 text-red-700' },
};

export default function TaskItem({ id, title, completed, priority, dueDate, flagged, color, onToggleComplete, onClick }: TaskItemProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
  };

  return (
    <div
      className={`flex items-start gap-3 px-3 py-3 hover:bg-accent cursor-pointer transition-colors ${completed ? 'opacity-50' : ''}`}
      onClick={() => onClick(id)}
    >
      <button
        className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          completed ? 'border-transparent text-white' : 'border-current'
        }`}
        style={{ borderColor: completed ? undefined : color, backgroundColor: completed ? color : 'transparent' }}
        onClick={(e) => { e.stopPropagation(); onToggleComplete(id); }}
      >
        {completed && <Check className="h-3.5 w-3.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-sm ${completed ? 'line-through text-muted-foreground' : ''}`}>
          {title}
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {dueDate && (
            <span className="text-xs text-muted-foreground">{formatDate(dueDate)}</span>
          )}
          {priority > 0 && priorityLabels[priority] && (
            <Badge variant="secondary" className={`text-xs ${priorityLabels[priority].className}`}>
              {priorityLabels[priority].label}
            </Badge>
          )}
          {flagged && (
            <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">⚑</Badge>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 建立 SubtaskItem.tsx**

```tsx
import { Check } from 'lucide-react';

interface SubtaskItemProps {
  id: string;
  title: string;
  completed: boolean;
  color: string;
  onToggleComplete: (id: string) => void;
}

export default function SubtaskItem({ id, title, completed, color, onToggleComplete }: SubtaskItemProps) {
  return (
    <div className={`flex items-center gap-3 pl-12 pr-3 py-2 ${completed ? 'opacity-50' : ''}`}>
      <button
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          completed ? 'border-transparent text-white' : 'border-current'
        }`}
        style={{ borderColor: completed ? undefined : color, backgroundColor: completed ? color : 'transparent' }}
        onClick={() => onToggleComplete(id)}
      >
        {completed && <Check className="h-3 w-3" />}
      </button>
      <span className={`text-sm text-muted-foreground ${completed ? 'line-through' : ''}`}>
        {title}
      </span>
    </div>
  );
}
```

- [ ] **Step 3: 建立 TaskList.tsx**

```tsx
import TaskItem from './TaskItem';
import SubtaskItem from './SubtaskItem';
import { useSubtasks, useCompleteTask, useUncompleteTask } from '@/hooks/use-tasks';

interface Task {
  id: string;
  title: string;
  completed_at: string | null;
  priority: number;
  due_date: string | null;
  flagged: number;
}

interface TaskListProps {
  tasks: Task[];
  listId: string;
  listColor: string;
  onTaskClick: (taskId: string) => void;
}

function TaskWithSubtasks({ task, listId, listColor, onTaskClick }: {
  task: Task; listId: string; listColor: string; onTaskClick: (id: string) => void;
}) {
  const { data: subtasks = [] } = useSubtasks(task.id);
  const completeMutation = useCompleteTask(listId);
  const uncompleteMutation = useUncompleteTask(listId);

  const handleToggle = (id: string, isCompleted: boolean) => {
    if (isCompleted) {
      uncompleteMutation.mutate(id);
    } else {
      completeMutation.mutate(id);
    }
  };

  return (
    <>
      <TaskItem
        id={task.id}
        title={task.title}
        completed={task.completed_at !== null}
        priority={task.priority}
        dueDate={task.due_date}
        flagged={task.flagged === 1}
        color={listColor}
        onToggleComplete={(id) => handleToggle(id, task.completed_at !== null)}
        onClick={onTaskClick}
      />
      {subtasks.map((sub) => (
        <SubtaskItem
          key={sub.id}
          id={sub.id}
          title={sub.title}
          completed={sub.completed_at !== null}
          color={listColor}
          onToggleComplete={(id) => handleToggle(id, sub.completed_at !== null)}
        />
      ))}
    </>
  );
}

export default function TaskList({ tasks, listId, listColor, onTaskClick }: TaskListProps) {
  if (tasks.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">還沒有任務</p>;
  }

  return (
    <div className="divide-y rounded-lg border">
      {tasks.map((task) => (
        <TaskWithSubtasks
          key={task.id}
          task={task}
          listId={listId}
          listColor={listColor}
          onTaskClick={onTaskClick}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: 建立 AddTaskButton.tsx**

```tsx
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useCreateTask } from '@/hooks/use-tasks';

interface AddTaskButtonProps {
  listId: string;
}

export default function AddTaskButton({ listId }: AddTaskButtonProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const createTask = useCreateTask(listId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    createTask.mutate(
      { title: title.trim() },
      {
        onSuccess: () => {
          setTitle('');
        },
      },
    );
  };

  const handleBlur = () => {
    if (!title.trim()) {
      setIsAdding(false);
    }
  };

  if (!isAdding) {
    return (
      <button
        className="flex w-full items-center gap-2 px-3 py-3 text-sm text-primary hover:bg-accent rounded-lg transition-colors"
        onClick={() => setIsAdding(true)}
      >
        <Plus className="h-4 w-4" />
        新增任務
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="px-3 py-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleBlur}
        placeholder="新增任務..."
        autoFocus
      />
    </form>
  );
}
```

- [ ] **Step 5: 更新 ListDetailPage.tsx**

```tsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useLists, useDeleteList } from '@/hooks/use-lists';
import { useTasks } from '@/hooks/use-tasks';
import TaskList from '@/components/tasks/TaskList';
import TaskDetailSheet from '@/components/tasks/TaskDetailSheet';
import AddTaskButton from '@/components/tasks/AddTaskButton';

export default function ListDetailPage() {
  const { id: listId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: lists = [] } = useLists();
  const { data: tasks = [], isLoading } = useTasks(listId!);
  const deleteList = useDeleteList();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const list = lists.find((l) => l.id === listId);

  if (!list && !isLoading) {
    return <div className="p-8 text-center text-muted-foreground">清單不存在</div>;
  }

  const handleDeleteList = () => {
    if (!listId) return;
    deleteList.mutate(listId, {
      onSuccess: () => navigate('/'),
    });
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="flex-1 text-xl font-bold" style={{ color: list?.color }}>
          {list?.name}
        </h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-destructive" onClick={handleDeleteList}>
              <Trash2 className="mr-2 h-4 w-4" />
              刪除清單
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8 text-muted-foreground">載入中...</div>
      ) : (
        <>
          <TaskList
            tasks={tasks}
            listId={listId!}
            listColor={list?.color || '#3b82f6'}
            onTaskClick={setSelectedTaskId}
          />
          <AddTaskButton listId={listId!} />
        </>
      )}

      {selectedTaskId && (
        <TaskDetailSheet
          taskId={selectedTaskId}
          listId={listId!}
          task={tasks.find((t) => t.id === selectedTaskId)!}
          open={!!selectedTaskId}
          onOpenChange={(open) => !open && setSelectedTaskId(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 6: 建立佔位 TaskDetailSheet.tsx**

```tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface TaskDetailSheetProps {
  taskId: string;
  listId: string;
  task: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TaskDetailSheet({ task, open, onOpenChange }: TaskDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{task?.title}</SheetTitle>
        </SheetHeader>
        <p className="mt-4 text-muted-foreground">任務編輯面板（下一個 Task 實作）</p>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 7: 驗證**

Run: `npm run dev`
Expected: 可以從首頁點進清單，看到任務列表，新增任務，勾選完成/取消，子任務縮排顯示

- [ ] **Step 8: Commit**

```bash
git add client/src/components/tasks/ client/src/pages/ListDetailPage.tsx
git commit -m "feat: add list detail page with task list, subtasks, and add task button"
```

---

## Task 14: 任務編輯 Sheet

**Files:**
- Modify: `client/src/components/tasks/TaskDetailSheet.tsx`

- [ ] **Step 1: 完整實作 TaskDetailSheet.tsx**

```tsx
import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Trash2, Plus } from 'lucide-react';
import { useUpdateTask, useDeleteTask, useCreateSubtask, useSubtasks } from '@/hooks/use-tasks';

interface Task {
  id: string;
  title: string;
  notes: string;
  completed_at: string | null;
  priority: number;
  due_date: string | null;
  flagged: number;
  parent_id: string | null;
}

interface TaskDetailSheetProps {
  taskId: string;
  listId: string;
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TaskDetailSheet({ taskId, listId, task, open, onOpenChange }: TaskDetailSheetProps) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes || '');
  const [dueDate, setDueDate] = useState(task.due_date ? task.due_date.slice(0, 16) : '');
  const [priority, setPriority] = useState(task.priority);
  const [flagged, setFlagged] = useState(task.flagged === 1);
  const [newSubtask, setNewSubtask] = useState('');

  const updateTask = useUpdateTask(listId);
  const deleteTask = useDeleteTask(listId);
  const createSubtask = useCreateSubtask(taskId, listId);
  const { data: subtasks = [] } = useSubtasks(taskId);

  useEffect(() => {
    setTitle(task.title);
    setNotes(task.notes || '');
    setDueDate(task.due_date ? task.due_date.slice(0, 16) : '');
    setPriority(task.priority);
    setFlagged(task.flagged === 1);
  }, [task]);

  const handleSave = () => {
    updateTask.mutate({
      id: taskId,
      title,
      notes,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      priority,
      flagged,
    });
    onOpenChange(false);
  };

  const handleDelete = () => {
    deleteTask.mutate(taskId);
    onOpenChange(false);
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtask.trim()) return;
    createSubtask.mutate({ title: newSubtask.trim() });
    setNewSubtask('');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>編輯任務</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label>標題</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>備註</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="新增備註..."
            />
          </div>

          <div className="space-y-2">
            <Label>到期日</Label>
            <Input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>優先順序</Label>
            <div className="flex gap-2">
              {[
                { value: 0, label: '無' },
                { value: 1, label: '低' },
                { value: 2, label: '中' },
                { value: 3, label: '高' },
              ].map((p) => (
                <Button
                  key={p.value}
                  type="button"
                  variant={priority === p.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPriority(p.value)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="flagged"
              checked={flagged}
              onChange={(e) => setFlagged(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="flagged">標記</Label>
          </div>

          {!task.parent_id && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>子任務 ({subtasks.length})</Label>
                {subtasks.map((sub) => (
                  <div key={sub.id} className="text-sm text-muted-foreground pl-2">
                    • {sub.title}
                  </div>
                ))}
                <form onSubmit={handleAddSubtask} className="flex gap-2">
                  <Input
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    placeholder="新增子任務..."
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" variant="outline" disabled={!newSubtask.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          )}

          <Separator />

          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1">
              儲存
            </Button>
            <Button variant="destructive" size="icon" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: 驗證**

Run: `npm run dev`
Expected: 點擊任務開啟右側 Sheet，可以編輯標題、備註、到期日、優先順序、標記，以及新增子任務

- [ ] **Step 3: Commit**

```bash
git add client/src/components/tasks/TaskDetailSheet.tsx
git commit -m "feat: add task detail sheet with edit, subtasks, and delete"
```

---

## Task 15: 設定頁面 (主題切換 + 個人資料)

**Files:**
- Create: `client/src/components/settings/ProfileSection.tsx`
- Create: `client/src/components/settings/ThemeToggle.tsx`
- Modify: `client/src/pages/SettingsPage.tsx`

- [ ] **Step 1: 建立 ThemeToggle.tsx**

```tsx
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/context/theme-context';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div>
        <h3 className="font-medium">外觀</h3>
        <p className="text-sm text-muted-foreground">
          目前：{theme === 'light' ? '亮色' : '暗色'}模式
        </p>
      </div>
      <Button variant="outline" size="icon" onClick={toggleTheme}>
        {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: 建立 ProfileSection.tsx**

```tsx
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export default function ProfileSection() {
  const { user, logout } = useAuth();

  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-medium">{user?.name}</h3>
      <p className="text-sm text-muted-foreground">{user?.email}</p>
      <Button variant="outline" className="mt-4" onClick={logout}>
        <LogOut className="mr-2 h-4 w-4" />
        登出
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: 更新 SettingsPage.tsx**

```tsx
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProfileSection from '@/components/settings/ProfileSection';
import ThemeToggle from '@/components/settings/ThemeToggle';

export default function SettingsPage() {
  const navigate = useNavigate();

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-bold">設定</h2>
      </div>

      <div className="space-y-4">
        <ProfileSection />
        <ThemeToggle />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 驗證**

Run: `npm run dev`
Expected: 設定頁顯示使用者資訊、登出按鈕、亮暗主題切換

- [ ] **Step 5: Commit**

```bash
git add client/src/components/settings/ client/src/pages/SettingsPage.tsx
git commit -m "feat: add settings page with profile and theme toggle"
```

---

## Task 16: 智慧清單計數 + 首頁完善

**Files:**
- Create: `client/src/hooks/use-all-tasks.ts`
- Modify: `client/src/pages/HomePage.tsx`

- [ ] **Step 1: 建立 use-all-tasks hook**

為了計算智慧清單數量，需要一個取得所有任務的 endpoint。在 server 加一個：

在 `server/src/routes/tasks.ts` 加入：

```ts
router.get('/tasks/all', (req, res, next) => {
  try {
    const db = require('../db/connection.js').getDb();
    const tasks = db.prepare(`
      SELECT t.* FROM tasks t
      JOIN lists l ON t.list_id = l.id
      WHERE l.user_id = ? AND t.parent_id IS NULL
    `).all(req.userId!);
    res.json(tasks);
  } catch (err) { next(err); }
});
```

用 service 方式更整潔，在 `server/src/services/task.service.ts` 加入：

```ts
export function getAllForUser(userId: string): Task[] {
  const db = getDb();
  return db.prepare(`
    SELECT t.* FROM tasks t
    JOIN lists l ON t.list_id = l.id
    WHERE l.user_id = ? AND t.parent_id IS NULL
  `).all(userId) as Task[];
}
```

在 `server/src/routes/tasks.ts` 加入（放在其他 `/tasks` 路由之前）：

```ts
router.get('/tasks/all', (req, res, next) => {
  try {
    const tasks = taskService.getAllForUser(req.userId!);
    res.json(tasks);
  } catch (err) { next(err); }
});
```

- [ ] **Step 2: 建立 client/src/hooks/use-all-tasks.ts**

```ts
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface Task {
  id: string;
  list_id: string;
  completed_at: string | null;
  flagged: number;
  due_date: string | null;
}

export function useAllTasks() {
  return useQuery<Task[]>({
    queryKey: ['tasks', 'all'],
    queryFn: () => api.get('/tasks/all').then((res) => res.data),
  });
}

export function useSmartListCounts() {
  const { data: tasks = [] } = useAllTasks();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  const incomplete = tasks.filter((t) => !t.completed_at);

  const todayCount = incomplete.filter(
    (t) => t.due_date && t.due_date >= todayStart && t.due_date < todayEnd,
  ).length;

  const scheduledCount = incomplete.filter((t) => t.due_date).length;
  const allCount = incomplete.length;
  const flaggedCount = incomplete.filter((t) => t.flagged === 1).length;

  const taskCountsByList: Record<string, number> = {};
  for (const t of incomplete) {
    taskCountsByList[t.list_id] = (taskCountsByList[t.list_id] || 0) + 1;
  }

  return { todayCount, scheduledCount, allCount, flaggedCount, taskCountsByList };
}
```

- [ ] **Step 3: 更新 HomePage.tsx 使用真實數據**

```tsx
import { useLists } from '@/hooks/use-lists';
import { useSmartListCounts } from '@/hooks/use-all-tasks';
import SmartListGrid from '@/components/lists/SmartListGrid';
import ListGroup from '@/components/lists/ListGroup';
import AddListDialog from '@/components/lists/AddListDialog';

export default function HomePage() {
  const { data: lists = [], isLoading } = useLists();
  const { todayCount, scheduledCount, allCount, flaggedCount, taskCountsByList } = useSmartListCounts();

  if (isLoading) {
    return <div className="flex justify-center p-8 text-muted-foreground">載入中...</div>;
  }

  return (
    <div>
      <SmartListGrid
        todayCount={todayCount}
        scheduledCount={scheduledCount}
        allCount={allCount}
        flaggedCount={flaggedCount}
      />
      <ListGroup lists={lists} taskCounts={taskCountsByList} />
      <AddListDialog />
    </div>
  );
}
```

- [ ] **Step 4: 驗證**

Run: `npm run dev`
Expected: 首頁智慧清單顯示正確數字，清單列表顯示每個清單的未完成任務數

- [ ] **Step 5: Commit**

```bash
git add server/src/services/task.service.ts server/src/routes/tasks.ts client/src/hooks/use-all-tasks.ts client/src/pages/HomePage.tsx
git commit -m "feat: add smart list counts and per-list task counts on home page"
```

---

## Task 17: 資料庫初始化整合到 app 啟動

**Files:**
- Modify: `server/src/index.ts`
- Modify: `server/src/app.ts`

- [ ] **Step 1: 更新 server/src/index.ts 加入 DB 初始化**

```ts
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import app from './app.js';
import { getDb } from './db/connection.js';
import { initializeSchema } from './db/schema.js';

// 確保 data 目錄存在
const dbPath = process.env.DB_PATH || path.join(__dirname, '../data/todo.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// 初始化資料庫
const db = getDb();
initializeSchema(db);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

- [ ] **Step 2: Commit**

```bash
git add server/src/index.ts
git commit -m "feat: add database initialization on server startup"
```

---

## Task 18: 部署設定 (Render + GitHub Actions CI)

**Files:**
- Create: `render.yaml`
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: 建立 render.yaml**

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
      - key: DB_PATH
        value: /var/data/todo.db
    disk:
      name: todo-data
      mountPath: /var/data
      sizeGB: 1
```

- [ ] **Step 2: 建立 .github/workflows/ci.yml**

```yaml
name: CI

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install root dependencies
        run: npm install

      - name: Install server dependencies
        run: cd server && npm install

      - name: Run server tests
        run: cd server && npm test
        env:
          JWT_SECRET: test-secret
          JWT_REFRESH_SECRET: test-refresh-secret
```

- [ ] **Step 3: Commit**

```bash
git add render.yaml .github/workflows/ci.yml
git commit -m "feat: add Render deployment config and GitHub Actions CI"
```

---

## Task 19: 拖拽排序 UI

**Files:**
- Modify: `client/package.json` — 新增 @dnd-kit 依賴
- Modify: `client/src/components/lists/ListGroup.tsx`
- Modify: `client/src/components/tasks/TaskList.tsx`

- [ ] **Step 1: 安裝 @dnd-kit**

Run:
```bash
cd client
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: 更新 ListGroup.tsx 支援拖拽排序**

使用 `@dnd-kit/sortable` 包裝 ListItem，拖拽結束時呼叫 `useReorderLists` mutation：

```tsx
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useReorderLists } from '@/hooks/use-lists';
import ListItem from './ListItem';

interface List {
  id: string;
  name: string;
  color: string;
}

interface ListGroupProps {
  lists: List[];
  taskCounts: Record<string, number>;
}

function SortableListItem({ list, taskCount }: { list: List; taskCount: number }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: list.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center">
      <button {...attributes} {...listeners} className="px-1 cursor-grab text-muted-foreground">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1">
        <ListItem id={list.id} name={list.name} color={list.color} taskCount={taskCount} />
      </div>
    </div>
  );
}

export default function ListGroup({ lists, taskCounts }: ListGroupProps) {
  const reorderLists = useReorderLists();

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = lists.findIndex((l) => l.id === active.id);
    const newIndex = lists.findIndex((l) => l.id === over.id);
    const reordered = [...lists];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    reorderLists.mutate(reordered.map((l) => l.id));
  };

  return (
    <div>
      <h2 className="mb-2 text-lg font-semibold">我的清單</h2>
      <div className="divide-y rounded-lg border">
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={lists.map((l) => l.id)} strategy={verticalListSortingStrategy}>
            {lists.map((list) => (
              <SortableListItem key={list.id} list={list} taskCount={taskCounts[list.id] || 0} />
            ))}
          </SortableContext>
        </DndContext>
        {lists.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground">
            還沒有清單，點擊下方按鈕新增
          </p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 更新 TaskList.tsx 支援拖拽排序**

同樣使用 `@dnd-kit/sortable` 包裝 TaskWithSubtasks，拖拽結束時呼叫 `useReorderTasks`：

```tsx
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useReorderTasks } from '@/hooks/use-tasks';
import TaskItem from './TaskItem';
import SubtaskItem from './SubtaskItem';
import { useSubtasks, useCompleteTask, useUncompleteTask } from '@/hooks/use-tasks';

// ... (TaskWithSubtasks 同 Task 13，但外層包 useSortable)

interface Task {
  id: string;
  title: string;
  completed_at: string | null;
  priority: number;
  due_date: string | null;
  flagged: number;
}

function SortableTask({ task, listId, listColor, onTaskClick }: {
  task: Task; listId: string; listColor: string; onTaskClick: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const { data: subtasks = [] } = useSubtasks(task.id);
  const completeMutation = useCompleteTask(listId);
  const uncompleteMutation = useUncompleteTask(listId);

  const handleToggle = (id: string, isCompleted: boolean) => {
    if (isCompleted) uncompleteMutation.mutate(id);
    else completeMutation.mutate(id);
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center">
        <button {...attributes} {...listeners} className="px-1 cursor-grab text-muted-foreground">
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <TaskItem
            id={task.id} title={task.title} completed={task.completed_at !== null}
            priority={task.priority} dueDate={task.due_date} flagged={task.flagged === 1}
            color={listColor}
            onToggleComplete={(id) => handleToggle(id, task.completed_at !== null)}
            onClick={onTaskClick}
          />
        </div>
      </div>
      {subtasks.map((sub) => (
        <SubtaskItem
          key={sub.id} id={sub.id} title={sub.title}
          completed={sub.completed_at !== null} color={listColor}
          onToggleComplete={(id) => handleToggle(id, sub.completed_at !== null)}
        />
      ))}
    </div>
  );
}

interface TaskListProps {
  tasks: Task[];
  listId: string;
  listColor: string;
  onTaskClick: (taskId: string) => void;
}

export default function TaskList({ tasks, listId, listColor, onTaskClick }: TaskListProps) {
  const reorderTasks = useReorderTasks(listId);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);
    const reordered = [...tasks];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    reorderTasks.mutate(reordered.map((t) => t.id));
  };

  if (tasks.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">還沒有任務</p>;
  }

  return (
    <div className="divide-y rounded-lg border">
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <SortableTask key={task.id} task={task} listId={listId} listColor={listColor} onTaskClick={onTaskClick} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
```

- [ ] **Step 4: 驗證**

Run: `npm run dev`
Expected: 可以在首頁拖拽清單重新排序，在清單詳情拖拽任務重新排序

- [ ] **Step 5: Commit**

```bash
git add client/
git commit -m "feat: add drag-and-drop reordering for lists and tasks"
```

---

## Task 20: 重複任務邏輯

**Files:**
- Modify: `server/src/services/task.service.ts`
- Create: `server/tests/recurrence.test.ts`

- [ ] **Step 1: 在 task.service.ts 新增重複任務產生函數**

```ts
interface Recurrence {
  type: 'daily' | 'weekly' | 'monthly';
  interval: number;
  days?: number[]; // 0=Sun, 1=Mon, ... for weekly
}

function parseRecurrence(json: string | null): Recurrence | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as Recurrence;
  } catch {
    return null;
  }
}

function getNextDueDate(currentDue: string, recurrence: Recurrence): string {
  const date = new Date(currentDue);

  switch (recurrence.type) {
    case 'daily':
      date.setDate(date.getDate() + recurrence.interval);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7 * recurrence.interval);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + recurrence.interval);
      break;
  }

  return date.toISOString();
}
```

- [ ] **Step 2: 修改 complete() 函數處理重複任務**

```ts
export function complete(userId: string, taskId: string): Task {
  const task = verifyTaskOwnership(userId, taskId);
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare('UPDATE tasks SET completed_at = ?, updated_at = ? WHERE id = ?').run(now, now, taskId);

  // 如果是重複任務，自動建立下一個
  const recurrence = parseRecurrence(task.recurrence);
  if (recurrence && task.due_date) {
    const nextDueDate = getNextDueDate(task.due_date, recurrence);
    const nextId = uuid();

    const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM tasks WHERE list_id = ? AND parent_id IS NULL').get(task.list_id) as { max: number | null };
    const sortOrder = (maxOrder.max ?? -1) + 1;

    db.prepare(`
      INSERT INTO tasks (id, list_id, parent_id, title, notes, due_date, priority, flagged, recurrence, sort_order, created_at, updated_at)
      VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      nextId, task.list_id, task.title, task.notes, nextDueDate,
      task.priority, task.flagged, task.recurrence, sortOrder, now, now,
    );
  }

  return db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as Task;
}
```

- [ ] **Step 3: 寫重複任務測試 server/tests/recurrence.test.ts**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestUser, generateToken, authRequest } from './helpers.js';

let token: string;
let listId: string;

beforeEach(async () => {
  const user = await createTestUser();
  token = generateToken(user.id);
  const listRes = await authRequest('post', '/api/lists', token).send({ name: 'Recurring' });
  listId = listRes.body.id;
});

describe('Recurring tasks', () => {
  it('should create next task when completing a daily recurring task', async () => {
    const task = await authRequest('post', `/api/lists/${listId}/tasks`, token)
      .send({
        title: 'Daily standup',
        due_date: '2026-04-03T09:00:00.000Z',
        recurrence: JSON.stringify({ type: 'daily', interval: 1 }),
      });

    await authRequest('patch', `/api/tasks/${task.body.id}/complete`, token);

    const tasks = await authRequest('get', `/api/lists/${listId}/tasks`, token);
    const incomplete = tasks.body.filter((t: any) => !t.completed_at);

    expect(incomplete).toHaveLength(1);
    expect(incomplete[0].title).toBe('Daily standup');
    expect(incomplete[0].due_date).toBe('2026-04-04T09:00:00.000Z');
    expect(incomplete[0].recurrence).toBe(JSON.stringify({ type: 'daily', interval: 1 }));
  });

  it('should create next task for weekly recurring task', async () => {
    const task = await authRequest('post', `/api/lists/${listId}/tasks`, token)
      .send({
        title: 'Weekly review',
        due_date: '2026-04-03T09:00:00.000Z',
        recurrence: JSON.stringify({ type: 'weekly', interval: 1 }),
      });

    await authRequest('patch', `/api/tasks/${task.body.id}/complete`, token);

    const tasks = await authRequest('get', `/api/lists/${listId}/tasks`, token);
    const incomplete = tasks.body.filter((t: any) => !t.completed_at);

    expect(incomplete).toHaveLength(1);
    expect(incomplete[0].due_date).toBe('2026-04-10T09:00:00.000Z');
  });

  it('should NOT create next task for non-recurring task', async () => {
    const task = await authRequest('post', `/api/lists/${listId}/tasks`, token)
      .send({ title: 'One-time task', due_date: '2026-04-03T09:00:00.000Z' });

    await authRequest('patch', `/api/tasks/${task.body.id}/complete`, token);

    const tasks = await authRequest('get', `/api/lists/${listId}/tasks`, token);
    const incomplete = tasks.body.filter((t: any) => !t.completed_at);

    expect(incomplete).toHaveLength(0);
  });
});
```

- [ ] **Step 4: 執行測試**

Run: `cd server && npx vitest run tests/recurrence.test.ts`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add server/src/services/task.service.ts server/tests/recurrence.test.ts
git commit -m "feat: add recurring task logic - auto-create next occurrence on complete"
```

---

## Task 21: 瀏覽器提醒通知

**Files:**
- Create: `client/src/hooks/use-notifications.ts`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: 建立 client/src/hooks/use-notifications.ts**

```ts
import { useEffect, useRef } from 'react';
import { useAllTasks } from './use-all-tasks';

export function useTaskNotifications() {
  const { data: tasks = [] } = useAllTasks();
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (Notification.permission !== 'granted') return;

    const interval = setInterval(() => {
      const now = new Date();

      tasks.forEach((task) => {
        if (task.completed_at || !task.due_date) return;
        if (notifiedRef.current.has(task.id)) return;

        const dueDate = new Date(task.due_date);
        const diffMs = dueDate.getTime() - now.getTime();
        const diffMin = diffMs / (1000 * 60);

        // 到期前 15 分鐘提醒
        if (diffMin > 0 && diffMin <= 15) {
          new Notification('待辦事項提醒', {
            body: `「${task.title}」即將到期`,
            icon: '/favicon.ico',
          });
          notifiedRef.current.add(task.id);
        }

        // 已過期提醒
        if (diffMin <= 0 && diffMin > -1) {
          new Notification('待辦事項已到期', {
            body: `「${task.title}」已過期`,
            icon: '/favicon.ico',
          });
          notifiedRef.current.add(task.id);
        }
      });
    }, 60000); // 每分鐘檢查一次

    return () => clearInterval(interval);
  }, [tasks]);
}
```

- [ ] **Step 2: 在 App.tsx 中啟用通知**

在 `App` 元件中（`ProtectedRoute` 之後的路由內部）加入 hook 呼叫。建立一個 wrapper：

```tsx
import { useTaskNotifications } from '@/hooks/use-notifications';

function NotificationProvider({ children }: { children: React.ReactNode }) {
  useTaskNotifications();
  return <>{children}</>;
}
```

然後在 `ProtectedRoute` 中包裝：

```tsx
<ProtectedRoute>
  <NotificationProvider>
    <MainLayout />
  </NotificationProvider>
</ProtectedRoute>
```

- [ ] **Step 3: 驗證**

Run: `npm run dev`
Expected: 首次登入時瀏覽器詢問通知權限。建立一個 15 分鐘內到期的任務，等待 1 分鐘後應收到通知。

- [ ] **Step 4: Commit**

```bash
git add client/src/hooks/use-notifications.ts client/src/App.tsx
git commit -m "feat: add browser notification reminders for due tasks"
```

---

## Task 22: 執行全部測試並修正

- [ ] **Step 1: 執行所有後端測試**

Run: `cd server && npx vitest run`
Expected: 全部 PASS

- [ ] **Step 2: 如有失敗，修正並重跑**

根據錯誤訊息修正程式碼，重複直到全部通過。

- [ ] **Step 3: 驗證前端編譯**

Run: `cd client && npm run build`
Expected: 成功編譯，無 TypeScript 錯誤

- [ ] **Step 4: 驗證完整開發流程**

Run: `npm run dev`

手動測試：
1. 開啟 http://localhost:5173
2. 註冊新帳號
3. 建立清單
4. 新增任務（含到期日、優先順序）
5. 勾選完成任務
6. 新增子任務
7. 確認智慧清單計數正確
8. 切換亮暗主題
9. 登出再登入

- [ ] **Step 5: 最終 Commit**

```bash
git add -A
git commit -m "chore: final integration verification"
```
