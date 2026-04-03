import { useState, type FormEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAddTagToTask, useCreateTag, useRemoveTagFromTask, useTags } from '@/hooks/use-tags';

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

  const assignedIds = new Set(assignedTags.map((tag) => tag.id));
  const availableTags = allTags.filter((tag) => !assignedIds.has(tag.id));

  const handleAddTag = (tagId: string) => {
    addTag.mutate({ taskId, tagId });
  };

  const handleRemoveTag = (tagId: string) => {
    removeTag.mutate({ taskId, tagId });
  };

  const handleCreateAndAdd = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newTagName.trim()) {
      return;
    }

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
          <Badge
            key={tag.id}
            variant="secondary"
            style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
          >
            {tag.name}
            <button
              className="ml-1"
              onClick={() => handleRemoveTag(tag.id)}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<Button variant="outline" size="sm" />}>
          <Plus className="mr-1 h-3 w-3" /> 新增標籤
        </PopoverTrigger>
        <PopoverContent className="w-60 p-2">
          {availableTags.length > 0 && (
            <div className="mb-2 max-h-32 overflow-y-auto">
              {availableTags.map((tag) => (
                <button
                  key={tag.id}
                  className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent"
                  onClick={() => {
                    handleAddTag(tag.id);
                    setOpen(false);
                  }}
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
              onChange={(event) => setNewTagName(event.target.value)}
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
