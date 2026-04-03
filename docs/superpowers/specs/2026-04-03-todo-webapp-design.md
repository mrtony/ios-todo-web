# iOS 風格待辦事項 WebApp — 設計規格

## 概述

設計一個類似 Apple iOS 待辦事項（Reminders）的 WebApp。初版為個人使用，架構預留未來團隊協作擴展空間。

## 技術棧

| 層級 | 技術 |
|---|---|
| 前端框架 | Vite + React |
| UI 元件庫 | shadcn/ui |
| 前端狀態管理 | TanStack Query（伺服器狀態）+ React useState/useContext（客戶端狀態） |
| HTTP 客戶端 | axios |
| 後端框架 | Express |
| 資料庫 | SQLite |
| 認證 | JWT（access token 15 分鐘 + refresh token 7 天） |
| 密碼雜湊 | bcrypt（cost factor 12） |
| 輸入驗證 | zod |
| 測試 | Vitest + Supertest + Testing Library |
| 部署 | Render（免費方案，持久化磁碟） |
| 原始碼託管 | GitHub |

## 架構

### Monorepo 專案結構

```
todo-app/
├── client/          # Vite + React + shadcn/ui
├── server/          # Express + SQLite
├── package.json     # 根層 scripts（dev, build, start）
└── render.yaml      # Render 部署設定
```

### 運作方式

- **開發環境**：Vite dev server（port 5173）+ Express API（port 3000），Vite proxy 轉發 `/api` 請求
- **生產環境**：Express 同時提供 API 和前端靜態檔案，單一 port 運行
- **部署流程**：GitHub push → Render 自動觸發部署

```
┌─────────────────────────────────────────────┐
│                  Render                      │
│                                              │
│  ┌──────────────────────────────────────┐   │
│  │         Express Server                │   │
│  │                                       │   │
│  │  /api/*  → REST API (JSON)           │   │
│  │  /*      → Vite build 靜態檔案       │   │
│  │                                       │   │
│  └──────────┬───────────────────────────┘   │
│             │                                │
│  ┌──────────▼───────────────────────────┐   │
│  │  SQLite（持久化磁碟）                 │   │
│  └──────────────────────────────────────┘   │
│                                              │
└─────────────────────────────────────────────┘
```

## 功能範圍

### 核心功能（v1）

- 清單管理：建立、編輯、刪除、拖拽排序
- 任務管理：新增、編輯、刪除、完成/取消完成、拖拽排序
- 子任務：一層子任務，自動繼承父任務的清單歸屬
- 優先順序：無 / 低 / 中 / 高（0-3）
- 標籤：多對多，可為任務貼上多個標籤
- 到期日設定
- 重複任務：每日、每週、每月、自訂
- 提醒通知（瀏覽器 Notification API）
- 智慧清單（前端即時計算）：今天、已排程、全部、已標記
- JWT 認證：註冊、登入、token 刷新
- 亮色 / 暗色主題切換

### 不在 v1 範圍

- 團隊協作、共享清單
- 社群登入（OAuth）
- 位置提醒
- 附件 / 圖片
- 自然語言輸入
- 郵件驗證
- 帳號狀態管理
- 軟刪除

## 資料模型

所有時間欄位一律儲存 UTC。ID 使用 UUID（TEXT 型別），為未來團隊版避免衝突。

### users

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | TEXT PK | UUID |
| email | TEXT UNIQUE | 存入時統一 LOWER()，case-insensitive unique |
| password_hash | TEXT | bcrypt 雜湊 |
| name | TEXT | 顯示名稱 |
| last_login_at | DATETIME | 最後登入時間（UTC） |
| created_at | DATETIME | 建立時間（UTC） |
| updated_at | DATETIME | 更新時間（UTC） |

### lists

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | TEXT PK | UUID |
| user_id | TEXT FK → users.id | 所屬用戶 |
| name | TEXT | 清單名稱 |
| color | TEXT | Hex 色碼，應用層驗證格式 |
| icon | TEXT | 預設 enum，應用層驗證 |
| sort_order | INTEGER | 用戶內排序 |
| created_at | DATETIME | UTC |
| updated_at | DATETIME | UTC |

**約束：**
- UNIQUE (user_id, name)
- FK user_id ON DELETE CASCADE
- INDEX (user_id, sort_order)

### tasks

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | TEXT PK | UUID |
| list_id | TEXT FK → lists.id | 所屬清單 |
| parent_id | TEXT FK → tasks.id NULL | 父任務（子任務用），NULL 表示頂層任務 |
| title | TEXT | 任務標題 |
| notes | TEXT | 備註 |
| completed_at | DATETIME NULL | 完成時間（UTC），NULL 表示未完成，用 `completed_at IS NOT NULL` 判斷完成狀態 |
| flagged | BOOLEAN DEFAULT 0 | 已標記（對應智慧清單「已標記」） |
| due_date | DATETIME | 到期日（UTC） |
| priority | INTEGER | 0=無、1=低、2=中、3=高 |
| recurrence | TEXT | JSON 字串，例如 `{"type":"weekly","interval":1,"days":[1,3,5]}` |
| sort_order | INTEGER | 同 list_id + 同 parent_id 內排序 |
| created_at | DATETIME | UTC |
| updated_at | DATETIME | UTC |

**約束：**
- FK list_id ON DELETE CASCADE
- FK parent_id ON DELETE CASCADE
- CHECK (priority BETWEEN 0 AND 3)
- 應用層檢查：parent_id 的任務本身不能有 parent_id（僅允許一層子任務）
- 應用層檢查：子任務的 list_id 必須與父任務相同

**索引：**
- (list_id, sort_order)
- (list_id, completed_at, due_date)
- (parent_id)
- (due_date)

### tags

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | TEXT PK | UUID |
| user_id | TEXT FK → users.id | 所屬用戶 |
| name | TEXT | 標籤名稱 |
| color | TEXT | Hex 色碼，應用層驗證 |
| created_at | DATETIME | UTC |
| updated_at | DATETIME | UTC |

**約束：**
- UNIQUE (user_id, name) — 同時作為索引
- FK user_id ON DELETE CASCADE

### task_tags

| 欄位 | 型別 | 說明 |
|---|---|---|
| task_id | TEXT FK → tasks.id | |
| tag_id | TEXT FK → tags.id | |

**約束：**
- PK (task_id, tag_id)
- FK task_id ON DELETE CASCADE
- FK tag_id ON DELETE CASCADE
- INDEX (tag_id, task_id)
- 應用層檢查：task 與 tag 屬於同一 user

## API 設計

所有 API 除了 `register` / `login` 都需要 JWT Bearer token。

### 認證

| 方法 | 路由 | 說明 |
|---|---|---|
| POST | /api/auth/register | 註冊 |
| POST | /api/auth/login | 登入，回傳 JWT |
| POST | /api/auth/refresh | 刷新 token |
| GET | /api/auth/me | 取得當前用戶資訊 |

### 清單

| 方法 | 路由 | 說明 |
|---|---|---|
| GET | /api/lists | 取得用戶所有清單 |
| POST | /api/lists | 建立清單 |
| PATCH | /api/lists/:id | 更新清單 |
| DELETE | /api/lists/:id | 刪除清單（cascade tasks） |
| PATCH | /api/lists/reorder | 批次更新排序 |

### 任務

| 方法 | 路由 | 說明 |
|---|---|---|
| GET | /api/lists/:listId/tasks | 取得清單內所有任務 |
| POST | /api/lists/:listId/tasks | 建立任務 |
| PATCH | /api/tasks/:id | 更新任務 |
| DELETE | /api/tasks/:id | 刪除任務（cascade 子任務） |
| PATCH | /api/tasks/:id/complete | 標記完成 |
| PATCH | /api/tasks/:id/uncomplete | 取消完成 |
| PATCH | /api/lists/:listId/tasks/reorder | 批次更新排序 |

### 子任務

| 方法 | 路由 | 說明 |
|---|---|---|
| GET | /api/tasks/:parentId/subtasks | 取得子任務 |
| POST | /api/tasks/:parentId/subtasks | 建立子任務（自動繼承 list_id） |

### 標籤

| 方法 | 路由 | 說明 |
|---|---|---|
| GET | /api/tags | 取得用戶所有標籤 |
| POST | /api/tags | 建立標籤 |
| PATCH | /api/tags/:id | 更新標籤 |
| DELETE | /api/tags/:id | 刪除標籤（cascade task_tags） |

### 任務標籤

| 方法 | 路由 | 說明 |
|---|---|---|
| POST | /api/tasks/:id/tags | 為任務加標籤 |
| DELETE | /api/tasks/:id/tags/:tagId | 移除任務標籤 |

### 統一錯誤回應格式

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "任務標題不可為空"
  }
}
```

HTTP 狀態碼：400（請求錯誤）、401（未認證）、403（無權限）、404（不存在）、409（衝突）、500（伺服器錯誤）

## 前端設計

### UI 風格

借鑑 iOS 待辦事項的簡潔美學，但使用 shadcn/ui 自身的設計語言。不高度還原 iOS 外觀。

### 頁面路由

| 路由 | 頁面 | 說明 |
|---|---|---|
| /login | 登入頁 | 登入 / 註冊切換 |
| / | 主頁（清單總覽） | 智慧清單卡片 + 用戶清單列表 |
| /lists/:id | 清單詳情 | 該清單下所有任務 |
| /settings | 設定頁 | 帳號、主題偏好 |

### 主頁佈局

- 上方：智慧清單卡片網格（今天 / 已排程 / 全部 / 已標記），顯示任務數量統計
- 下方：用戶清單列表，每行顯示清單圖示、名稱、任務數
- 底部：新增清單按鈕

### 清單詳情佈局

- 頂部：返回按鈕、清單名稱（清單主題色）、更多選項
- 中間：任務列表
  - 未完成任務：圓形勾選框 + 標題 + 到期日/優先順序 + 標籤
  - 已完成任務：填色勾選框 + 刪除線標題 + 半透明
  - 子任務：縮排顯示在父任務下方
- 底部：新增任務按鈕
- 任務編輯：底部彈出 Sheet 面板（shadcn/ui Sheet 元件）

### React 元件架構

```
App
├── AuthProvider（JWT 狀態管理）
├── LoginPage
│   └── AuthForm（登入/註冊切換）
├── MainLayout
│   ├── Header（標題、設定按鈕）
│   └── Outlet
├── HomePage
│   ├── SmartListGrid（今天/已排程/全部/已標記）
│   ├── ListGroup（清單列表）
│   │   └── ListItem（單一清單行）
│   └── AddListButton
├── ListDetailPage
│   ├── ListHeader（返回、清單名、選單）
│   ├── TaskList
│   │   ├── TaskItem（勾選、標題、標籤、優先順序）
│   │   └── SubtaskItem（縮排子任務）
│   ├── AddTaskButton
│   └── TaskDetailSheet（底部彈出編輯面板）
└── SettingsPage
    ├── ProfileSection
    └── ThemeToggle（亮/暗主題）
```

### 前端狀態管理

- **伺服器狀態**：TanStack Query — 清單、任務、標籤等 API 資料的快取、同步、loading/error 狀態
- **客戶端狀態**：React useState / useContext — 主題切換、UI 開關等
- **Optimistic updates**：勾選任務、排序等操作立即反映在 UI，不等 API 回應

## 錯誤處理

- 後端：Express 全域錯誤中介層統一攔截
- 前端：axios interceptor 統一處理 401（自動嘗試 refresh token，失敗則跳轉登入頁）

## 測試策略

| 層級 | 工具 | 範圍 |
|---|---|---|
| 後端 API 測試 | Vitest + Supertest | 每個 endpoint 的成功/錯誤路徑 |
| 後端單元測試 | Vitest | 商業邏輯（重複任務計算、排序邏輯） |
| 前端元件測試 | Vitest + Testing Library | 關鍵互動（勾選任務、新增清單） |
| E2E 測試 | 延後至 v2 | 未來可加 Playwright |

- 測試使用獨立的 in-memory SQLite，不影響開發資料
- CI：GitHub Actions，push 時自動跑測試

## 安全性

- 密碼使用 bcrypt 雜湊（cost factor 12）
- JWT secret 從環境變數讀取
- API 全面驗證資源歸屬（不可存取他人的清單/任務/標籤）
- 輸入驗證使用 zod schema
- 所有 API 回應不洩漏內部錯誤細節
