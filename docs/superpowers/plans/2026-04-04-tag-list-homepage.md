# 主頁標籤清單 + 標籤任務頁 實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在主頁新增標籤清單區塊，點選標籤後顯示該標籤關聯的待辦事項。

**Architecture:** 後端新增兩個 API 端點（tags with counts、tasks by tag），前端新增 TagGroup/TagItem 元件到主頁，以及 TagDetailPage 頁面。遵循現有 SmartListPage 和 ListGroup 的設計模式。

**Tech Stack:** Express, PostgreSQL (pg), React, TanStack Query, shadcn/ui, Vitest + Supertest

**GitHub Issue:** #3

---

## File Structure

### 新增

```
server/src/services/tag.service.ts    — 新增 getWithCounts(), getTasksByTag()
server/src/routes/tags.ts             — 新增 GET /tags/with-counts, GET /tags/:id/tasks
server/tests/tag-features.test.ts     — 新功能測試（7 個案例）
client/src/components/tags/TagGroup.tsx  — 主頁標籤清單區塊
client/src/components/tags/TagItem.tsx   — 單一標籤行
client/src/pages/TagDetailPage.tsx       — 標籤任務頁
```

### 修改

```
client/src/hooks/use-tags.ts          — 新增 useTagsWithCounts(), useTasksByTag()
client/src/pages/HomePage.tsx         — 加入 TagGroup
client/src/App.tsx                    — 新增 /tags/:id 路由
```

---

## Task 1: 後端 — getWithCounts 和 getTasksByTag service 函數

**Files:**
- Modify: `server/src/services/tag.service.ts`

- [ ] **Step 1: 在 tag.service.ts 末尾新增 getWithCounts 函數**

在 `server/src/services/tag.service.ts` 檔案末尾（`getTagsForTask` 函數之後）加入：

```ts
export async function getWithCounts(userId: string): Promise<{ id: string; name: string; color: string; task_count: number }[]> {
  const db = getDb();
  const result = await db.query(
    `SELECT t.id, t.name, t.color,
      COUNT(CASE WHEN tk.completed_at IS NULL AND tk.id IS NOT NULL THEN 1 END)::int AS task_count
    FROM tags t
    LEFT JOIN task_tags tt ON t.id = tt.tag_id
    LEFT JOIN tasks tk ON tt.task_id = tk.id
    WHERE t.user_id = $1
    GROUP BY t.id, t.name, t.color
    ORDER BY t.name ASC`,
    [userId],
  );
  return result.rows;
}
```

- [ ] **Step 2: 在 tag.service.ts 末尾新增 getTasksByTag 函數**

```ts
export async function getTasksByTag(userId: string, tagId: string): Promise<Task[]> {
  const db = getDb();

  const tagResult = await db.query('SELECT id FROM tags WHERE id = $1 AND user_id = $2', [tagId, userId]);
  if (!tagResult.rows[0]) {
    throw new AppError(404, 'NOT_FOUND', 'Tag not found');
  }

  const result = await db.query<Task>(
    `SELECT tk.* FROM tasks tk
    JOIN task_tags tt ON tk.id = tt.task_id
    WHERE tt.tag_id = $1
    ORDER BY tk.completed_at NULLS FIRST, tk.sort_order ASC`,
    [tagId],
  );
  return result.rows;
}
```

注意：`Tag` 和 `Task` 型別都已在 `types.ts` 中定義，`Task` 需要在檔案頂部的 import 中加入：

```ts
import type { Tag, Task } from '../types.js';
```

（原本只 import `Tag`，需要加入 `Task`）

- [ ] **Step 3: Commit**

```bash
git add server/src/services/tag.service.ts
git commit -m "feat: add getWithCounts and getTasksByTag service functions"
```

---

## Task 2: 後端 — 新增路由

**Files:**
- Modify: `server/src/routes/tags.ts`

- [ ] **Step 1: 在 tags.ts 中新增兩個路由**

在 `router.get('/tags', ...)` 路由之後、`router.post('/tags', ...)` 路由之前，加入：

```ts
router.get('/tags/with-counts', async (req, res, next) => {
  try {
    const tags = await tagService.getWithCounts(req.userId!);
    res.json(tags);
  } catch (err) {
    next(err);
  }
});

router.get('/tags/:id/tasks', async (req, res, next) => {
  try {
    const tasks = await tagService.getTasksByTag(req.userId!, String(req.params.id));
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});
```

**重要：** `GET /tags/with-counts` 必須放在 `GET /tags/:id` 之前（如果有的話），否則 Express 會把 `with-counts` 當成 `:id` 參數。目前沒有 `GET /tags/:id` 路由，但 `PATCH /tags/:id` 和 `DELETE /tags/:id` 存在。只要放在 `router.post('/tags', ...)` 之前即可。

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/tags.ts
git commit -m "feat: add GET /tags/with-counts and GET /tags/:id/tasks routes"
```

---

## Task 3: 後端 — 測試

**Files:**
- Create: `server/tests/tag-features.test.ts`

- [ ] **Step 1: 建立 tag-features.test.ts**

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { authRequest, createTestUser, generateToken } from './helpers.js';

let token: string;
let listId: string;

beforeEach(async () => {
  const user = await createTestUser();
  token = generateToken(user.id);
  const listRes = await authRequest('post', '/api/lists', token).send({ name: 'Test List' });
  listId = listRes.body.id;
});

describe('GET /api/tags/with-counts', () => {
  it('should return tags with correct task counts', async () => {
    const tag = await authRequest('post', '/api/tags', token).send({ name: 'work' });
    const task = await authRequest('post', `/api/lists/${listId}/tasks`, token).send({ title: 'Task 1' });
    await authRequest('post', `/api/tasks/${task.body.id}/tags`, token).send({ tagId: tag.body.id });

    const res = await authRequest('get', '/api/tags/with-counts', token);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('work');
    expect(res.body[0].task_count).toBe(1);
  });

  it('should return task_count 0 for tags with no tasks', async () => {
    await authRequest('post', '/api/tags', token).send({ name: 'empty' });

    const res = await authRequest('get', '/api/tags/with-counts', token);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].task_count).toBe(0);
  });

  it('should not count completed tasks', async () => {
    const tag = await authRequest('post', '/api/tags', token).send({ name: 'mixed' });
    const t1 = await authRequest('post', `/api/lists/${listId}/tasks`, token).send({ title: 'Incomplete' });
    const t2 = await authRequest('post', `/api/lists/${listId}/tasks`, token).send({ title: 'Done' });
    await authRequest('post', `/api/tasks/${t1.body.id}/tags`, token).send({ tagId: tag.body.id });
    await authRequest('post', `/api/tasks/${t2.body.id}/tags`, token).send({ tagId: tag.body.id });
    await authRequest('patch', `/api/tasks/${t2.body.id}/complete`, token);

    const res = await authRequest('get', '/api/tags/with-counts', token);

    expect(res.body[0].task_count).toBe(1);
  });
});

describe('GET /api/tags/:id/tasks', () => {
  it('should return tasks for a tag', async () => {
    const tag = await authRequest('post', '/api/tags', token).send({ name: 'dev' });
    const task = await authRequest('post', `/api/lists/${listId}/tasks`, token).send({ title: 'Code review' });
    await authRequest('post', `/api/tasks/${task.body.id}/tags`, token).send({ tagId: tag.body.id });

    const res = await authRequest('get', `/api/tags/${tag.body.id}/tasks`, token);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Code review');
  });

  it('should return both completed and incomplete tasks', async () => {
    const tag = await authRequest('post', '/api/tags', token).send({ name: 'all' });
    const t1 = await authRequest('post', `/api/lists/${listId}/tasks`, token).send({ title: 'Open' });
    const t2 = await authRequest('post', `/api/lists/${listId}/tasks`, token).send({ title: 'Closed' });
    await authRequest('post', `/api/tasks/${t1.body.id}/tags`, token).send({ tagId: tag.body.id });
    await authRequest('post', `/api/tasks/${t2.body.id}/tags`, token).send({ tagId: tag.body.id });
    await authRequest('patch', `/api/tasks/${t2.body.id}/complete`, token);

    const res = await authRequest('get', `/api/tags/${tag.body.id}/tasks`, token);

    expect(res.body).toHaveLength(2);
    // incomplete first (NULLS FIRST ordering)
    expect(res.body[0].completed_at).toBeNull();
    expect(res.body[1].completed_at).not.toBeNull();
  });

  it('should not return tasks from other users tags', async () => {
    const other = await createTestUser({ email: 'other@example.com' });
    const otherToken = generateToken(other.id);
    const otherTag = await authRequest('post', '/api/tags', otherToken).send({ name: 'private' });

    const res = await authRequest('get', `/api/tags/${otherTag.body.id}/tasks`, token);

    expect(res.status).toBe(404);
  });

  it('should return 404 for non-existent tag', async () => {
    const res = await authRequest('get', '/api/tags/non-existent-id/tasks', token);

    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: 執行測試**

Run: `cd server && npx vitest run tests/tag-features.test.ts`
Expected: 全部 PASS（7 tests）

- [ ] **Step 3: 執行全部後端測試確保無回歸**

Run: `cd server && npx vitest run`
Expected: 全部 PASS

- [ ] **Step 4: Commit**

```bash
git add server/tests/tag-features.test.ts
git commit -m "test: add tests for tags with-counts and tasks-by-tag endpoints"
```

---

## Task 4: 前端 — TanStack Query hooks

**Files:**
- Modify: `client/src/hooks/use-tags.ts`

- [ ] **Step 1: 在 use-tags.ts 新增介面和兩個 hooks**

在檔案頂部 `Tag` 介面之後加入新介面：

```ts
interface TagWithCount {
  id: string;
  name: string;
  color: string;
  task_count: number;
}

interface Task {
  id: string;
  list_id: string;
  title: string;
  completed_at: string | null;
  priority: number;
  due_date: string | null;
  flagged: number;
  sort_order: number;
}
```

在 `useTags()` hook 之後加入兩個新 hooks：

```ts
export function useTagsWithCounts() {
  return useQuery<TagWithCount[]>({
    queryKey: ['tags-with-counts'],
    queryFn: () => api.get('/tags/with-counts').then((res) => res.data),
  });
}

export function useTasksByTag(tagId: string) {
  return useQuery<Task[]>({
    queryKey: ['tasks-by-tag', tagId],
    queryFn: () => api.get(`/tags/${tagId}/tasks`).then((res) => res.data),
    enabled: !!tagId,
  });
}
```

- [ ] **Step 2: 更新快取失效策略**

修改 `useAddTagToTask` 的 `onSuccess`，加入 `['tags-with-counts']` 失效：

```ts
export function useAddTagToTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, tagId }: { taskId: string; tagId: string }) =>
      api.post(`/tasks/${taskId}/tags`, { tagId }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['taskTags', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['tags-with-counts'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-by-tag', variables.tagId] });
    },
  });
}
```

修改 `useRemoveTagFromTask` 的 `onSuccess`，同樣加入：

```ts
export function useRemoveTagFromTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, tagId }: { taskId: string; tagId: string }) =>
      api.delete(`/tasks/${taskId}/tags/${tagId}`),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['taskTags', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['tags-with-counts'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-by-tag', variables.tagId] });
    },
  });
}
```

修改 `useDeleteTag` 的 `onSuccess`，加入 `['tags-with-counts']` 失效：

```ts
export function useDeleteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tags/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['tags-with-counts'] });
    },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/use-tags.ts
git commit -m "feat: add useTagsWithCounts and useTasksByTag hooks with cache invalidation"
```

---

## Task 5: 前端 — TagItem 和 TagGroup 元件

**Files:**
- Create: `client/src/components/tags/TagItem.tsx`
- Create: `client/src/components/tags/TagGroup.tsx`

- [ ] **Step 1: 建立 TagItem.tsx**

```tsx
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TagItemProps {
  id: string;
  name: string;
  color: string;
  taskCount: number;
}

export default function TagItem({ id, name, color, taskCount }: TagItemProps) {
  const navigate = useNavigate();

  return (
    <div
      className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-accent"
      onClick={() => navigate(`/tags/${id}`)}
    >
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full"
        style={{ backgroundColor: color + '20' }}
      >
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      </div>
      <span className="flex-1 font-medium">{name}</span>
      <span className="text-sm text-muted-foreground">{taskCount}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}
```

- [ ] **Step 2: 建立 TagGroup.tsx**

```tsx
import { useTagsWithCounts } from '@/hooks/use-tags';
import TagItem from './TagItem';

export default function TagGroup() {
  const { data: tags = [] } = useTagsWithCounts();

  if (tags.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <h2 className="mb-2 text-lg font-semibold">標籤</h2>
      <div className="divide-y rounded-lg border">
        {tags.map((tag) => (
          <TagItem
            key={tag.id}
            id={tag.id}
            name={tag.name}
            color={tag.color}
            taskCount={tag.task_count}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/tags/TagItem.tsx client/src/components/tags/TagGroup.tsx
git commit -m "feat: add TagItem and TagGroup components for homepage"
```

---

## Task 6: 前端 — TagDetailPage

**Files:**
- Create: `client/src/pages/TagDetailPage.tsx`

- [ ] **Step 1: 建立 TagDetailPage.tsx**

```tsx
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import TaskItem from '@/components/tasks/TaskItem';
import { Button } from '@/components/ui/button';
import { useTagsWithCounts, useTasksByTag } from '@/hooks/use-tags';

export default function TagDetailPage() {
  const { id: tagId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: tags = [] } = useTagsWithCounts();
  const { data: tasks = [], isLoading } = useTasksByTag(tagId!);
  const [showCompleted, setShowCompleted] = useState(false);

  const tag = tags.find((t) => t.id === tagId);

  if (!tag && !isLoading) {
    return <div className="p-8 text-center text-muted-foreground">標籤不存在</div>;
  }

  const incompleteTasks = tasks.filter((t) => !t.completed_at);
  const completedTasks = tasks.filter((t) => t.completed_at);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-bold" style={{ color: tag?.color }}>
          {tag?.name}
        </h2>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8 text-muted-foreground">載入中...</div>
      ) : incompleteTasks.length === 0 && completedTasks.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">沒有任務</p>
      ) : (
        <>
          {incompleteTasks.length > 0 && (
            <div className="divide-y rounded-lg border">
              {incompleteTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  id={task.id}
                  title={task.title}
                  completed={false}
                  priority={task.priority}
                  dueDate={task.due_date}
                  flagged={task.flagged === 1}
                  color={tag?.color || '#6b7280'}
                  onToggleComplete={() => navigate(`/lists/${task.list_id}`)}
                  onClick={() => navigate(`/lists/${task.list_id}`)}
                />
              ))}
            </div>
          )}

          {completedTasks.length > 0 && (
            <div className="mt-4">
              <button
                className="flex items-center gap-1 text-sm text-muted-foreground mb-2"
                onClick={() => setShowCompleted(!showCompleted)}
              >
                {showCompleted ? '\u25BC' : '\u25B6'} 已完成（{completedTasks.length}）
              </button>
              {showCompleted && (
                <div className="divide-y rounded-lg border">
                  {completedTasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      id={task.id}
                      title={task.title}
                      completed={true}
                      priority={task.priority}
                      dueDate={task.due_date}
                      flagged={task.flagged === 1}
                      color={tag?.color || '#6b7280'}
                      onToggleComplete={() => navigate(`/lists/${task.list_id}`)}
                      onClick={() => navigate(`/lists/${task.list_id}`)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/TagDetailPage.tsx
git commit -m "feat: add TagDetailPage with completed tasks toggle"
```

---

## Task 7: 前端 — 整合到 HomePage 和 App 路由

**Files:**
- Modify: `client/src/pages/HomePage.tsx`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: 更新 HomePage.tsx 加入 TagGroup**

在 `AddListDialog` 之前加入 `TagGroup`：

```tsx
import AddListDialog from '@/components/lists/AddListDialog';
import ListGroup from '@/components/lists/ListGroup';
import SmartListGrid from '@/components/lists/SmartListGrid';
import TagGroup from '@/components/tags/TagGroup';
import { useSmartListCounts } from '@/hooks/use-all-tasks';
import { useLists } from '@/hooks/use-lists';

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
      <TagGroup />
      <AddListDialog />
    </div>
  );
}
```

- [ ] **Step 2: 更新 App.tsx 新增 /tags/:id 路由**

在 import 區塊加入：
```tsx
import TagDetailPage from '@/pages/TagDetailPage';
```

在 Routes 中 `<Route path="/settings" ...>` 之前加入：
```tsx
<Route path="/tags/:id" element={<TagDetailPage />} />
```

完整的 Routes 區塊：
```tsx
<Route path="/" element={<HomePage />} />
<Route path="/lists/:id" element={<ListDetailPage />} />
<Route path="/smart/:type" element={<SmartListPage />} />
<Route path="/tags/:id" element={<TagDetailPage />} />
<Route path="/settings" element={<SettingsPage />} />
```

- [ ] **Step 3: 驗證 TypeScript 編譯**

Run: `cd client && npx tsc --noEmit`
Expected: 無錯誤

- [ ] **Step 4: 驗證前端 build**

Run: `cd client && npm run build`
Expected: 成功

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/HomePage.tsx client/src/App.tsx
git commit -m "feat: integrate TagGroup into homepage and add /tags/:id route"
```

---

## Task 8: 最終驗證

- [ ] **Step 1: 執行所有後端測試**

Run: `cd server && npx vitest run`
Expected: 全部 PASS（包含新增的 7 個 tag-features 測試）

- [ ] **Step 2: TypeScript 編譯檢查**

Run: `cd client && npx tsc --noEmit`
Expected: 無錯誤

- [ ] **Step 3: 前端 build**

Run: `cd client && npm run build`
Expected: 成功

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: tag list homepage feature verified (closes #3)"
```
