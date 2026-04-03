import { DndContext, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useReorderLists } from '@/hooks/use-lists';
import ListItem from './ListItem';

interface List {
  id: string;
  name: string;
  color: string;
}

interface ListGroupProps {
  lists: List[];
  taskCounts: Record<string, number>;
}

function SortableListItem({ list, taskCount }: { list: List; taskCount: number }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: list.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center">
      <button {...attributes} {...listeners} className="cursor-grab px-1 text-muted-foreground">
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1">
        <ListItem id={list.id} name={list.name} color={list.color} taskCount={taskCount} />
      </div>
    </div>
  );
}

export default function ListGroup({ lists, taskCounts }: ListGroupProps) {
  const reorderLists = useReorderLists();

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = lists.findIndex((list) => list.id === active.id);
    const newIndex = lists.findIndex((list) => list.id === over.id);
    const reordered = [...lists];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    reorderLists.mutate(reordered.map((list) => list.id));
  };

  return (
    <div>
      <h2 className="mb-2 text-lg font-semibold">我的清單</h2>
      <div className="divide-y rounded-lg border">
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={lists.map((list) => list.id)} strategy={verticalListSortingStrategy}>
            {lists.map((list) => (
              <SortableListItem key={list.id} list={list} taskCount={taskCounts[list.id] || 0} />
            ))}
          </SortableContext>
        </DndContext>
        {lists.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground">
            還沒有清單，點擊下方按鈕新增
          </p>
        )}
      </div>
    </div>
  );
}
