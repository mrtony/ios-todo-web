import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useCreateTask } from '@/hooks/use-tasks';

interface AddTaskButtonProps {
  listId: string;
}

export default function AddTaskButton({ listId }: AddTaskButtonProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const createTask = useCreateTask(listId);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }

    createTask.mutate(
      { title: title.trim() },
      {
        onSuccess: () => {
          setTitle('');
        },
      },
    );
  };

  const handleBlur = () => {
    if (!title.trim()) {
      setIsAdding(false);
    }
  };

  if (!isAdding) {
    return (
      <button
        className="flex w-full items-center gap-2 rounded-lg px-3 py-3 text-sm text-primary transition-colors hover:bg-accent"
        onClick={() => setIsAdding(true)}
      >
        <Plus className="h-4 w-4" />
        新增任務
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="px-3 py-2">
      <Input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onBlur={handleBlur}
        placeholder="新增任務..."
        autoFocus
      />
    </form>
  );
}
