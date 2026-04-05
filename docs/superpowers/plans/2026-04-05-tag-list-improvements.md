# 標籤清單功能改善計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修復 code review 發現的 3 個問題：快取失效遺漏、載入狀態 race condition、onToggleComplete 語意錯誤。

**Branch:** 在 `feat/tag-list-homepage` 分支上繼續開發。

---

## Task 1: 修復快取失效 — useCompleteTask 和 useUncompleteTask

**嚴重度：** Critical
**問題：** 使用者完成/取消完成任務後，主頁標籤的任務數不會即時更新。
**Files:**
- Modify: `client/src/hooks/use-tasks.ts`

- [ ] **Step 1: 在 useCompleteTask 的 onSettled 中加入標籤快取失效**

在 `client/src/hooks/use-tasks.ts` 的 `useCompleteTask` 函數中，找到 `onSettled`（約第 138 行）：

```ts
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', listId] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'all'] });
    },
```

改為：

```ts
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', listId] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['tags-with-counts'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-by-tag'] });
    },
```

- [ ] **Step 2: 在 useUncompleteTask 的 onSettled 中加入相同的失效**

找到 `useUncompleteTask` 的 `onSettled`（約第 180 行）：

```ts
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', listId] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'all'] });
    },
```

改為：

```ts
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', listId] });
      queryClient.invalidateQueries({ queryKey: ['lists'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'all'] });
      queryClient.invalidateQueries({ queryKey: ['tags-with-counts'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-by-tag'] });
    },
```

注意：`['tasks-by-tag']` 不帶 tagId 參數，這會失效所有 `tasks-by-tag` 開頭的 query，因為完成任務時我們不知道該任務關聯了哪些 tag。

- [ ] **Step 3: Commit**

```bash
git add client/src/hooks/use-tasks.ts
git commit -m "fix: add tags cache invalidation to complete/uncomplete task mutations"
```

---

## Task 2: 修復 TagDetailPage 載入狀態 race condition

**嚴重度：** Warning
**問題：** `useTagsWithCounts` 還在載入時，頁面會閃現「標籤不存在」錯誤訊息。
**Files:**
- Modify: `client/src/pages/TagDetailPage.tsx`

- [ ] **Step 1: 將 useTagsWithCounts 的 isLoading 納入判斷**

在 `client/src/pages/TagDetailPage.tsx` 中，找到（約第 10-16 行）：

```tsx
  const { data: tags = [] } = useTagsWithCounts();
  const { data: tasks = [], isLoading } = useTasksByTag(tagId!);
  const [showCompleted, setShowCompleted] = useState(false);

  const tag = tags.find((entry) => entry.id === tagId);

  if (!tag && !isLoading) {
    return <div className="p-8 text-center text-muted-foreground">標籤不存在</div>;
  }
```

改為：

```tsx
  const { data: tags = [], isLoading: isTagsLoading } = useTagsWithCounts();
  const { data: tasks = [], isLoading: isTasksLoading } = useTasksByTag(tagId!);
  const [showCompleted, setShowCompleted] = useState(false);

  const isLoading = isTagsLoading || isTasksLoading;
  const tag = tags.find((entry) => entry.id === tagId);

  if (!tag && !isLoading) {
    return <div className="p-8 text-center text-muted-foreground">標籤不存在</div>;
  }
```

注意：下方原本引用 `isLoading` 的載入中判斷（約第 33 行）不需要改動，因為新的 `isLoading` 變數已包含兩個 query 的狀態。

- [ ] **Step 2: Commit**

```bash
git add client/src/pages/TagDetailPage.tsx
git commit -m "fix: include tags loading state to prevent false 'not found' flash"
```

---

## Task 3: 修復 TagDetailPage onToggleComplete 語意

**嚴重度：** Warning
**問題：** 點擊任務的勾選框（checkbox）會導航到清單頁而非切換完成狀態，違反使用者預期。
**Files:**
- Modify: `client/src/pages/TagDetailPage.tsx`

- [ ] **Step 1: 將 onToggleComplete 改為導航，並加上視覺提示**

由於 TagDetailPage 是跨清單的聚合頁面，直接在此頁切換完成狀態需要知道 `listId`（每個任務的 listId 不同），而現有的 `useCompleteTask`/`useUncompleteTask` hooks 是綁定單一 listId 的。

最簡單且一致的做法：讓 `onToggleComplete` 和 `onClick` 都導航到清單詳情頁，這與規格「點擊任務導航到清單詳情頁」一致。但需要讓 checkbox 的視覺樣式表明這不是一個可切換的控制項。

在 `client/src/pages/TagDetailPage.tsx` 中，找到未完成任務的 TaskItem（約第 42-47 行）：

```tsx
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
```

改為（兩處 TaskItem 都要改，未完成和已完成各一處）：

```tsx
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
                  hideCheckbox
                />
```

- [ ] **Step 2: 在 TaskItem 加入 hideCheckbox prop**

在 `client/src/components/tasks/TaskItem.tsx` 中，找到 `TaskItemProps` 介面，加入新的可選 prop：

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
  hideCheckbox?: boolean;
}
```

在元件的參數解構中加入 `hideCheckbox`：

```ts
export default function TaskItem({ id, title, completed, priority, dueDate, flagged, color, tags, onToggleComplete, onClick, hideCheckbox }: TaskItemProps) {
```

找到 checkbox 按鈕的 JSX（應該是一個帶有 `onClick` 呼叫 `onToggleComplete` 的 button），用條件渲染包裹：

```tsx
{!hideCheckbox && (
  <button ... onClick={(event) => { event.stopPropagation(); onToggleComplete(id); }}>
    ...
  </button>
)}
```

如果 hideCheckbox 為 true，checkbox 按鈕不渲染，整行只剩 onClick 導航行為，語意清晰。

- [ ] **Step 3: 驗證 TypeScript 編譯**

Run: `cd client && npx tsc --noEmit`
Expected: 無錯誤

- [ ] **Step 4: Commit**

```bash
git add client/src/components/tasks/TaskItem.tsx client/src/pages/TagDetailPage.tsx
git commit -m "fix: hide checkbox in TagDetailPage to avoid misleading toggle behavior"
```

---

## Task 4: 最終驗證

- [ ] **Step 1: 執行所有後端測試**

Run: `cd server && npx vitest run`
Expected: 全部 PASS

- [ ] **Step 2: TypeScript 編譯檢查**

Run: `cd client && npx tsc --noEmit`
Expected: 無錯誤

- [ ] **Step 3: 前端 build**

Run: `cd client && npm run build`
Expected: 成功

- [ ] **Step 4: Commit（如有未提交的修正）**

```bash
git add -A
git commit -m "chore: tag list improvements verified"
```
