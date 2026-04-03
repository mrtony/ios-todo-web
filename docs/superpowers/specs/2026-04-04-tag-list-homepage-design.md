# 主頁標籤清單 + 標籤任務頁 — 設計規格

**GitHub Issue:** #3

## 概述

在主頁新增標籤清單區塊，讓使用者可以從主頁直接瀏覽標籤，點選後顯示該標籤關聯的待辦事項。

## 需求

- 主頁在「我的清單」下方顯示標籤清單區塊
- 每個標籤顯示名稱、顏色、關聯的未完成任務數
- 沒有任何標籤時，整個區塊隱藏
- 點選標籤後導航到標籤任務頁
- 標籤任務頁預設顯示未完成任務，提供切換按鈕可看全部（含已完成）
- 點擊任務導航到該任務所屬的清單詳情頁

## 後端 API

### `GET /api/tags/with-counts`

取得所有標籤及每個標籤的未完成任務數。用於主頁標籤清單。

**回應：**
```json
[
  { "id": "uuid", "name": "urgent", "color": "#ef4444", "task_count": 3 },
  { "id": "uuid", "name": "work", "color": "#3b82f6", "task_count": 0 }
]
```

**SQL 邏輯：**
```sql
SELECT t.id, t.name, t.color,
  COUNT(CASE WHEN tk.completed_at IS NULL THEN 1 END) AS task_count
FROM tags t
LEFT JOIN task_tags tt ON t.id = tt.tag_id
LEFT JOIN tasks tk ON tt.task_id = tk.id
WHERE t.user_id = $1
GROUP BY t.id, t.name, t.color
ORDER BY t.name ASC
```

### `GET /api/tags/:id/tasks`

取得該標籤下的所有任務（含已完成和未完成）。

**回應：**
```json
[
  {
    "id": "uuid",
    "list_id": "uuid",
    "title": "...",
    "completed_at": null,
    "priority": 2,
    "due_date": "2026-04-05T09:00:00.000Z",
    "flagged": 0,
    "sort_order": 0,
    "created_at": "...",
    "updated_at": "..."
  }
]
```

**SQL 邏輯：**
```sql
SELECT tk.* FROM tasks tk
JOIN task_tags tt ON tk.id = tt.task_id
JOIN tags t ON tt.tag_id = t.id
WHERE t.id = $1 AND t.user_id = $2
ORDER BY tk.completed_at NULLS FIRST, tk.sort_order ASC
```

需要驗證標籤歸屬（不可查他人標籤的任務），不存在的標籤回傳 404。

## 前端

### 新增檔案

| 檔案 | 說明 |
|---|---|
| `client/src/components/tags/TagGroup.tsx` | 主頁標籤清單區塊 |
| `client/src/components/tags/TagItem.tsx` | 單一標籤行 |
| `client/src/pages/TagDetailPage.tsx` | 標籤任務頁 |

### 修改檔案

| 檔案 | 改動 |
|---|---|
| `client/src/pages/HomePage.tsx` | 加入 TagGroup，沒有標籤時不顯示 |
| `client/src/App.tsx` | 新增 `/tags/:id` 路由 |
| `client/src/hooks/use-tags.ts` | 新增 `useTagsWithCounts` 和 `useTasksByTag` hooks |

### 元件結構

```
HomePage
├── SmartListGrid
├── ListGroup
├── TagGroup（新增，無標籤時隱藏）
│   └── TagItem × N（顏色圓點 + 名稱 + 任務數 + 箭頭）
└── AddListDialog

TagDetailPage（新增）
├── 返回按鈕 + 標籤名稱（標籤顏色）
├── TaskItem × N（未完成任務）
├── 切換按鈕「顯示已完成」
└── 已完成任務（摺疊區塊，預設收起）
```

### TagGroup

- 標題：「標籤」
- 列出所有標籤，每行顯示：顏色圓點 + 名稱 + 未完成任務數 + 右箭頭
- 點擊導航到 `/tags/:id`
- 沒有任何標籤時整個元件不渲染（return null）

### TagItem

- 左側：標籤顏色圓點（同 ListItem 的圓形色塊）
- 中間：標籤名稱
- 右側：未完成任務數 + ChevronRight 圖示

### TagDetailPage

- 頂部：返回按鈕 + 標籤名稱（使用標籤顏色）
- 使用 `useTasksByTag(tagId)` 取得任務
- 前端按 `completed_at` 分成未完成/已完成兩組
- 預設只顯示未完成任務
- 提供「顯示已完成（N）」切換按鈕，展開後顯示已完成任務
- 已完成任務用刪除線 + 半透明（opacity-50），與清單詳情頁一致
- 點擊任務導航到 `/lists/:listId`（任務所屬的清單）
- 複用現有 `TaskItem` 元件

### TanStack Query Hooks

```ts
// 主頁用：取得標籤 + 任務數
useTagsWithCounts() → GET /api/tags/with-counts
  queryKey: ['tags-with-counts']

// 標籤任務頁用：取得標籤下的任務
useTasksByTag(tagId) → GET /api/tags/:id/tasks
  queryKey: ['tasks-by-tag', tagId]
```

### 快取失效策略

| 觸發操作 | 失效的 queryKey |
|---|---|
| 新增/移除任務標籤 | `['tags-with-counts']` + `['tasks-by-tag', tagId]` |
| 完成/取消完成任務 | `['tags-with-counts']` + `['tasks-by-tag']` |
| 刪除標籤 | `['tags-with-counts']` |

## 測試

| 測試 | 說明 |
|---|---|
| `GET /api/tags/with-counts` 正確計算 | 建立標籤、任務、關聯後驗證 task_count |
| `GET /api/tags/with-counts` 空標籤 | 無關聯任務的標籤 task_count = 0 |
| `GET /api/tags/with-counts` 不計已完成 | 已完成任務不計入 task_count |
| `GET /api/tags/:id/tasks` 回傳任務 | 驗證回傳正確的任務列表 |
| `GET /api/tags/:id/tasks` 含已完成 | 回傳包含未完成和已完成任務 |
| `GET /api/tags/:id/tasks` 權限隔離 | 不可查他人標籤的任務 |
| `GET /api/tags/:id/tasks` 不存在 | 不存在的標籤回傳 404 |
