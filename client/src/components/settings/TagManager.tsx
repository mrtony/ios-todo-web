import { useState, type FormEvent } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCreateTag, useDeleteTag, useTags, useUpdateTag } from '@/hooks/use-tags';

export default function TagManager() {
  const { data: tags = [] } = useTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newName.trim()) {
      return;
    }
    createTag.mutate({ name: newName.trim() });
    setNewName('');
  };

  const handleUpdate = (id: string) => {
    if (!editName.trim()) {
      return;
    }
    updateTag.mutate({ id, name: editName.trim() });
    setEditingId(null);
  };

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 font-medium">標籤管理</h3>
      <div className="mb-3 space-y-2">
        {tags.map((tag) => (
          <div key={tag.id} className="flex items-center gap-2">
            <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
            {editingId === tag.id ? (
              <Input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                onBlur={() => handleUpdate(tag.id)}
                onKeyDown={(event) => event.key === 'Enter' && handleUpdate(tag.id)}
                className="h-7 flex-1 text-sm"
                autoFocus
              />
            ) : (
              <span className="flex-1 text-sm">{tag.name}</span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setEditingId(tag.id);
                setEditName(tag.name);
              }}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
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
          onChange={(event) => setNewName(event.target.value)}
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
