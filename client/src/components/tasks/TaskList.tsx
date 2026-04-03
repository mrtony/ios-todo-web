import { useState } from 'react';
import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useCompleteTask, useReorderTasks, useUncompleteTask } from '@/hooks/use-tasks';
import SubtaskItem from './SubtaskItem';
import TaskItem from './TaskItem';

interface Task {
  id: string;
  title: string;
  completed_at: string | null;
  priority: number;
  due_date: string | null;
  flagged: number;
  tags?: { name: string; color: string }[];
}

interface TaskListProps {
  tasks: Task[];
  subtasks: Record<string, Task[]>;
  listId: string;
  listColor: string;
  onTaskClick: (taskId: string) => void;
}

function SortableTask({
  task,
  taskSubtasks,
  listId,
  listColor,
  onTaskClick,
}: {
  task: Task;
  taskSubtasks: Task[];
  listId: string;
  listColor: string;
  onTaskClick: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
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
    <div ref={setNodeRef} style={style}>
      <div className="flex items-center">
        <button {...attributes} {...listeners} className="cursor-grab px-1 text-muted-foreground">
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <TaskItem
            id={task.id}
            title={task.title}
            completed={task.completed_at !== null}
            priority={task.priority}
            dueDate={task.due_date}
            flagged={task.flagged === 1}
            color={listColor}
            tags={task.tags}
            onToggleComplete={(id) => handleToggle(id, task.completed_at !== null)}
            onClick={onTaskClick}
          />
        </div>
      </div>
      {taskSubtasks.map((subtask) => (
        <SubtaskItem
          key={subtask.id}
          id={subtask.id}
          title={subtask.title}
          completed={subtask.completed_at !== null}
          color={listColor}
          onToggleComplete={(id) => handleToggle(id, subtask.completed_at !== null)}
        />
      ))}
    </div>
  );
}

export default function TaskList({ tasks, subtasks, listId, listColor, onTaskClick }: TaskListProps) {
  const reorderTasks = useReorderTasks(listId);
  const [showCompleted, setShowCompleted] = useState(false);
  const incompleteTasks = tasks.filter((task) => !task.completed_at);
  const completedTasks = tasks.filter((task) => task.completed_at);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = incompleteTasks.findIndex((task) => task.id === active.id);
    const newIndex = incompleteTasks.findIndex((task) => task.id === over.id);
    const reordered = [...incompleteTasks];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    reorderTasks.mutate(reordered.map((task) => task.id));
  };

  if (tasks.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">還沒有任務</p>;
  }

  return (
    <div>
      {incompleteTasks.length > 0 && (
        <div className="divide-y rounded-lg border">
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={incompleteTasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
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
            className="mb-2 flex items-center gap-1 text-sm text-muted-foreground"
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
