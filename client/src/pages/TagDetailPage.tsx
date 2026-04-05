import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import TaskItem from '@/components/tasks/TaskItem';
import { Button } from '@/components/ui/button';
import { useTagsWithCounts, useTasksByTag } from '@/hooks/use-tags';

export default function TagDetailPage() {
  const { id: tagId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: tags = [], isLoading: isTagsLoading } = useTagsWithCounts();
  const { data: tasks = [], isLoading: isTasksLoading } = useTasksByTag(tagId!);
  const [showCompleted, setShowCompleted] = useState(false);

  const isLoading = isTagsLoading || isTasksLoading;
  const tag = tags.find((entry) => entry.id === tagId);

  if (!tag && !isLoading) {
    return <div className="p-8 text-center text-muted-foreground">標籤不存在</div>;
  }

  const incompleteTasks = tasks.filter((task) => !task.completed_at);
  const completedTasks = tasks.filter((task) => task.completed_at);

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
                  hideCheckbox
                />
              ))}
            </div>
          )}

          {completedTasks.length > 0 && (
            <div className="mt-4">
              <button
                className="mb-2 flex items-center gap-1 text-sm text-muted-foreground"
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
                      hideCheckbox
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
