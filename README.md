# iOS 風格待辦事項 WebApp

類似 Apple iOS Reminders 的全端待辦事項應用程式。個人使用為主，架構預留未來團隊協作擴展空間。

**線上版本：** https://ios-todo-web.onrender.com （免費方案，首次載入需 30-50 秒冷啟動）

## 功能

- **清單管理** — 建立、編輯、刪除、拖拽排序，自訂顏色與圖示
- **任務管理** — 新增、編輯、刪除、完成/取消完成、拖拽排序
- **子任務** — 一層子任務，自動繼承父任務的清單歸屬
- **優先順序** — 無 / 低 / 中 / 高
- **標籤** — 多對多關聯，可為任務貼上多個標籤
- **重複任務** — 每日、每週、每月，完成後自動產生下一筆
- **智慧清單** — 今天、已排程、全部、已標記（前端即時計算）
- **提醒通知** — 瀏覽器 Notification API，到期前 15 分鐘提醒
- **認證** — JWT（access token 15 分鐘 + refresh token 7 天）
- **主題切換** — 亮色 / 暗色模式

## 技術棧

| 層級 | 技術 |
|---|---|
| 前端 | Vite + React 19 + TypeScript |
| UI 元件 | shadcn/ui (Base-Nova) + Tailwind CSS 4 |
| 狀態管理 | TanStack Query（伺服器狀態）+ React Context（客戶端狀態） |
| 拖拽排序 | @dnd-kit |
| HTTP 客戶端 | axios |
| 後端 | Express 5 |
| 資料庫 | PostgreSQL（Neon 免費方案） |
| 認證 | JWT + bcrypt |
| 驗證 | zod |
| 測試 | Vitest + Supertest + PGlite |
| 部署 | Render（免費方案） |
| CI | GitHub Actions |

## 專案結構

```
todo-app/
├── client/                   # 前端（Vite + React + shadcn/ui）
│   ├── src/
│   │   ├── components/       # UI 元件（layout, auth, lists, tasks, settings）
│   │   ├── pages/            # 頁面（Login, Home, ListDetail, SmartList, Settings）
│   │   ├── hooks/            # TanStack Query hooks
│   │   ├── context/          # Auth + Theme context
│   │   └── lib/              # API client, query client, utils
│   └── vite.config.ts
├── server/                   # 後端（Express + PostgreSQL）
│   ├── src/
│   │   ├── routes/           # API 路由（auth, lists, tasks, tags）
│   │   ├── services/         # 商業邏輯
│   │   ├── validators/       # zod schemas
│   │   ├── middleware/       # auth, error-handler, validate
│   │   └── db/               # 連線管理 + schema
│   └── tests/                # API 測試（8 files, 60 tests）
├── render.yaml               # Render 部署設定
└── .github/workflows/ci.yml  # CI pipeline
```

## 快速開始

### 前置需求

- Node.js 20+
- PostgreSQL 資料庫（本地或 [Neon](https://neon.tech) 免費方案）

### 安裝與啟動

```bash
# 1. Clone
git clone https://github.com/mrtony/ios-todo-web.git
cd ios-todo-web

# 2. 環境變數
cp .env.example .env
# 編輯 .env，填入 DATABASE_URL 和 JWT secrets

# 3. 安裝依賴（自動安裝 server + client）
npm install

# 4. 啟動開發環境
npm run dev
```

開發環境啟動後：
- 前端：http://localhost:5173（Vite dev server，自動 proxy `/api` 到後端）
- 後端：http://localhost:3000（Express API）

### 環境變數

| 變數 | 說明 | 預設值 |
|---|---|---|
| `DATABASE_URL` | PostgreSQL 連線字串 | `postgresql://localhost:5432/todo_dev` |
| `JWT_SECRET` | Access token 簽名密鑰 | `dev-secret` |
| `JWT_REFRESH_SECRET` | Refresh token 簽名密鑰 | `dev-refresh-secret` |
| `PORT` | 後端 port | `3000` |

### 常用指令

```bash
npm run dev           # 同時啟動前後端開發環境
npm run build         # 編譯 server (tsc) + client (vite build)
npm start             # 啟動生產環境 server
npm test              # 執行後端測試
```

## API 端點

所有端點除了 `register` / `login` 都需要 `Authorization: Bearer <token>` header。

### 認證

```
POST   /api/auth/register      註冊
POST   /api/auth/login          登入
POST   /api/auth/refresh        刷新 token
GET    /api/auth/me             取得當前用戶
```

### 清單

```
GET    /api/lists               取得所有清單
POST   /api/lists               建立清單
PATCH  /api/lists/:id           更新清單
DELETE /api/lists/:id           刪除清單（cascade 任務）
PATCH  /api/lists/reorder       批次排序
```

### 任務

```
GET    /api/lists/:listId/tasks          取得清單任務（含子任務）
POST   /api/lists/:listId/tasks          建立任務
PATCH  /api/tasks/:id                    更新任務
DELETE /api/tasks/:id                    刪除任務
PATCH  /api/tasks/:id/complete           標記完成
PATCH  /api/tasks/:id/uncomplete         取消完成
PATCH  /api/lists/:listId/tasks/reorder  批次排序
GET    /api/tasks/all                    取得所有任務（智慧清單用）
```

### 子任務

```
GET    /api/tasks/:parentId/subtasks     取得子任務
POST   /api/tasks/:parentId/subtasks     建立子任務
```

### 標籤

```
GET    /api/tags                取得所有標籤
POST   /api/tags                建立標籤
PATCH  /api/tags/:id            更新標籤
DELETE /api/tags/:id            刪除標籤
POST   /api/tasks/:id/tags      為任務加標籤
GET    /api/tasks/:id/tags      取得任務標籤
DELETE /api/tasks/:id/tags/:tagId  移除任務標籤
```

### 錯誤回應格式

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "任務標題不可為空"
  }
}
```

## 測試

```bash
cd server && npm test
```

使用 PGlite（嵌入式 PostgreSQL）執行測試，不需要外部資料庫：

- **8 個測試檔案**，涵蓋認證、清單、任務、子任務、標籤、重複任務、智慧清單
- **60 個測試案例**，覆蓋成功路徑與錯誤路徑

## 部署

### Render + Neon（推薦）

1. 在 [Neon](https://neon.tech) 建立免費 PostgreSQL 資料庫，取得連線字串
2. 在 [Render](https://render.com) 建立 Web Service，連結此 GitHub repo
3. 設定環境變數：
   - `DATABASE_URL` — Neon 連線字串
   - `JWT_SECRET` — 隨機字串
   - `JWT_REFRESH_SECRET` — 隨機字串
4. Render 會自動從 `render.yaml` 讀取 build/start 設定

生產環境中，Express 同時提供 API 和前端靜態檔案，單一 port 運行。

```
┌─────────────────────────────────────┐
│            Render                    │
│  ┌─────────────────────────────┐   │
│  │      Express Server          │   │
│  │  /api/*  → REST API          │   │
│  │  /*      → 前端靜態檔案      │   │
│  └──────────┬──────────────────┘   │
│             │                       │
│  ┌──────────▼──────────────────┐   │
│  │   Neon PostgreSQL            │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

## 開發流程

本專案採用 **Claude Code + Codex 雙 AI 協作** 的開發模式，Claude Code 負責設計與審查，Codex 負責實作。

```
┌─────────────────────────────────────────────────────────────┐
│                     開發迭代循環                              │
│                                                              │
│  ┌──────────────┐    規格文件     ┌──────────────┐          │
│  │  Claude Code  │ ──────────────→ │    Codex     │          │
│  │  設計 + 審查   │ ← ── PR ── ── │    實作       │          │
│  └──────┬───────┘                 └──────────────┘          │
│         │                                                    │
│         │ 發現問題？                                          │
│         │ ├─ 是 → 生成修復計畫 → 交給 Codex → 再次審查       │
│         │ └─ 否 → 合併 PR → 進入下一階段                     │
│         │                                                    │
└─────────┴────────────────────────────────────────────────────┘
```

### 階段一：設計

在 Claude Code 中使用 **SuperPowers Brainstorming** 技能，透過互動式問答釐清需求：

1. 探索專案現況
2. 逐一提問（使用場景、功能範圍、技術選型、UI 風格等）
3. 提出 2-3 個方案比較，附帶視覺化 mockup
4. 分段展示設計，逐段取得確認
5. 產出設計規格文件（spec）

### 階段二：實作計畫

Claude Code 根據設計規格，使用 **Writing Plans** 技能產出詳細的實作計畫：

- 每個任務包含完整程式碼、測試、執行指令
- TDD 驅動：先寫測試 → 確認失敗 → 實作 → 確認通過 → 提交
- 計畫文件推送到 GitHub，交給 Codex 執行

### 階段三：Codex 實作

Codex 讀取計畫文件，使用 `superpowers:executing-plans` 技能逐步執行：

```
使用 superpowers:executing-plans 技能，按照 docs/superpowers/plans/<計畫檔名>.md 逐步執行。
```

### 階段四：Code Review

Codex 完成後，回到 Claude Code 進行程式碼審查：

- 啟動 code reviewer agent 比對設計規格與實際程式碼
- 分別審查 server 和 client
- 產出審查報告（Bug、功能缺失、效能問題、UX 建議）

### 階段五：修復迭代

若審查發現問題，Claude Code 生成修復計畫文件，再交給 Codex 執行。此循環持續直到所有問題解決：

```
Claude Code 審查 → 發現問題 → 生成修復計畫 → Codex 修復 → Claude Code 再審查 → ...
```

### 本專案的實際迭代紀錄

| 迭代 | 階段 | 產出 |
|---|---|---|
| 1 | 設計 | 設計規格（spec） |
| 2 | 實作 | 22 個任務的實作計畫 → Codex 執行 |
| 3 | 審查 | 發現 4 個 Bug + 5 個功能缺失 + 效能問題 |
| 4 | 修復 | 13 個修復項目的修復計畫 → Codex 修復 |
| 5 | 再審查 | 全部修復確認通過 |
| 6 | 遷移 | SQLite → PostgreSQL 遷移計畫 → Codex 執行 |
| 7 | 遷移審查 | 發現交易安全問題 + 3 個 PR review 問題 → Codex 修正 |
| 8 | 部署 | Render + Neon 上線 |

## 設計文件

- **設計規格**：[`docs/superpowers/specs/2026-04-03-todo-webapp-design.md`](docs/superpowers/specs/2026-04-03-todo-webapp-design.md)
- **實作計畫**：[`docs/superpowers/plans/2026-04-03-todo-webapp.md`](docs/superpowers/plans/2026-04-03-todo-webapp.md)
- **修復計畫**：[`docs/superpowers/plans/2026-04-03-todo-webapp-fixes.md`](docs/superpowers/plans/2026-04-03-todo-webapp-fixes.md)
- **PostgreSQL 遷移計畫**：[`docs/superpowers/plans/2026-04-03-migrate-sqlite-to-postgresql.md`](docs/superpowers/plans/2026-04-03-migrate-sqlite-to-postgresql.md)

## 授權

MIT
