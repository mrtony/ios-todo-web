import { useCompleteTask, useSubtasks, useUncompleteTask } from '@/hooks/use-tasks';
import SubtaskItem from './SubtaskItem';
import TaskItem from './TaskItem';

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

function TaskWithSubtasks({
  task,
  listId,
  listColor,
  onTaskClick,
}: {
  task: Task;
  listId: string;
  listColor: string;
  onTaskClick: (id: string) => void;
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
      {subtasks.map((subtask) => (
        <SubtaskItem
          key={subtask.id}
          id={subtask.id}
          title={subtask.title}
          completed={subtask.completed_at !== null}
          color={listColor}
          onToggleComplete={(id) => handleToggle(id, subtask.completed_at !== null)}
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
