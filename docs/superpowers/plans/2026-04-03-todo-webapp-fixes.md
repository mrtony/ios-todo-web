# iOS 風格待辦事項 WebApp — 修復計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修復程式碼審查中發現的所有 Bug、補齊缺失功能、改善效能與 UX。

**Architecture:** 修改現有 server/ 和 client/ 程式碼，不改變整體架構。

**Tech Stack:** 同主計畫 — Vite, React, TypeScript, shadcn/ui, TanStack Query, Express, better-sqlite3

**設計規格參考：** `docs/superpowers/specs/2026-04-03-todo-webapp-design.md`

---

## Fix 1: 通知 title 欄位遺漏（Critical Bug）

**問題：** `useAllTasks` 回傳的 Task 介面缺少 `title` 欄位，瀏覽器通知只會顯示「未命名任務」。

**Files:**
- Modify: `client/src/hooks/use-all-tasks.ts`
- Modify: `client/src/hooks/use-notifications.ts`

- [ ] **Step 1: 更新 use-all-tasks.ts 的 Task 介面**

在 `client/src/hooks/use-all-tasks.ts` 中，找到 Task 介面，加入 `title` 欄位：

```ts
interface Task {
  id: string;
  list_id: string;
  title: string;
  completed_at: string | null;
  flagged: number;
  due_date: string | null;
}
```

- [ ] **Step 2: 更新 use-notifications.ts 移除多餘的 NotificationTask 型別**

在 `client/src/hooks/use-notifications.ts` 中，直接使用 `useAllTasks` 回傳的資料，不要另外定義 `NotificationTask`。確保通知文字直接使用 `task.title`：

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

        if (diffMin > 0 && diffMin <= 15) {
          new Notification('待辦事項提醒', {
            body: `「${task.title}」即將到期`,
            icon: '/favicon.ico',
          });
          notifiedRef.current.add(task.id);
        }

        if (diffMin <= 0 && diffMin > -1) {
          new Notification('待辦事項已到期', {
            body: `「${task.title}」已過期`,
            icon: '/favicon.ico',
          });
          notifiedRef.current.add(task.id);
        }
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [tasks]);
}
```

- [ ] **Step 3: 驗證**

Run: `cd client && npx tsc --noEmit`
Expected: 無 TypeScript 錯誤

- [ ] **Step 4: Commit**

```bash
git add client/src/hooks/use-all-tasks.ts client/src/hooks/use-notifications.ts
git commit -m "fix: add title field to Task interface for notifications"
```

---

## Fix 2: TaskDetailSheet handleSave 不等待 mutation（Critical Bug）

**問題：** `handleSave` 呼叫 `mutate()` 後立即關閉 Sheet，若 mutation 失敗使用者看不到錯誤。

**Files:**
- Modify: `client/src/components/tasks/TaskDetailSheet.tsx`

- [ ] **Step 1: 修改 handleSave 使用 onSuccess/onError callback**

找到 `handleSave` 函數，將 `onOpenChange(false)` 移到 `onSuccess` callback 中，並加入 error state：

在元件頂層加入 error state：
```ts
const [error, setError] = useState('');
```

修改 `handleSave`：
```ts
const handleSave = () => {
  setError('');
  updateTask.mutate(
    {
      id: taskId,
      title,
      notes,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      priority,
      flagged,
    },
    {
      onSuccess: () => onOpenChange(false),
      onError: (err: any) => {
        setError(err.response?.data?.error?.message || '儲存失敗');
      },
    },
  );
};
```

同樣修改 `handleDelete`：
```ts
const handleDelete = () => {
  deleteTask.mutate(taskId, {
    onSuccess: () => onOpenChange(false),
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || '刪除失敗');
    },
  });
};
```

在儲存按鈕上方加入 error 顯示：
```tsx
{error && <p className="text-sm text-destructive">{error}</p>}
```

也把儲存按鈕加上 loading 狀態：
```tsx
<Button onClick={handleSave} className="flex-1" disabled={updateTask.isPending}>
  {updateTask.isPending ? '儲存中...' : '儲存'}
</Button>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/tasks/TaskDetailSheet.tsx
git commit -m "fix: wait for mutation completion before closing TaskDetailSheet"
```

---

## Fix 3: 子任務 N+1 查詢問題（Critical Bug）

**問題：** 每個任務各發一個 API 請求取子任務，50 個任務 = 50 個額外請求。

**解法：** 在後端 `GET /api/lists/:listId/tasks` 時一併回傳子任務，前端按 `parent_id` 分組。

**Files:**
- Modify: `server/src/services/task.service.ts`
- Modify: `server/src/routes/tasks.ts`
- Modify: `client/src/hooks/use-tasks.ts`
- Modify: `client/src/components/tasks/TaskList.tsx`
- Modify: `server/tests/tasks.test.ts`

- [ ] **Step 1: 修改後端 getByList 回傳所有任務（含子任務）**

在 `server/src/services/task.service.ts` 中，新增一個函數：

```ts
export function getByListWithSubtasks(userId: string, listId: string): { tasks: Task[]; subtasks: Record<string, Task[]> } {
  verifyListOwnership(userId, listId);
  const db = getDb();

  const allTasks = db.prepare('SELECT * FROM tasks WHERE list_id = ? ORDER BY sort_order ASC').all(listId) as Task[];

  const tasks: Task[] = [];
  const subtasks: Record<string, Task[]> = {};

  for (const task of allTasks) {
    if (task.parent_id === null) {
      tasks.push(task);
    } else {
      if (!subtasks[task.parent_id]) {
        subtasks[task.parent_id] = [];
      }
      subtasks[task.parent_id].push(task);
    }
  }

  return { tasks, subtasks };
}
```

- [ ] **Step 2: 更新路由使用新函數**

在 `server/src/routes/tasks.ts` 中，修改 `GET /lists/:listId/tasks`：

```ts
router.get('/lists/:listId/tasks', (req, res, next) => {
  try {
    const result = taskService.getByListWithSubtasks(req.userId!, req.params.listId);
    res.json(result);
  } catch (err) { next(err); }
});
```

- [ ] **Step 3: 更新前端 useTasks hook**

在 `client/src/hooks/use-tasks.ts` 中，修改 `useTasks` 的回傳型別：

```ts
interface TasksResponse {
  tasks: Task[];
  subtasks: Record<string, Task[]>;
}

export function useTasks(listId: string) {
  return useQuery<TasksResponse>({
    queryKey: ['tasks', listId],
    queryFn: () => api.get(`/lists/${listId}/tasks`).then((res) => res.data),
    enabled: !!listId,
  });
}
```

移除 `useSubtasks` hook（不再需要單獨請求子任務）。但保留 `GET /api/tasks/:parentId/subtasks` 路由不動，以備其他用途。

- [ ] **Step 4: 更新 TaskList.tsx 使用內嵌子任務資料**

修改 `TaskList.tsx`，從 props 接收 subtasks map 而非每個任務各自呼叫 `useSubtasks`：

```tsx
import TaskItem from './TaskItem';
import SubtaskItem from './SubtaskItem';
import { useCompleteTask, useUncompleteTask, useReorderTasks } from '@/hooks/use-tasks';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

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
  subtasks: Record<string, Task[]>;
  listId: string;
  listColor: string;
  onTaskClick: (taskId: string) => void;
}

function SortableTask({ task, taskSubtasks, listId, listColor, onTaskClick }: {
  task: Task; taskSubtasks: Task[]; listId: string; listColor: string; onTaskClick: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
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
      {taskSubtasks.map((sub) => (
        <SubtaskItem
          key={sub.id} id={sub.id} title={sub.title}
          completed={sub.completed_at !== null} color={listColor}
          onToggleComplete={(id) => handleToggle(id, sub.completed_at !== null)}
        />
      ))}
    </div>
  );
}

export default function TaskList({ tasks, subtasks, listId, listColor, onTaskClick }: TaskListProps) {
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
            <SortableTask
              key={task.id}
              task={task}
              taskSubtasks={subtasks[task.id] || []}
              listId={listId}
              listColor={listColor}
              onTaskClick={onTaskClick}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
```

- [ ] **Step 5: 更新 ListDetailPage.tsx 適配新的 useTasks 回傳結構**

`useTasks` 現在回傳 `{ tasks, subtasks }` 而非直接的 tasks 陣列。更新 `ListDetailPage.tsx`：

```tsx
const { data, isLoading } = useTasks(listId!);
const tasks = data?.tasks ?? [];
const subtasks = data?.subtasks ?? {};
```

把 `<TaskList>` 的 props 加上 `subtasks`：

```tsx
<TaskList
  tasks={tasks}
  subtasks={subtasks}
  listId={listId!}
  listColor={list?.color || '#3b82f6'}
  onTaskClick={setSelectedTaskId}
/>
```

- [ ] **Step 6: 更新 TaskDetailSheet 中的子任務取得方式**

`TaskDetailSheet.tsx` 也需要改為從父元件傳入子任務，而非使用 `useSubtasks`。

在 `TaskDetailSheet` 的 props 加入 `subtasks`：

```ts
interface TaskDetailSheetProps {
  taskId: string;
  listId: string;
  task: Task;
  subtasks: Task[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

移除 `const { data: subtasks = [] } = useSubtasks(taskId);`，改為直接使用 props 中的 `subtasks`。

在 `ListDetailPage.tsx` 中傳入子任務：

```tsx
{selectedTaskId && (
  <TaskDetailSheet
    taskId={selectedTaskId}
    listId={listId!}
    task={tasks.find((t) => t.id === selectedTaskId)!}
    subtasks={subtasks[selectedTaskId] || []}
    open={!!selectedTaskId}
    onOpenChange={(open) => !open && setSelectedTaskId(null)}
  />
)}
```

- [ ] **Step 7: 更新後端測試 server/tests/tasks.test.ts**

`GET /api/lists/:listId/tasks` 的回傳結構從陣列改為 `{ tasks, subtasks }`。更新所有相關測試：

```ts
describe('GET /api/lists/:listId/tasks', () => {
  it('should return tasks and subtasks', async () => {
    await authRequest('post', `/api/lists/${listId}/tasks`, token).send({ title: 'First' });
    await authRequest('post', `/api/lists/${listId}/tasks`, token).send({ title: 'Second' });

    const res = await authRequest('get', `/api/lists/${listId}/tasks`, token);

    expect(res.body.tasks).toHaveLength(2);
    expect(res.body.tasks[0].title).toBe('First');
    expect(res.body.subtasks).toBeDefined();
  });

  it('should include subtasks grouped by parent_id', async () => {
    const parent = await authRequest('post', `/api/lists/${listId}/tasks`, token).send({ title: 'Parent' });
    await authRequest('post', `/api/tasks/${parent.body.id}/subtasks`, token).send({ title: 'Child' });

    const res = await authRequest('get', `/api/lists/${listId}/tasks`, token);
    expect(res.body.tasks).toHaveLength(1);
    expect(res.body.subtasks[parent.body.id]).toHaveLength(1);
    expect(res.body.subtasks[parent.body.id][0].title).toBe('Child');
  });
});
```

也要更新所有其他用到 `GET /api/lists/:listId/tasks` 的測試（例如 reorder 測試），把 `res.body` 改為 `res.body.tasks`。

- [ ] **Step 8: 執行後端測試**

Run: `cd server && npx vitest run`
Expected: 全部 PASS

- [ ] **Step 9: Commit**

```bash
git add server/src/services/task.service.ts server/src/routes/tasks.ts server/tests/tasks.test.ts client/src/hooks/use-tasks.ts client/src/components/tasks/TaskList.tsx client/src/components/tasks/TaskDetailSheet.tsx client/src/pages/ListDetailPage.tsx
git commit -m "fix: resolve subtask N+1 query by returning subtasks inline with tasks"
```

---

## Fix 4: 刪除清單增加確認對話框（Critical Bug）

**Files:**
- Modify: `client/src/pages/ListDetailPage.tsx`

- [ ] **Step 1: 加入確認對話框**

在 `ListDetailPage.tsx` 中加入 AlertDialog（若尚未安裝，先安裝）：

Run: `cd client && npx shadcn@latest add alert-dialog`

然後在 `handleDeleteList` 前加入 state 和 AlertDialog：

```tsx
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

// 在元件內加入：
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

const handleDeleteList = () => {
  if (!listId) return;
  deleteList.mutate(listId, {
    onSuccess: () => navigate('/'),
  });
};
```

在 DropdownMenuItem 中改為開啟確認框而非直接刪除：

```tsx
<DropdownMenuItem className="text-destructive" onClick={() => setShowDeleteConfirm(true)}>
  <Trash2 className="mr-2 h-4 w-4" />
  刪除清單
</DropdownMenuItem>
```

在元件 JSX 底部加入 AlertDialog：

```tsx
<AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>確認刪除清單？</AlertDialogTitle>
      <AlertDialogDescription>
        這會同時刪除清單中的所有任務，此操作無法復原。
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>取消</AlertDialogCancel>
      <AlertDialogAction onClick={handleDeleteList} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
        刪除
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/ListDetailPage.tsx client/src/components/ui/alert-dialog.tsx
git commit -m "fix: add confirmation dialog before deleting a list"
```

---

## Fix 5: 標籤 UI（功能缺失）

**問題：** 標籤 hooks 已完整，但前端無任何標籤管理和標籤指派 UI。

**Files:**
- Create: `client/src/components/tasks/TagSelector.tsx`
- Modify: `client/src/components/tasks/TaskDetailSheet.tsx`
- Modify: `client/src/components/tasks/TaskItem.tsx`
- Create: `client/src/components/settings/TagManager.tsx`
- Modify: `client/src/pages/SettingsPage.tsx`

- [ ] **Step 1: 建立 TagSelector 元件**

此元件用於 TaskDetailSheet 中，讓使用者為任務選擇/移除標籤：

```tsx
// client/src/components/tasks/TagSelector.tsx
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTags, useCreateTag, useAddTagToTask, useRemoveTagFromTask } from '@/hooks/use-tags';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagSelectorProps {
  taskId: string;
  assignedTags: Tag[];
}

export default function TagSelector({ taskId, assignedTags }: TagSelectorProps) {
  const { data: allTags = [] } = useTags();
  const createTag = useCreateTag();
  const addTag = useAddTagToTask();
  const removeTag = useRemoveTagFromTask();
  const [newTagName, setNewTagName] = useState('');
  const [open, setOpen] = useState(false);

  const assignedIds = new Set(assignedTags.map((t) => t.id));
  const availableTags = allTags.filter((t) => !assignedIds.has(t.id));

  const handleAddTag = (tagId: string) => {
    addTag.mutate({ taskId, tagId });
  };

  const handleRemoveTag = (tagId: string) => {
    removeTag.mutate({ taskId, tagId });
  };

  const handleCreateAndAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    createTag.mutate(
      { name: newTagName.trim() },
      {
        onSuccess: (tag: Tag) => {
          addTag.mutate({ taskId, tagId: tag.id });
          setNewTagName('');
        },
      },
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {assignedTags.map((tag) => (
          <Badge key={tag.id} variant="secondary" style={{ backgroundColor: tag.color + '20', color: tag.color }}>
            {tag.name}
            <button className="ml-1" onClick={() => handleRemoveTag(tag.id)}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Plus className="mr-1 h-3 w-3" /> 新增標籤
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-60 p-2">
          {availableTags.length > 0 && (
            <div className="mb-2 max-h-32 overflow-y-auto">
              {availableTags.map((tag) => (
                <button
                  key={tag.id}
                  className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent"
                  onClick={() => { handleAddTag(tag.id); setOpen(false); }}
                >
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
                  {tag.name}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={handleCreateAndAdd} className="flex gap-1">
            <Input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="新標籤名稱..."
              className="h-8 text-sm"
            />
            <Button type="submit" size="sm" variant="ghost" disabled={!newTagName.trim()}>
              <Plus className="h-3 w-3" />
            </Button>
          </form>
        </PopoverContent>
      </Popover>
    </div>
  );
}
```

安裝所需元件（如果尚未安裝）：
Run: `cd client && npx shadcn@latest add popover`

- [ ] **Step 2: 在 TaskDetailSheet 加入 TagSelector**

需要取得任務的標籤。新增一個 hook 或透過 API 取得。

在 `client/src/hooks/use-tags.ts` 中加入：

```ts
export function useTaskTags(taskId: string) {
  return useQuery<Tag[]>({
    queryKey: ['taskTags', taskId],
    queryFn: () => api.get(`/tasks/${taskId}/tags`).then((res) => res.data),
    enabled: !!taskId,
  });
}
```

需要後端新增路由 `GET /api/tasks/:id/tags`。在 `server/src/routes/tags.ts` 加入：

```ts
router.get('/tasks/:id/tags', (req, res, next) => {
  try {
    const tags = tagService.getTagsForTask(req.userId!, req.params.id);
    res.json(tags);
  } catch (err) { next(err); }
});
```

然後在 `TaskDetailSheet.tsx` 中引入並使用：

```tsx
import TagSelector from './TagSelector';
import { useTaskTags } from '@/hooks/use-tags';

// 在元件內：
const { data: taskTags = [] } = useTaskTags(taskId);

// 在子任務區塊之前加入：
<Separator />
<div className="space-y-2">
  <Label>標籤</Label>
  <TagSelector taskId={taskId} assignedTags={taskTags} />
</div>
```

- [ ] **Step 3: 在 TaskItem 顯示標籤**

修改 `client/src/components/tasks/TaskItem.tsx`，在 props 加入 `tags`：

```ts
interface TaskItemProps {
  id: string;
  title: string;
  completed: boolean;
  priority: number;
  dueDate: string | null;
  flagged: boolean;
  color: string;
  tags?: { name: string; color: string }[];
  onToggleComplete: (id: string) => void;
  onClick: (id: string) => void;
}
```

在 priority badge 和 flagged badge 之後渲染標籤：

```tsx
{tags?.map((tag) => (
  <Badge key={tag.name} variant="secondary" className="text-xs" style={{ backgroundColor: tag.color + '20', color: tag.color }}>
    {tag.name}
  </Badge>
))}
```

注意：由於 N+1 修復後我們不在 TaskList 層級取得標籤，標籤顯示可以透過擴展 `GET /api/lists/:listId/tasks` 回傳或延遲至點擊時載入。**簡單做法：在 `getByListWithSubtasks` 中 JOIN task_tags + tags 一併回傳。**

在 `server/src/services/task.service.ts` 的 `getByListWithSubtasks` 中，加入標籤查詢：

```ts
export function getByListWithSubtasks(userId: string, listId: string) {
  verifyListOwnership(userId, listId);
  const db = getDb();

  const allTasks = db.prepare('SELECT * FROM tasks WHERE list_id = ? ORDER BY sort_order ASC').all(listId) as Task[];

  // 一次查詢所有任務的標籤
  const taskIds = allTasks.map(t => t.id);
  const tagMap: Record<string, { name: string; color: string }[]> = {};

  if (taskIds.length > 0) {
    const placeholders = taskIds.map(() => '?').join(',');
    const rows = db.prepare(`
      SELECT tt.task_id, t.name, t.color
      FROM task_tags tt JOIN tags t ON tt.tag_id = t.id
      WHERE tt.task_id IN (${placeholders})
      ORDER BY t.name ASC
    `).all(...taskIds) as { task_id: string; name: string; color: string }[];

    for (const row of rows) {
      if (!tagMap[row.task_id]) tagMap[row.task_id] = [];
      tagMap[row.task_id].push({ name: row.name, color: row.color });
    }
  }

  const tasks: (Task & { tags: { name: string; color: string }[] })[] = [];
  const subtasks: Record<string, (Task & { tags: { name: string; color: string }[] })[]> = {};

  for (const task of allTasks) {
    const enriched = { ...task, tags: tagMap[task.id] || [] };
    if (task.parent_id === null) {
      tasks.push(enriched);
    } else {
      if (!subtasks[task.parent_id]) subtasks[task.parent_id] = [];
      subtasks[task.parent_id].push(enriched);
    }
  }

  return { tasks, subtasks };
}
```

前端 TaskItem 接收 `tags` prop，由 TaskList 從 task 物件中取出傳入。

- [ ] **Step 4: 建立 TagManager 元件（設定頁面）**

```tsx
// client/src/components/settings/TagManager.tsx
import { useState } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from '@/hooks/use-tags';

export default function TagManager() {
  const { data: tags = [] } = useTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    createTag.mutate({ name: newName.trim() });
    setNewName('');
  };

  const handleUpdate = (id: string) => {
    if (!editName.trim()) return;
    updateTag.mutate({ id, name: editName.trim() });
    setEditingId(null);
  };

  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-medium mb-3">標籤管理</h3>
      <div className="space-y-2 mb-3">
        {tags.map((tag) => (
          <div key={tag.id} className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
            {editingId === tag.id ? (
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => handleUpdate(tag.id)}
                onKeyDown={(e) => e.key === 'Enter' && handleUpdate(tag.id)}
                className="h-7 text-sm flex-1"
                autoFocus
              />
            ) : (
              <span className="flex-1 text-sm">{tag.name}</span>
            )}
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => { setEditingId(tag.id); setEditName(tag.name); }}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost" size="icon" className="h-7 w-7 text-destructive"
              onClick={() => deleteTag.mutate(tag.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        {tags.length === 0 && (
          <p className="text-sm text-muted-foreground">還沒有標籤</p>
        )}
      </div>
      <form onSubmit={handleCreate} className="flex gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="新增標籤..."
          className="flex-1"
        />
        <Button type="submit" size="sm" disabled={!newName.trim()}>
          <Plus className="mr-1 h-3 w-3" /> 新增
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 5: 在 SettingsPage 加入 TagManager**

```tsx
import TagManager from '@/components/settings/TagManager';

// 在 ThemeToggle 之後加入：
<TagManager />
```

- [ ] **Step 6: 執行後端測試**

Run: `cd server && npx vitest run`
Expected: 全部 PASS

- [ ] **Step 7: Commit**

```bash
git add client/src/components/tasks/TagSelector.tsx client/src/components/tasks/TaskDetailSheet.tsx client/src/components/tasks/TaskItem.tsx client/src/components/tasks/TaskList.tsx client/src/components/settings/TagManager.tsx client/src/pages/SettingsPage.tsx client/src/hooks/use-tags.ts server/src/routes/tags.ts server/src/services/task.service.ts
git commit -m "feat: add tag UI - selector in task detail, display in task list, manager in settings"
```

---

## Fix 6: 重複任務 UI（功能缺失）

**Files:**
- Modify: `client/src/components/tasks/TaskDetailSheet.tsx`

- [ ] **Step 1: 在 TaskDetailSheet 加入重複任務設定**

在 flagged checkbox 之後、Separator 之前，加入重複任務選擇器：

```tsx
<div className="space-y-2">
  <Label>重複</Label>
  <select
    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
    value={recurrence}
    onChange={(e) => setRecurrence(e.target.value)}
  >
    <option value="">不重複</option>
    <option value='{"type":"daily","interval":1}'>每天</option>
    <option value='{"type":"weekly","interval":1}'>每週</option>
    <option value='{"type":"monthly","interval":1}'>每月</option>
  </select>
</div>
```

在元件頂層加入 state：
```ts
const [recurrence, setRecurrence] = useState(task.recurrence || '');
```

在 `useEffect` 中同步：
```ts
setRecurrence(task.recurrence || '');
```

在 `handleSave` 的 mutate data 中加入：
```ts
recurrence: recurrence || null,
```

同時需要更新 `useUpdateTask` hook 讓它支援 `recurrence` 欄位（檢查是否已支援，如果 `updateTaskSchema` 已包含 `recurrence` 則不需修改）。

- [ ] **Step 2: Commit**

```bash
git add client/src/components/tasks/TaskDetailSheet.tsx
git commit -m "feat: add recurrence selector UI in task detail sheet"
```

---

## Fix 7: 清單圖示選擇器（功能缺失）

**Files:**
- Modify: `client/src/components/lists/AddListDialog.tsx`
- Modify: `client/src/components/lists/ListItem.tsx`

- [ ] **Step 1: 在 AddListDialog 加入圖示選擇器**

定義圖示對應 map（使用 lucide-react icon）：

```tsx
import { List, ShoppingCart, Home, Briefcase, Heart, Star, Flag, Bookmark } from 'lucide-react';

const ICONS = [
  { value: 'list', icon: List },
  { value: 'cart', icon: ShoppingCart },
  { value: 'home', icon: Home },
  { value: 'briefcase', icon: Briefcase },
  { value: 'heart', icon: Heart },
  { value: 'star', icon: Star },
  { value: 'flag', icon: Flag },
  { value: 'bookmark', icon: Bookmark },
] as const;
```

在顏色選擇器下方加入圖示選擇器：

```tsx
const [icon, setIcon] = useState('list');

// JSX:
<div className="space-y-2">
  <Label>圖示</Label>
  <div className="flex gap-2">
    {ICONS.map(({ value, icon: Icon }) => (
      <button
        key={value}
        type="button"
        className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${icon === value ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-accent'}`}
        onClick={() => setIcon(value)}
      >
        <Icon className="h-4 w-4" />
      </button>
    ))}
  </div>
</div>
```

在 `createList.mutate` 中傳入 `icon`：
```ts
createList.mutate({ name: name.trim(), color, icon }, { ... });
```

- [ ] **Step 2: 更新 ListItem 顯示圖示**

```tsx
import { List, ShoppingCart, Home, Briefcase, Heart, Star, Flag, Bookmark, type LucideIcon } from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  list: List,
  cart: ShoppingCart,
  home: Home,
  briefcase: Briefcase,
  heart: Heart,
  star: Star,
  flag: Flag,
  bookmark: Bookmark,
};

// 在 props 加入 icon:
interface ListItemProps {
  id: string;
  name: string;
  color: string;
  icon: string;
  taskCount: number;
}

// 在 JSX 中取代 ● 為實際圖示：
const IconComponent = ICON_MAP[icon] || List;

<div
  className="flex h-8 w-8 items-center justify-center rounded-full text-white"
  style={{ backgroundColor: color }}
>
  <IconComponent className="h-4 w-4" />
</div>
```

同時更新 `ListGroup.tsx` 傳入 `icon` prop：
```tsx
<ListItem key={list.id} id={list.id} name={list.name} color={list.color} icon={list.icon} taskCount={taskCounts[list.id] || 0} />
```

ListGroup 的 List 介面需加入 `icon: string`。

- [ ] **Step 3: Commit**

```bash
git add client/src/components/lists/AddListDialog.tsx client/src/components/lists/ListItem.tsx client/src/components/lists/ListGroup.tsx
git commit -m "feat: add icon selector for lists and display icons in list items"
```

---

## Fix 8: 智慧清單點擊導航（功能缺失）

**問題：** 智慧清單卡片有 cursor-pointer 但無 onClick 處理。

**解法：** 建立一個虛擬的智慧清單路由 `/smart/:type`，前端根據 type 篩選顯示任務。

**Files:**
- Create: `client/src/pages/SmartListPage.tsx`
- Modify: `client/src/components/lists/SmartListGrid.tsx`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: 建立 SmartListPage**

```tsx
// client/src/pages/SmartListPage.tsx
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAllTasks } from '@/hooks/use-all-tasks';
import { useCompleteTask, useUncompleteTask } from '@/hooks/use-tasks';
import TaskItem from '@/components/tasks/TaskItem';

const SMART_LIST_CONFIG: Record<string, { title: string; color: string }> = {
  today: { title: '今天', color: '#3b82f6' },
  scheduled: { title: '已排程', color: '#f97316' },
  all: { title: '全部', color: '#8b5cf6' },
  flagged: { title: '已標記', color: '#ef4444' },
};

export default function SmartListPage() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { data: allTasks = [] } = useAllTasks();

  const config = SMART_LIST_CONFIG[type || ''];
  if (!config) return <div className="p-8 text-center">不存在的清單</div>;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  const incomplete = allTasks.filter((t) => !t.completed_at);

  let filtered = incomplete;
  switch (type) {
    case 'today':
      filtered = incomplete.filter((t) => t.due_date && t.due_date >= todayStart && t.due_date < todayEnd);
      break;
    case 'scheduled':
      filtered = incomplete.filter((t) => t.due_date);
      break;
    case 'flagged':
      filtered = incomplete.filter((t) => t.flagged === 1);
      break;
    case 'all':
    default:
      filtered = incomplete;
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-xl font-bold" style={{ color: config.color }}>
          {config.title}
        </h2>
      </div>
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">沒有任務</p>
      ) : (
        <div className="divide-y rounded-lg border">
          {filtered.map((task) => (
            <TaskItem
              key={task.id}
              id={task.id}
              title={task.title}
              completed={false}
              priority={task.priority || 0}
              dueDate={task.due_date}
              flagged={task.flagged === 1}
              color={config.color}
              onToggleComplete={() => {}}
              onClick={() => navigate(`/lists/${task.list_id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

注意：`useAllTasks` 回傳的 Task 介面需要補上 `priority` 和 `title` 欄位（Fix 1 已加 title，這裡需要確保 priority 也在）。

更新 `client/src/hooks/use-all-tasks.ts` 的 Task 介面：

```ts
interface Task {
  id: string;
  list_id: string;
  title: string;
  completed_at: string | null;
  flagged: number;
  due_date: string | null;
  priority: number;
}
```

- [ ] **Step 2: 更新 SmartListGrid 加入導航**

```tsx
import { useNavigate } from 'react-router-dom';

// 在元件內：
const navigate = useNavigate();

// 在卡片 div 加入 onClick：
<div
  key={key}
  className={`${color} rounded-xl p-4 text-white cursor-pointer hover:opacity-90 transition-opacity`}
  onClick={() => navigate(`/smart/${key}`)}
>
```

- [ ] **Step 3: 在 App.tsx 加入路由**

```tsx
import SmartListPage from '@/pages/SmartListPage';

// 在 Routes 中加入：
<Route path="/smart/:type" element={<SmartListPage />} />
```

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/SmartListPage.tsx client/src/components/lists/SmartListGrid.tsx client/src/App.tsx client/src/hooks/use-all-tasks.ts
git commit -m "feat: add smart list navigation and smart list page"
```

---

## Fix 9: Optimistic Updates（效能改善）

**Files:**
- Modify: `client/src/hooks/use-tasks.ts`
- Modify: `client/src/hooks/use-lists.ts`

- [ ] **Step 1: 為 useCompleteTask / useUncompleteTask 加入 optimistic update**

在 `client/src/hooks/use-tasks.ts` 中修改：

```ts
export function useCompleteTask(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/tasks/${id}/complete`).then((res) => res.data),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', listId] });
      const previous = queryClient.getQueryData<TasksResponse>(['tasks', listId]);

      queryClient.setQueryData<TasksResponse>(['tasks', listId], (old) => {
        if (!old) return old;
        return {
          ...old,
          tasks: old.tasks.map((t) =>
            t.id === id ? { ...t, completed_at: new Date().toISOString() } : t
          ),
        };
      });

      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['tasks', listId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', listId] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'all'] });
    },
  });
}

export function useUncompleteTask(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch(`/tasks/${id}/uncomplete`).then((res) => res.data),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', listId] });
      const previous = queryClient.getQueryData<TasksResponse>(['tasks', listId]);

      queryClient.setQueryData<TasksResponse>(['tasks', listId], (old) => {
        if (!old) return old;
        return {
          ...old,
          tasks: old.tasks.map((t) =>
            t.id === id ? { ...t, completed_at: null } : t
          ),
        };
      });

      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['tasks', listId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', listId] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'all'] });
    },
  });
}
```

- [ ] **Step 2: 為 useReorderLists / useReorderTasks 加入 optimistic update**

在 `client/src/hooks/use-lists.ts` 中：

```ts
export function useReorderLists() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) =>
      api.patch('/lists/reorder', { orderedIds }),
    onMutate: async (orderedIds: string[]) => {
      await queryClient.cancelQueries({ queryKey: ['lists'] });
      const previous = queryClient.getQueryData<List[]>(['lists']);

      queryClient.setQueryData<List[]>(['lists'], (old) => {
        if (!old) return old;
        const map = new Map(old.map((l) => [l.id, l]));
        return orderedIds.map((id, i) => ({ ...map.get(id)!, sort_order: i }));
      });

      return { previous };
    },
    onError: (_err, _ids, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['lists'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });
}
```

同樣在 `use-tasks.ts` 中更新 `useReorderTasks`：

```ts
export function useReorderTasks(listId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: string[]) =>
      api.patch(`/lists/${listId}/tasks/reorder`, { orderedIds }),
    onMutate: async (orderedIds: string[]) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', listId] });
      const previous = queryClient.getQueryData<TasksResponse>(['tasks', listId]);

      queryClient.setQueryData<TasksResponse>(['tasks', listId], (old) => {
        if (!old) return old;
        const map = new Map(old.tasks.map((t) => [t.id, t]));
        const reordered = orderedIds
          .map((id, i) => {
            const task = map.get(id);
            return task ? { ...task, sort_order: i } : null;
          })
          .filter(Boolean) as typeof old.tasks;
        return { ...old, tasks: reordered };
      });

      return { previous };
    },
    onError: (_err, _ids, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['tasks', listId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', listId] });
    },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/use-tasks.ts client/src/hooks/use-lists.ts
git commit -m "feat: add optimistic updates for task completion and reordering"
```

---

## Fix 10: Server 端修正

**Files:**
- Modify: `server/src/services/task.service.ts`
- Modify: `server/src/validators/task.ts`
- Create: `server/src/config.ts`
- Modify: `server/src/services/auth.service.ts`
- Modify: `server/src/middleware/auth.ts`
- Modify: `server/tests/tasks-all.test.ts`

- [ ] **Step 1: 修正 weekly recurrence 的 days 欄位支援**

在 `server/src/services/task.service.ts` 中，修改 `getNextDueDate`：

```ts
function getNextDueDate(currentDue: string, recurrence: Recurrence): string {
  const date = new Date(currentDue);

  switch (recurrence.type) {
    case 'daily':
      date.setDate(date.getDate() + recurrence.interval);
      break;
    case 'weekly':
      if (recurrence.days && recurrence.days.length > 0) {
        // 找到下一個符合 days 的日期
        const currentDay = date.getDay(); // 0=Sun
        const sortedDays = [...recurrence.days].sort((a, b) => a - b);

        // 找到當前日之後的下一個 day
        let nextDay = sortedDays.find((d) => d > currentDay);
        if (nextDay !== undefined) {
          // 同一週內的下一個日子
          date.setDate(date.getDate() + (nextDay - currentDay));
        } else {
          // 跳到下一週（或 interval 週後）的第一個 day
          const daysUntilNextWeek = 7 - currentDay + sortedDays[0];
          date.setDate(date.getDate() + daysUntilNextWeek + 7 * (recurrence.interval - 1));
        }
      } else {
        date.setDate(date.getDate() + 7 * recurrence.interval);
      }
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + recurrence.interval);
      break;
  }

  return date.toISOString();
}
```

- [ ] **Step 2: 加強 recurrence 輸入驗證**

在 `server/src/validators/task.ts` 中，將 recurrence 改為結構化驗證：

```ts
const recurrenceSchema = z.object({
  type: z.enum(['daily', 'weekly', 'monthly']),
  interval: z.number().int().min(1).max(365),
  days: z.array(z.number().int().min(0).max(6)).optional(),
}).strict();

// 在 createTaskSchema 和 updateTaskSchema 中：
recurrence: z.union([
  z.string().transform((val, ctx) => {
    try {
      const parsed = JSON.parse(val);
      const result = recurrenceSchema.safeParse(parsed);
      if (!result.success) {
        ctx.addIssue({ code: 'custom', message: 'Invalid recurrence format' });
        return z.NEVER;
      }
      return val; // 保持為 JSON 字串存入 DB
    } catch {
      ctx.addIssue({ code: 'custom', message: 'Invalid JSON' });
      return z.NEVER;
    }
  }),
  z.null(),
]).optional(),
```

- [ ] **Step 3: 抽取 JWT_SECRET 為共用設定**

建立 `server/src/config.ts`：

```ts
import 'dotenv/config';

export const config = {
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
  bcryptRounds: 12,
  port: parseInt(process.env.PORT || '3000', 10),
  dbPath: process.env.DB_PATH || './data/todo.db',
};
```

更新 `server/src/services/auth.service.ts`：
```ts
import { config } from '../config.js';

// 取代:
// const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
// const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
// const BCRYPT_ROUNDS = 12;
// 改為:
const { jwtSecret: JWT_SECRET, jwtRefreshSecret: JWT_REFRESH_SECRET, bcryptRounds: BCRYPT_ROUNDS } = config;
```

更新 `server/src/middleware/auth.ts`：
```ts
import { config } from '../config.js';

// 取代:
// const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
// 改為:
const { jwtSecret: JWT_SECRET } = config;
```

- [ ] **Step 4: 新增 GET /api/tasks/all 測試**

建立 `server/tests/tasks-all.test.ts`：

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createTestUser, generateToken, authRequest } from './helpers.js';

let token: string;

beforeEach(async () => {
  const user = await createTestUser();
  token = generateToken(user.id);
});

describe('GET /api/tasks/all', () => {
  it('should return all tasks across all lists', async () => {
    const list1 = await authRequest('post', '/api/lists', token).send({ name: 'List 1' });
    const list2 = await authRequest('post', '/api/lists', token).send({ name: 'List 2' });

    await authRequest('post', `/api/lists/${list1.body.id}/tasks`, token).send({ title: 'Task A' });
    await authRequest('post', `/api/lists/${list2.body.id}/tasks`, token).send({ title: 'Task B' });

    const res = await authRequest('get', '/api/tasks/all', token);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('should not include subtasks', async () => {
    const list = await authRequest('post', '/api/lists', token).send({ name: 'List' });
    const parent = await authRequest('post', `/api/lists/${list.body.id}/tasks`, token).send({ title: 'Parent' });
    await authRequest('post', `/api/tasks/${parent.body.id}/subtasks`, token).send({ title: 'Child' });

    const res = await authRequest('get', '/api/tasks/all', token);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Parent');
  });

  it('should not return other user tasks', async () => {
    const other = await createTestUser({ email: 'other@example.com' });
    const otherToken = generateToken(other.id);
    const otherList = await authRequest('post', '/api/lists', otherToken).send({ name: 'Other' });
    await authRequest('post', `/api/lists/${otherList.body.id}/tasks`, otherToken).send({ title: 'Not mine' });

    const res = await authRequest('get', '/api/tasks/all', token);

    expect(res.body).toHaveLength(0);
  });
});
```

- [ ] **Step 5: 執行所有後端測試**

Run: `cd server && npx vitest run`
Expected: 全部 PASS

- [ ] **Step 6: Commit**

```bash
git add server/src/config.ts server/src/services/task.service.ts server/src/validators/task.ts server/src/services/auth.service.ts server/src/middleware/auth.ts server/tests/tasks-all.test.ts
git commit -m "fix: strengthen recurrence validation, fix weekly days logic, extract JWT config, add tests"
```

---

## Fix 11: 小問題修正

**Files:**
- Modify: `client/src/context/auth-context.tsx`
- Modify: `client/src/hooks/use-all-tasks.ts`
- Modify: `client/src/components/tasks/TaskDetailSheet.tsx`

- [ ] **Step 1: 登出時清除 TanStack Query 快取**

在 `client/src/context/auth-context.tsx` 中，引入 queryClient：

```tsx
import { queryClient } from '@/lib/query-client';

// 修改 logout：
const logout = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  queryClient.clear();
  setUser(null);
};
```

- [ ] **Step 2: 修正智慧清單「今天」的時區問題**

在 `client/src/hooks/use-all-tasks.ts` 中，修改日期比較邏輯，使用本地日期字串比較而非 ISO UTC：

```ts
export function useSmartListCounts() {
  const { data: tasks = [] } = useAllTasks();

  const incomplete = tasks.filter((t) => !t.completed_at);

  const todayCount = incomplete.filter((t) => {
    if (!t.due_date) return false;
    const dueLocal = new Date(t.due_date).toLocaleDateString();
    const todayLocal = new Date().toLocaleDateString();
    return dueLocal === todayLocal;
  }).length;

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

同樣更新 `SmartListPage.tsx` 中的「今天」篩選邏輯：

```ts
case 'today':
  filtered = incomplete.filter((t) => {
    if (!t.due_date) return false;
    const dueLocal = new Date(t.due_date).toLocaleDateString();
    const todayLocal = new Date().toLocaleDateString();
    return dueLocal === todayLocal;
  });
  break;
```

- [ ] **Step 3: TaskDetailSheet textarea 改用 shadcn Textarea（如果有安裝）**

Run: `cd client && npx shadcn@latest add textarea`

然後在 `TaskDetailSheet.tsx` 中：

```tsx
import { Textarea } from '@/components/ui/textarea';

// 取代原生 <textarea>：
<Textarea
  value={notes}
  onChange={(e) => setNotes(e.target.value)}
  placeholder="新增備註..."
  rows={3}
/>
```

- [ ] **Step 4: Commit**

```bash
git add client/src/context/auth-context.tsx client/src/hooks/use-all-tasks.ts client/src/pages/SmartListPage.tsx client/src/components/tasks/TaskDetailSheet.tsx client/src/components/ui/textarea.tsx
git commit -m "fix: clear query cache on logout, fix timezone in today filter, use shadcn Textarea"
```

---

## Fix 12: 已完成任務分組顯示

**Files:**
- Modify: `client/src/components/tasks/TaskList.tsx`

- [ ] **Step 1: 將已完成任務分組到底部**

在 `TaskList.tsx` 中，把任務分成未完成和已完成兩組：

```tsx
export default function TaskList({ tasks, subtasks, listId, listColor, onTaskClick }: TaskListProps) {
  const reorderTasks = useReorderTasks(listId);

  const incompleteTasks = tasks.filter((t) => !t.completed_at);
  const completedTasks = tasks.filter((t) => t.completed_at);
  const [showCompleted, setShowCompleted] = useState(false);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = incompleteTasks.findIndex((t) => t.id === active.id);
    const newIndex = incompleteTasks.findIndex((t) => t.id === over.id);
    const reordered = [...incompleteTasks];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    reorderTasks.mutate(reordered.map((t) => t.id));
  };

  if (tasks.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">還沒有任務</p>;
  }

  return (
    <div>
      {incompleteTasks.length > 0 && (
        <div className="divide-y rounded-lg border">
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={incompleteTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              {incompleteTasks.map((task) => (
                <SortableTask
                  key={task.id}
                  task={task}
                  taskSubtasks={subtasks[task.id] || []}
                  listId={listId}
                  listColor={listColor}
                  onTaskClick={onTaskClick}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      {completedTasks.length > 0 && (
        <div className="mt-4">
          <button
            className="flex items-center gap-1 text-sm text-muted-foreground mb-2"
            onClick={() => setShowCompleted(!showCompleted)}
          >
            {showCompleted ? '▼' : '▶'} 已完成（{completedTasks.length}）
          </button>
          {showCompleted && (
            <div className="divide-y rounded-lg border">
              {completedTasks.map((task) => (
                <SortableTask
                  key={task.id}
                  task={task}
                  taskSubtasks={subtasks[task.id] || []}
                  listId={listId}
                  listColor={listColor}
                  onTaskClick={onTaskClick}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

需要在頂部加入 `import { useState } from 'react';`。

- [ ] **Step 2: Commit**

```bash
git add client/src/components/tasks/TaskList.tsx
git commit -m "feat: group completed tasks at bottom with collapsible section"
```

---

## Fix 13: 最終驗證

- [ ] **Step 1: 執行所有後端測試**

Run: `cd server && npx vitest run`
Expected: 全部 PASS

- [ ] **Step 2: TypeScript 編譯檢查**

Run: `cd client && npx tsc --noEmit`
Expected: 無錯誤

- [ ] **Step 3: 前端 build**

Run: `cd client && npm run build`
Expected: 成功

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: all fixes verified"
```
