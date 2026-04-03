import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useCreateSubtask, useDeleteTask, useUpdateTask } from '@/hooks/use-tasks';
import { useTaskTags } from '@/hooks/use-tags';
import TagSelector from './TagSelector';

interface Task {
  id: string;
  title: string;
  notes: string;
  completed_at: string | null;
  priority: number;
  due_date: string | null;
  flagged: number;
  parent_id: string | null;
  recurrence: string | null;
}

interface TaskTag {
  id: string;
  name: string;
  color: string;
}

interface TaskDetailSheetProps {
  taskId: string;
  listId: string;
  task: Task;
  subtasks: Task[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TaskDetailSheet({
  taskId,
  listId,
  task,
  subtasks,
  open,
  onOpenChange,
}: TaskDetailSheetProps) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes || '');
  const [dueDate, setDueDate] = useState(task.due_date ? task.due_date.slice(0, 16) : '');
  const [priority, setPriority] = useState(task.priority);
  const [flagged, setFlagged] = useState(task.flagged === 1);
  const [recurrence, setRecurrence] = useState(task.recurrence || '');
  const [newSubtask, setNewSubtask] = useState('');
  const [error, setError] = useState('');

  const updateTask = useUpdateTask(listId);
  const deleteTask = useDeleteTask(listId);
  const createSubtask = useCreateSubtask(taskId, listId);
  const { data: taskTags = [] } = useTaskTags(taskId);

  useEffect(() => {
    setTitle(task.title);
    setNotes(task.notes || '');
    setDueDate(task.due_date ? task.due_date.slice(0, 16) : '');
    setPriority(task.priority);
    setFlagged(task.flagged === 1);
    setRecurrence(task.recurrence || '');
  }, [task]);

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
        recurrence: recurrence || null,
      },
      {
        onSuccess: () => onOpenChange(false),
        onError: (err: any) => {
          setError(err.response?.data?.error?.message || '儲存失敗');
        },
      },
    );
  };

  const handleDelete = () => {
    setError('');
    deleteTask.mutate(taskId, {
      onSuccess: () => onOpenChange(false),
      onError: (err: any) => {
        setError(err.response?.data?.error?.message || '刪除失敗');
      },
    });
  };

  const handleAddSubtask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newSubtask.trim()) {
      return;
    }

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
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>備註</Label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="新增備註..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>到期日</Label>
            <Input
              type="datetime-local"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
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
              ].map((priorityOption) => (
                <Button
                  key={priorityOption.value}
                  type="button"
                  variant={priority === priorityOption.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPriority(priorityOption.value)}
                >
                  {priorityOption.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="flagged"
              checked={flagged}
              onChange={(event) => setFlagged(event.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="flagged">標記</Label>
          </div>

          <div className="space-y-2">
            <Label>重複</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              value={recurrence}
              onChange={(event) => setRecurrence(event.target.value)}
            >
              <option value="">不重複</option>
              <option value='{"type":"daily","interval":1}'>每天</option>
              <option value='{"type":"weekly","interval":1}'>每週</option>
              <option value='{"type":"monthly","interval":1}'>每月</option>
            </select>
          </div>

          <Separator />
          <div className="space-y-2">
            <Label>標籤</Label>
            <TagSelector taskId={taskId} assignedTags={taskTags as TaskTag[]} />
          </div>

          {!task.parent_id && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>子任務 ({subtasks.length})</Label>
                {subtasks.map((subtask) => (
                  <div key={subtask.id} className="pl-2 text-sm text-muted-foreground">
                    • {subtask.title}
                  </div>
                ))}
                <form onSubmit={handleAddSubtask} className="flex gap-2">
                  <Input
                    value={newSubtask}
                    onChange={(event) => setNewSubtask(event.target.value)}
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
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} className="flex-1" disabled={updateTask.isPending}>
              {updateTask.isPending ? '儲存中...' : '儲存'}
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
