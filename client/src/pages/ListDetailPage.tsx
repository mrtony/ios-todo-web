import { useState } from 'react';
import { ArrowLeft, MoreHorizontal, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import AddTaskButton from '@/components/tasks/AddTaskButton';
import TaskDetailSheet from '@/components/tasks/TaskDetailSheet';
import TaskList from '@/components/tasks/TaskList';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useDeleteList, useLists } from '@/hooks/use-lists';
import { useTasks } from '@/hooks/use-tasks';

export default function ListDetailPage() {
  const { id: listId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: lists = [] } = useLists();
  const { data: tasks = [], isLoading } = useTasks(listId!);
  const deleteList = useDeleteList();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const list = lists.find((entry) => entry.id === listId);

  if (!list && !isLoading) {
    return <div className="p-8 text-center text-muted-foreground">清單不存在</div>;
  }

  const handleDeleteList = () => {
    if (!listId) {
      return;
    }

    deleteList.mutate(listId, {
      onSuccess: () => navigate('/'),
    });
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="flex-1 text-xl font-bold" style={{ color: list?.color }}>
          {list?.name}
        </h2>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
            <MoreHorizontal className="h-5 w-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-destructive" onClick={handleDeleteList}>
              <Trash2 className="mr-2 h-4 w-4" />
              刪除清單
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8 text-muted-foreground">載入中...</div>
      ) : (
        <>
          <TaskList
            tasks={tasks}
            listId={listId!}
            listColor={list?.color || '#3b82f6'}
            onTaskClick={setSelectedTaskId}
          />
          <AddTaskButton listId={listId!} />
        </>
      )}

      {selectedTaskId && (
        <TaskDetailSheet
          taskId={selectedTaskId}
          listId={listId!}
          task={tasks.find((task) => task.id === selectedTaskId)!}
          open={!!selectedTaskId}
          onOpenChange={(open) => !open && setSelectedTaskId(null)}
        />
      )}
    </div>
  );
}
